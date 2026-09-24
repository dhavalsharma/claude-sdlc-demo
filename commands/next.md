---
description: Advance the SDLC pipeline - check the current quality gate, then run the next phase with its role agent
argument-hint: "[--rerun]"
---

Read `${CLAUDE_PLUGIN_ROOT}/skills/sdlc-phases/SKILL.md` and act as the orchestrator.

1. Run `node "${CLAUDE_PLUGIN_ROOT}/scripts/state.mjs" next $ARGUMENTS`. `--rerun` repeats the current phase's work.
2. Handle the result exactly as the skill describes:
   - `run`: announce, delegate to the role agent (plus any fix loops), `finish`, then report.
   - `blocked`: explain the gate and what unblocks it.
   - `complete`: give the recap.
3. Run **one** phase per `/sdlc:next`. Students should see each step. Only continue past a phase if the user asked for it (that's `/sdlc:auto`).
