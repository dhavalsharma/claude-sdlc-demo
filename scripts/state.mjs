#!/usr/bin/env node
// Pipeline state for one SDLC run. Lives in <project>/.sdlc/.
//   state.json    – current snapshot (phase statuses, artifacts, links)
//   events.jsonl  – append-only timeline streamed by the dashboard
//
// Usage: node state.mjs <command> [...args]   (run with cwd = project dir)
//   init --idea "<text>" --name <slug> [--mode local|github]
//   show | status
//   next [--rerun]            → prints {action: run|blocked|complete, ...}
//   finish <phase>            → agent done; evaluate the exit gate
//   approve [note] | reject <reason>
//   rewind <phase> <reason>   → send the pipeline back (e.g. scope change)
//   set <path> <json>  |  push <path> <json>   (use - to read JSON from stdin)
//   event <role> <message> [--type t] [--link url]
//   artifact <key> <value> [--role r] [--label text]

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PHASES, ROLES, phaseIndex } from './phases.mjs';

export const sdlcDir = (dir = process.cwd()) => path.join(dir, '.sdlc');
const statePath = (dir) => path.join(sdlcDir(dir), 'state.json');
const eventsPath = (dir) => path.join(sdlcDir(dir), 'events.jsonl');
const now = () => new Date().toISOString();

export function hasState(dir = process.cwd()) {
  return fs.existsSync(statePath(dir));
}

export function load(dir = process.cwd()) {
  if (!hasState(dir)) throw new Error('No SDLC run here. Start one with /sdlc:start "<idea>".');
  return JSON.parse(fs.readFileSync(statePath(dir), 'utf8'));
}

export function save(state, dir = process.cwd()) {
  state.updatedAt = now();
  const tmp = statePath(dir) + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(state, null, 2));
  fs.renameSync(tmp, statePath(dir));
}

export function logEvent(evt, dir = process.cwd()) {
  const line = { ts: now(), type: 'info', ...evt };
  fs.appendFileSync(eventsPath(dir), JSON.stringify(line) + '\n');
  return line;
}

function setPath(obj, dotted, value) {
  const keys = dotted.split('.');
  let cur = obj;
  for (const k of keys.slice(0, -1)) cur = cur[k] ??= {};
  cur[keys.at(-1)] = value;
}

function getPath(obj, dotted) {
  return dotted.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);
}

function parseValue(raw) {
  if (raw === '-') raw = fs.readFileSync(0, 'utf8'); // read JSON from stdin (heredoc-friendly)
  try { return JSON.parse(raw); } catch { return typeof raw === 'string' ? raw.trim() : raw; }
}

function parseFlags(args) {
  const flags = {}, rest = [];
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith('--')) {
      const key = args[i].slice(2);
      const val = args[i + 1] && !args[i + 1].startsWith('--') ? args[++i] : true;
      flags[key] = val;
    } else rest.push(args[i]);
  }
  return { flags, rest };
}

export function init({ idea, name, mode = 'local' }, dir = process.cwd()) {
  fs.mkdirSync(sdlcDir(dir), { recursive: true });
  const state = {
    version: 1,
    idea, name, mode,
    createdAt: now(),
    current: 0,
    phases: Object.fromEntries(PHASES.map((p) => [p.id, { status: 'pending' }])),
    artifacts: {},
    stories: [],
    github: {},
    vercel: {},
    reviewer: {},
    chaos: [],
  };
  save(state, dir);
  fs.writeFileSync(eventsPath(dir), '');
  logEvent({ role: 'system', type: 'start', msg: `New project "${name}": ${idea}` }, dir);
  return state;
}

function markPhase(state, id, status, extra = {}, dir) {
  const ph = state.phases[id];
  Object.assign(ph, { status, ...extra });
  if (status === 'working') ph.startedAt ??= now();
  if (status === 'done') ph.endedAt = now();
  const p = PHASES[phaseIndex(id)];
  logEvent({ role: p.role, type: 'phase', phase: id, status, msg: `${p.title}: ${status}${extra.reason ? ` — ${extra.reason}` : ''}` }, dir);
}

