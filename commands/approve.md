---
description: Approve the current phase as the stakeholder / tech lead (requirements, design or code review gate)
argument-hint: "[optional note]"
---

You are recording the **human sign-off** for the current SDLC gate. In this file, `$S …` is shorthand for `node "${CLAUDE_PLUGIN_ROOT}/scripts/state.mjs" …`. Always type the full command. Don't store it in a shell variable, because zsh won't word-split it.

1. Run `$S approve $ARGUMENTS`. If it errors because the current phase has no human gate, explain which gates need approval (Requirements, Design, Code Review) and show `$S status`.
2. **github mode:** leave a visible trace where the team works.
   - Requirements: comment on the epic issue with `gh issue comment <github.epic> --body "✅ PRD approved by stakeholder. <note>"`.
   - Design: comment on the epic issue as well.
   - Code Review: `gh pr comment <github.pr> --body "✅ Approved by tech lead (human). <note>"`.
3. **Design approval** accepts the ADR. In every `docs/adr/*.md` whose status is Proposed, change it to `Accepted (<date>, tech lead)`. Commit `docs: accept ADR-000N` on main, and push in github mode.
4. In one line, explain what approval means in industry. For example: "In real teams the product owner signs off requirements so engineering doesn't build the wrong thing."
5. Tell the user: `/sdlc:next` will pass the gate and start the next phase.
