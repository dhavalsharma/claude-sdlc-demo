#!/usr/bin/env node
// Exit-gate checks for each phase. A gate verifies real things (files, git,
// CI status, HTTP health) rather than trusting what an agent says it did.
//
// Usage: node gate.mjs [phaseId]   (defaults to the current phase)
//   exit 0 → gate passes, exit 1 → blocked (reason printed)

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { PHASES, phaseIndex } from './phases.mjs';

const ok = () => ({ pass: true });
const fail = (reason, extra = {}) => ({ pass: false, reason, ...extra });

function run(cmd, args, dir, timeout = 120_000) {
  try {
    const stdout = execFileSync(cmd, args, { cwd: dir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout });
    return { ok: true, stdout };
  } catch (e) {
    return { ok: false, stdout: e.stdout ?? '', stderr: e.stderr ?? e.message };
  }
}

const exists = (dir, p) => fs.existsSync(path.join(dir, p));

async function httpOk(url) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(10_000), redirect: 'follow' });
    return { ok: res.ok, status: res.status };
  } catch (e) {
    return { ok: false, status: e.name === 'TimeoutError' ? 'timeout' : e.cause?.code ?? e.message };
  }
}

function humanApproval(state, id) {
  const ph = state.phases[id];
  if (ph.approval) return ok();
  return fail('waiting for your approval — review it, then /sdlc:approve (or /sdlc:reject "<feedback>")', { needsApproval: true });
}

const CHECKS = {
  idea(state, dir) {
    if (!state.artifacts.epic) return fail('Epic not recorded (artifacts.epic missing)');
    return ok();
  },

  requirements(state, dir) {
    if (!exists(dir, 'docs/PRD.md')) return fail('docs/PRD.md not written yet');
    if (!state.stories.length) return fail('no user stories recorded');
    const noAc = state.stories.filter((s) => !s.acceptance?.length);
    if (noAc.length) return fail(`stories missing acceptance criteria: ${noAc.map((s) => s.id).join(', ')}`);
    return humanApproval(state, 'requirements');
  },

  design(state, dir) {
    const adrDir = path.join(dir, 'docs/adr');
    const adrs = fs.existsSync(adrDir) ? fs.readdirSync(adrDir).filter((f) => f.endsWith('.md')) : [];
    if (!adrs.length) return fail('no Architecture Decision Record in docs/adr/');
    if (!exists(dir, 'docs/architecture.md')) return fail('docs/architecture.md (diagram) missing');
    return humanApproval(state, 'design');
  },

  planning(state) {
    const unestimated = state.stories.filter((s) => typeof s.estimate !== 'number');
    if (unestimated.length) return fail(`stories without an estimate: ${unestimated.map((s) => s.id).join(', ')}`);
    if (state.mode === 'github' && !state.github.milestone) return fail('GitHub milestone not created');
    return ok();
  },

  build(state, dir) {
    if (!exists(dir, 'package.json')) return fail('no app code yet (package.json missing)');
    const branch = run('git', ['rev-parse', '--abbrev-ref', 'HEAD'], dir).stdout?.trim();
    const feature = state.github.branch ?? branch;
    if (!feature?.startsWith('feature/')) return fail(`work must be on a feature/* branch (currently "${feature}")`);
    const ahead = run('git', ['rev-list', '--count', `main..${feature}`], dir);
    if (!ahead.ok || Number(ahead.stdout) < 1) return fail(`no commits on ${feature} yet`);
    if (state.mode === 'github') {
      if (!state.github.pr) return fail('Pull Request not opened');
      const pr = run('gh', ['pr', 'view', String(state.github.pr), '--json', 'state'], dir);
      if (!pr.ok || JSON.parse(pr.stdout).state !== 'OPEN') return fail(`PR #${state.github.pr} is not open`);
    }
    const build = run('npm', ['run', 'build', '--silent'], dir, 300_000);
    if (!build.ok) return fail(`npm run build failed: ${(build.stderr || build.stdout).trim().split('\n').slice(-3).join(' | ')}`);
    return ok();
  },

  test(state, dir) {
    const testFiles = run('git', ['ls-files', '*.test.*', '**/*.test.*'], dir).stdout?.trim();
    if (!testFiles) return fail('no *.test.* files committed');
    if (!exists(dir, '.github/workflows/ci.yml')) return fail('.github/workflows/ci.yml missing');
    if (state.mode === 'github') {
      const r = run('gh', ['pr', 'checks', String(state.github.pr), '--json', 'name,state'], dir);
      let checks = [];
      try { checks = JSON.parse(r.stdout || '[]'); } catch {}
      if (!checks.length) return fail('no CI checks reported on the PR yet (push and wait)');
      const pending = checks.filter((c) => ['PENDING', 'QUEUED', 'IN_PROGRESS'].includes(c.state));
      if (pending.length) return fail(`CI still running: ${pending.map((c) => c.name).join(', ')}`);
      const bad = checks.filter((c) => !['SUCCESS', 'SKIPPED', 'NEUTRAL'].includes(c.state));
      if (bad.length) return fail(`CI failing: ${bad.map((c) => `${c.name}=${c.state}`).join(', ')}`);
      return ok();
    }
    const t = run('npm', ['test', '--silent'], dir, 300_000);
    if (!t.ok) return fail(`npm test failed: ${(t.stdout + t.stderr).trim().split('\n').slice(-3).join(' | ')}`);
    return ok();
  },

  review(state) {
    if (state.reviewer.verdict !== 'approve') {
      return fail(state.reviewer.verdict === 'changes'
        ? 'reviewer requested changes — developer must address them, then re-run review'
        : 'reviewer has not given a verdict yet');
    }
    return humanApproval(state, 'review');
  },

  async deploy(state, dir) {
    const url = state.vercel.prodUrl;
    if (!url) return fail('no production URL recorded');
    const h = await httpOk(url);
    if (!h.ok) return fail(`production URL ${url} unhealthy (${h.status})`);
    if (state.mode === 'github') {
      const tag = run('git', ['ls-remote', '--tags', 'origin', 'v*'], dir).stdout?.trim();
      if (!tag) return fail('no release tag (v*) pushed');
    }
    return ok();
  },

  async operate(state, dir) {
    if (!exists(dir, 'docs/runbook.md')) return fail('docs/runbook.md missing');
    const url = state.vercel.prodUrl;
    if (!url) return fail('no production URL to monitor');
    const h = await httpOk(new URL('/api/health', url).toString());
    if (!h.ok) return fail(`health check /api/health failing (${h.status})`);
    return ok();
  },
};

export async function checkGate(state, phase, dir = process.cwd()) {
  const active = state.chaos.filter((c) => c.status === 'active' && (c.blocks ?? []).includes(phase.id));
  if (active.length) return fail(`unresolved chaos event: ${active.map((c) => c.title).join('; ')}`);
  return CHECKS[phase.id](state, dir);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { load } = await import('./state.mjs');
  const state = load();
  const id = process.argv[2] ?? PHASES[state.current]?.id;
  const phase = PHASES[phaseIndex(id)];
  if (!phase) { console.error(`sdlc: unknown phase "${id}"`); process.exit(1); }
  const res = await checkGate(state, phase);
  console.log(JSON.stringify({ phase: id, gate: phase.gate.label, ...res }, null, 2));
  process.exit(res.pass ? 0 : 1);
}