export async function next({ rerun = false } = {}, dir = process.cwd()) {
  const { checkGate } = await import('./gate.mjs');
  const state = load(dir);
  if (state.current >= PHASES.length) return { action: 'complete' };

  let phase = PHASES[state.current];
  const st = state.phases[phase.id].status;

  if (st === 'pending' || rerun) {
    markPhase(state, phase.id, 'working', {}, dir);
    save(state, dir);
    return runAction(state, phase, rerun);
  }

  const gate = await checkGate(state, phase, dir);
  if (!gate.pass) {
    const status = phase.gate.kind === 'human' && gate.needsApproval ? 'awaiting' : 'blocked';
    markPhase(state, phase.id, status, { reason: gate.reason }, dir);
    logEvent({ role: 'system', type: 'gate', phase: phase.id, pass: false, msg: `Gate "${phase.gate.label}" not passed: ${gate.reason}` }, dir);
    save(state, dir);
    return { action: 'blocked', phase: phase.id, gate: phase.gate.label, reason: gate.reason, needsApproval: !!gate.needsApproval };
  }

  logEvent({ role: 'system', type: 'gate', phase: phase.id, pass: true, msg: `Gate passed: ${phase.gate.label}` }, dir);
  markPhase(state, phase.id, 'done', { reason: undefined }, dir);
  state.current += 1;
  if (state.current >= PHASES.length) {
    save(state, dir);
    logEvent({ role: 'system', type: 'complete', msg: 'All phases complete. Shipped! 🎉' }, dir);
    return { action: 'complete' };
  }
  phase = PHASES[state.current];
  markPhase(state, phase.id, 'working', {}, dir);
  save(state, dir);
  return runAction(state, phase);
}

function runAction(state, phase, rerun = false) {
  const role = ROLES[phase.role];
  return {
    action: 'run',
    phase: phase.id,
    number: phaseIndex(phase.id),
    title: phase.title,
    role: phase.role,
    roleName: `${role.emoji} ${role.name}`,
    agent: `sdlc:${role.agent}`,
    industry: phase.industry,
    gate: phase.gate,
    feedback: state.phases[phase.id].rejection?.reason ?? null,
    rerun,
  };
}

export async function finish(id, dir = process.cwd()) {
  const { checkGate } = await import('./gate.mjs');
  const state = load(dir);
  const phase = PHASES[phaseIndex(id)];
  if (!phase) throw new Error(`Unknown phase ${id}`);
  const gate = await checkGate(state, phase, dir);
  const status = gate.pass ? 'awaiting' : gate.needsApproval ? 'awaiting' : 'blocked';
  markPhase(state, id, status, { reason: gate.pass ? undefined : gate.reason }, dir);
  logEvent({ role: 'system', type: 'gate', phase: id, pass: gate.pass, msg: gate.pass ? `Gate ready: ${phase.gate.label} ✓ — run /sdlc:next` : `Gate "${phase.gate.label}": ${gate.reason}` }, dir);
  save(state, dir);
  return { phase: id, gate: phase.gate.label, kind: phase.gate.kind, ...gate };
}

export function approve(note = '', dir = process.cwd()) {
  const state = load(dir);
  const phase = PHASES[state.current];
  if (!phase || phase.gate.kind !== 'human') {
    throw new Error(`Current phase (${phase?.title ?? 'none'}) has no human approval gate.`);
  }
  state.phases[phase.id].approval = { at: now(), note };
  delete state.phases[phase.id].rejection;
  logEvent({ role: 'human', type: 'approval', phase: phase.id, msg: `Approved ${phase.title}${note ? `: ${note}` : ''}` }, dir);
  save(state, dir);
  return { approved: phase.id };
}

export function reject(reason, dir = process.cwd()) {
  const state = load(dir);
  const phase = PHASES[state.current];
  if (!phase || phase.gate.kind !== 'human') {
    throw new Error(`Current phase (${phase?.title ?? 'none'}) has no human approval gate.`);
  }
  state.phases[phase.id].rejection = { at: now(), reason };
  delete state.phases[phase.id].approval;
  state.phases[phase.id].status = 'pending'; // next /sdlc:next reruns the role with the feedback
  logEvent({ role: 'human', type: 'rejection', phase: phase.id, msg: `Changes requested on ${phase.title}: ${reason}` }, dir);
  save(state, dir);
  return { rejected: phase.id, reason };
}

