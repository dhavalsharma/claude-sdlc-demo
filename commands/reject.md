---
description: Request changes on the current phase (requirements, design or code review) - the role agent reworks it with your feedback
argument-hint: "\"<what should change>\""
---

The stakeholder / tech lead is **requesting changes**: $ARGUMENTS

1. If no feedback text was given, ask what should change. Feedback must be specific.
2. Run `node "${CLAUDE_PLUGIN_ROOT}/scripts/state.mjs" reject "<feedback>"`.
3. **github mode:** post the feedback where the team works. For the review phase, that's a PR comment. For requirements and design, it's a comment on the epic issue.
4. Explain in one line that rework after feedback is normal and cheap at this stage. Fixing a misunderstanding in a PRD costs minutes; fixing it after release costs weeks.
5. Then run the phase again immediately: follow `/sdlc:next` behaviour. Run `state.mjs next`, which returns `run` with the `feedback` field, delegate to the role agent with `FEEDBACK=<feedback>`, `finish`, and report.
