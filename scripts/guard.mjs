#!/usr/bin/env node
// PreToolUse hook on Bash: enforces the same rules branch protection and
// release pipelines enforce in real companies. Only active inside a project
// that has an SDLC run (.sdlc/state.json in the hook's cwd).
//
// Blocks (exit 2) with an explanation:
//   • merging to main (gh pr merge / git merge on main) before review is approved
//   • production deploys (vercel --prod) before review is approved
//   • pushing straight to main once the Build phase has started

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { PHASES, phaseIndex } from './phases.mjs';

let input = '';
for await (const chunk of process.stdin) input += chunk;

let payload;
try { payload = JSON.parse(input); } catch { process.exit(0); }
const cmd = payload?.tool_input?.command ?? '';
const dir = payload?.cwd ?? process.cwd();
const stateFile = path.join(dir, '.sdlc', 'state.json');
if (!cmd || !fs.existsSync(stateFile)) process.exit(0);

const state = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
const current = state.current;
const reviewApproved = state.reviewer?.verdict === 'approve' && !!state.phases.review?.approval;
const currentBranch = () => {
  try { return execFileSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], { cwd: dir, encoding: 'utf8' }).trim(); } catch { return ''; }
};

function block(rule, why) {
  const line = JSON.stringify({ ts: new Date().toISOString(), role: 'system', type: 'guard', phase: PHASES[current]?.id, msg: `🛑 Blocked: ${rule}` });
  try { fs.appendFileSync(path.join(dir, '.sdlc', 'events.jsonl'), line + '\n'); } catch {}
  console.error(`SDLC quality gate: ${rule}\n${why}\nIn real teams this is enforced by branch protection / release pipelines. Follow the pipeline (/sdlc:status) instead of working around it.`);
  process.exit(2);
}

// Split compound commands so "cd x && gh pr merge" is still caught.
const parts = cmd.split(/&&|\|\||;|\n/).map((s) => s.trim());

for (const part of parts) {
  if (/^gh\s+pr\s+merge\b/.test(part) && !reviewApproved) {
    block('merge before code review approval', 'The Reviewer verdict and your /sdlc:approve are required before merging to main.');
  }
  if (/^git\s+merge\b/.test(part) && currentBranch() === 'main' && !reviewApproved) {
    block('merge into main before code review approval', 'Complete the Code Review phase first.');
  }
  if (/^(npx\s+)?vercel\b/.test(part) && /--prod\b|--production\b/.test(part) && !reviewApproved) {
    block('production deploy before code review approval', 'Production deploys only happen after review. Use a preview deploy (vercel deploy without --prod) to share work in progress.');
  }
  if (/^git\s+push\b/.test(part) && current >= phaseIndex('build') && !/--tags\b|\bv\d/.test(part)) {
    const targetsMain = /\s(origin\s+)?(HEAD:)?main\b/.test(part) || (!/\sorigin\s+\S+/.test(part) && currentBranch() === 'main');
    if (targetsMain) {
      block('direct push to main', 'Once building starts, all code reaches main through a Pull Request. Push your feature/* or hotfix/* branch instead.');
    }
  }
}

process.exit(0);