export function rewind(id, reason, dir = process.cwd()) {
  const state = load(dir);
  const idx = phaseIndex(id);
  if (idx < 0) throw new Error(`Unknown phase ${id}`);
  for (const p of PHASES.slice(idx)) {
    const ph = state.phases[p.id];
    state.phases[p.id] = { status: 'pending', history: [...(ph.history ?? []), { ...ph, rewoundAt: now() }] };
  }
  state.current = idx;
  if (idx <= phaseIndex('review')) state.reviewer = {};
  logEvent({ role: 'system', type: 'rewind', phase: id, msg: `Pipeline sent back to ${PHASES[idx].title}: ${reason}` }, dir);
  save(state, dir);
  return { current: id };
}

export function statusText(state) {
  const icon = { pending: '·', working: '▶', awaiting: '⏳', blocked: '⛔', done: '✅' };
  const lines = [`Project: ${state.name}  (${state.mode} mode)`, `Idea:    ${state.idea}`, ''];
  PHASES.forEach((p, i) => {
    const ph = state.phases[p.id];
    const marker = i === state.current ? '→' : ' ';
    const extra = ph.reason ? `  — ${ph.reason}` : ph.approval ? '  (approved)' : '';
    lines.push(`${marker} ${icon[ph.status] ?? '?'} ${String(i).padStart(1)}. ${p.title.padEnd(13)} ${ROLES[p.role].emoji} ${ROLES[p.role].name.padEnd(16)} gate: ${p.gate.label}${extra}`);
  });
  const active = state.chaos.filter((c) => c.status === 'active');
  if (active.length) lines.push('', `🔥 Active chaos: ${active.map((c) => c.type).join(', ')}`);
  const links = Object.entries(state.artifacts);
  if (links.length) {
    lines.push('', 'Artifacts:');
    for (const [k, v] of links) lines.push(`  ${k.padEnd(12)} ${typeof v === 'object' ? v.value : v}`);
  }
  return lines.join('\n');
}

// ---------- CLI ----------
async function main(argv) {
  const [cmd, ...args] = argv;
  const { flags, rest } = parseFlags(args);
  const out = (v) => console.log(typeof v === 'string' ? v : JSON.stringify(v, null, 2));

  switch (cmd) {
    case 'init':
      if (!flags.idea || !flags.name) throw new Error('init needs --idea and --name');
      return out(init({ idea: flags.idea, name: flags.name, mode: flags.mode ?? 'local' }));
    case 'show':
      return out(rest[0] ? getPath(load(), rest[0]) : load());
    case 'status':
      return out(statusText(load()));
    case 'next':
      return out(await next({ rerun: !!flags.rerun }));
    case 'finish':
      return out(await finish(rest[0]));
    case 'approve':
      return out(approve(rest.join(' ')));
    case 'reject':
      return out(reject(rest.join(' ') || 'no reason given'));
    case 'rewind':
      return out(rewind(rest[0], rest.slice(1).join(' ')));
    case 'set': {
      const s = load(); setPath(s, rest[0], parseValue(rest[1])); save(s); return out('ok');
    }
    case 'push': {
      const s = load(); const arr = getPath(s, rest[0]) ?? []; arr.push(parseValue(rest[1]));
      setPath(s, rest[0], arr); save(s); return out('ok');
    }
    case 'event': {
      const [role, ...msg] = rest;
      if (!ROLES[role]) throw new Error(`Unknown role "${role}". Use one of: ${Object.keys(ROLES).join(', ')}`);
      const s = load();
      return out(logEvent({ role, type: flags.type ?? 'info', phase: PHASES[s.current]?.id, msg: msg.join(' '), link: flags.link }));
    }
    case 'artifact': {
      const [key, value] = rest;
      const s = load();
      s.artifacts[key] = value; save(s);
      const role = flags.role ?? PHASES[s.current]?.role ?? 'system';
      return out(logEvent({ role, type: 'artifact', phase: PHASES[s.current]?.id, key, msg: `${flags.label ?? key} created`, link: value }));
    }
    default:
      throw new Error(`Unknown command "${cmd}". See header of state.mjs for usage.`);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2)).catch((e) => { console.error(`sdlc: ${e.message}`); process.exit(1); });
}
