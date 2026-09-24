---
description: Inject a real-world problem into the SDLC run (scope-change, failing-test, security, prod-incident) and watch the team respond
argument-hint: "[scope-change | failing-test | security | prod-incident]  (random if omitted)"
---

Read `${CLAUDE_PLUGIN_ROOT}/skills/sdlc-phases/SKILL.md`. You are the orchestrator, and for the first step you are also the **🐒 Chaos Monkey**. Shorthand used below:
- `$S …` means `node "${CLAUDE_PLUGIN_ROOT}/scripts/state.mjs" …`
- `$C …` means `node "${CLAUDE_PLUGIN_ROOT}/scripts/chaos.mjs" …`

Always type the full commands. Don't store them in shell variables, because zsh won't word-split them.

## 1. Inject
Run `$C inject $ARGUMENTS`.
- If it errors because it's the wrong phase, run `$C list` and show which events are available and when.
- On success, the output includes `id`, `title`, `lesson`, `responder` and `playbook`. Announce it:
  `🔥 CHAOS: <title>`
  `💡 <lesson>`

## 2. Play it out
Follow the `playbook` steps in order. Each "Chaos:" step is done **by you**, and you log it with `$S event system "🐒 Chaos monkey: …"`. Every other step is delegated to the named role agent. Use the prompt format from the skill, with `TASK=<chaos type>: <playbook step text>`. Narrate each handoff in one line.

Per-type notes:
- **scope-change:** the pipeline has already been rewound to Requirements. Delegate `sdlc:product-manager` with `TASK=scope-change`. Then run `$S finish requirements` to put the gate back to "awaiting approval", and `$C resolve <id> "Re-planned: <new story>"`. Explain that the stakeholder must re-approve, and that Design, Planning, Build and later phases will run again for the new story.
- **failing-test:**
  1. On the feature branch (`github.branch`), pick a function in `lib/` that has a test, introduce a subtle bug, and commit `refactor: tidy helpers`. Push in github mode.
  2. `sdlc:qa-engineer` with `TASK=failing-test`, then `sdlc:developer` with `TASK=fix` and the BUG text.
  3. Verify with `npm test`. In github mode, use `gh pr checks <pr> --watch`.
  4. Resolve.
- **security:**
  1. On the feature branch: `npm install lodash@4.17.15 --save --no-audit`, commit `chore: add utility lib`, push in github mode.
  2. `sdlc:reviewer` with `TASK=security`, then `sdlc:developer` with `TASK=fix: remove/upgrade vulnerable dependency`, then `sdlc:reviewer` with `TASK=re-review`.
  3. Verify with `npm audit --audit-level=high --omit=dev`.
  4. Resolve.
- **prod-incident:**
  1. Make the **uncommitted** change to `lib/health.js` so `status` is `'error'`, then deploy it straight to production.
     - **github mode:** `vercel deploy --prod --yes`.
     - **local mode:** `npm run build && node "${CLAUDE_PLUGIN_ROOT}/scripts/local-prod.mjs" restart`.
  2. Confirm `/api/health` returns 500.
  3. Delegate `sdlc:sre` with `TASK=prod-incident`.
  4. Verify health is 200 again and `docs/postmortem.md` exists, then resolve.

## 3. Resolve and debrief
- Run `$C resolve <id> "<how it was caught and fixed>"`, unless you already did it above.
- Debrief in 5 lines or fewer:
  - what broke
  - which safeguard caught it (tests, CI, review, audit, monitoring)
  - who responded
  - what it would have cost if it had reached users
- Finish with the next step: usually `/sdlc:next` (or `/sdlc:approve` if a gate is waiting).
