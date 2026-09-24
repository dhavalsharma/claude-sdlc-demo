#!/usr/bin/env node
// Chaos events: the things that go wrong in real projects.
//
// Usage: node chaos.mjs list
//        node chaos.mjs inject [type]      → records the event, prints the playbook
//        node chaos.mjs resolve <id> <how> → marks it resolved, unblocks gates

import { fileURLToPath } from 'node:url';
import { load, save, logEvent, rewind } from './state.mjs';
import { PHASES, phaseIndex } from './phases.mjs';

export const CATALOG = {
  'scope-change': {
    title: 'Client changed the requirements',
    minPhase: 'planning', maxPhase: 'review',
    responder: 'pm',
    blocks: [],
    lesson: 'Requirements change all the time. Agile teams re-plan instead of pretending the plan was perfect.',
    playbook: [
      'PM: invent a realistic, small new client request that fits the idea (one sentence).',
      'PM: file it as a new user story (GitHub issue labelled "change-request" in github mode), with acceptance criteria, and append it to state.stories.',
      'PM: update docs/PRD.md with a "Change log" entry.',
      'The pipeline is rewound to Requirements automatically; the stakeholder must re-approve.',
    ],
  },
  'failing-test': {
    title: 'A regression slipped into the code',
    minPhase: 'test', maxPhase: 'review',
    responder: 'qa',
    blocks: ['test', 'review', 'deploy'],
    lesson: 'Automated tests and CI exist so bugs are caught before users see them.',
    playbook: [
      'Chaos: on the feature branch, introduce one subtle bug in app logic (e.g. an off-by-one or inverted condition) that an existing test covers. Commit it as a normal-looking commit "refactor: tidy helpers" and push.',
      'QA: observe the failing test / red CI, file a bug (GitHub issue labelled "bug" in github mode) with steps to reproduce.',
      'Developer: fix it in a commit that references the bug, push, confirm green.',
      'Resolve the chaos event with how it was caught.',
    ],
  },
  security: {
    title: 'Security scanner found a vulnerable dependency',
    minPhase: 'test', maxPhase: 'review',
    responder: 'reviewer',
    blocks: ['review', 'deploy'],
    lesson: '"Shift-left" security: find vulnerabilities in the pipeline, not in production.',
    playbook: [
      'Chaos: add a known-vulnerable old package version as a dependency (e.g. "lodash@4.17.15"), run npm install, commit "chore: add utility lib", push.',
      'Reviewer: run `npm audit --audit-level=high`, report the CVE on the PR (or in docs/review.md locally) and block.',
      'Developer: remove or upgrade the package, confirm `npm audit --audit-level=high` passes, push.',
      'Resolve the chaos event.',
    ],
  },
  'prod-incident': {
    title: 'Production is down!',
    minPhase: 'operate', maxPhase: 'operate',
    responder: 'sre',
    blocks: ['deploy', 'operate'],
    lesson: 'Incidents happen, often from changes that skipped the pipeline. What matters is fast detection, calm response, and a blameless postmortem that fixes the process.',
    playbook: [
      'Chaos: simulate "someone hot-patched production from their laptop": make an UNCOMMITTED local change so lib/health.js reports status "error" (so /api/health returns 500), then deploy that working tree straight to production (github mode: `vercel deploy --prod --yes`; local mode: `npm run build && node <PLUGIN_ROOT>/scripts/local-prod.mjs restart`). Do not commit it.',
      'SRE: detect via the health check, declare an incident (SEV2), log a timeline of events.',
      'SRE: find the cause (compare what is deployed with main: `git status` / `git diff` shows the un-reviewed change), discard it (`git checkout -- .`), redeploy from clean main, verify /api/health is 200 again.',
      'SRE: write docs/postmortem.md from the template (blameless, timeline, root cause, action items).',
      'Resolve the chaos event.',
    ],
  },
};

export function eligible(state) {
  return Object.entries(CATALOG)
    .filter(([, c]) => state.current >= phaseIndex(c.minPhase) && state.current <= phaseIndex(c.maxPhase))
    .map(([type]) => type);
}

export function inject(type) {
  const state = load();
  const allowed = eligible(state);
  if (!allowed.length) {
    const when = Object.entries(CATALOG).map(([t, c]) => `${t} (${c.minPhase}–${c.maxPhase})`).join(', ');
    throw new Error(`No chaos event fits the current phase. Windows: ${when}`);
  }
  if (!type) type = allowed[Math.floor(Math.random() * allowed.length)];
  const c = CATALOG[type];
  if (!c) throw new Error(`Unknown chaos type "${type}". Options: ${Object.keys(CATALOG).join(', ')}`);
  if (!allowed.includes(type)) throw new Error(`"${type}" can only happen during ${c.minPhase}–${c.maxPhase}. Available now: ${allowed.join(', ') || 'none'}`);

  const id = `chaos-${state.chaos.length + 1}`;
  const event = { id, type, title: c.title, responder: c.responder, blocks: c.blocks, status: 'active', at: new Date().toISOString(), phase: PHASES[state.current]?.id };
  state.chaos.push(event);
  save(state);
  logEvent({ role: c.responder, type: 'chaos', chaosId: id, msg: `🔥 ${c.title}` });

  if (type === 'scope-change') rewind('requirements', c.title);
  return { ...event, lesson: c.lesson, playbook: c.playbook };
}

export function resolve(id, how) {
  const state = load();
  const c = state.chaos.find((x) => x.id === id) ?? state.chaos.findLast((x) => x.status === 'active');
  if (!c) throw new Error('No active chaos event to resolve.');
  c.status = 'resolved';
  c.resolvedAt = new Date().toISOString();
  c.how = how;
  save(state);
  logEvent({ role: c.responder, type: 'chaos-resolved', chaosId: c.id, msg: `✅ Resolved: ${c.title}${how ? ` — ${how}` : ''}` });
  return c;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [cmd, ...args] = process.argv.slice(2);
  try {
    if (cmd === 'list') {
      const state = load();
      const allowed = eligible(state);
      console.log(JSON.stringify(Object.entries(CATALOG).map(([type, c]) => ({ type, title: c.title, availableNow: allowed.includes(type), window: `${c.minPhase}–${c.maxPhase}` })), null, 2));
    } else if (cmd === 'inject') {
      console.log(JSON.stringify(inject(args[0]), null, 2));
    } else if (cmd === 'resolve') {
      console.log(JSON.stringify(resolve(args[0], args.slice(1).join(' ')), null, 2));
    } else {
      throw new Error('usage: chaos.mjs list | inject [type] | resolve <id> <how>');
    }
  } catch (e) {
    console.error(`sdlc: ${e.message}`);
    process.exit(1);
  }
}
