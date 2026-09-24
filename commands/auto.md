---
description: Run the whole SDLC pipeline end-to-end, pausing only for human approvals (fast classroom demo mode)
argument-hint: "[--chaos]  (inject one random real-world problem along the way)"
---

Read `${CLAUDE_PLUGIN_ROOT}/skills/sdlc-phases/SKILL.md` and act as the orchestrator. In this file, `$S …` is shorthand for `node "${CLAUDE_PLUGIN_ROOT}/scripts/state.mjs" …`. Always type the full command. Don't store it in a shell variable, because zsh won't word-split it.

The target is a full idea-to-production run in about 15 minutes, so keep your messages short. The dashboard carries the detail.

If `.sdlc/state.json` doesn't exist, tell the user to run `/sdlc:start "<idea>"` first.

**Chaos (`--chaos` in `$ARGUMENTS`):** pick one injection point at random:
- (a) right after the **Test** phase's gate is ready
- (b) right after the **Operate** phase's work, before its final gate

At that point, run the `/sdlc:chaos` procedure (`${CLAUDE_PLUGIN_ROOT}/commands/chaos.md`) with no type, so an eligible event is chosen at random. Then continue.

## Loop
Repeat until `complete`:
1. Run `r = $S next`.
2. **run:** follow "Running a phase" from the skill (announce, delegate, fix loops, `finish`), and keep the report to 3 lines or fewer.
3. **blocked with `needsApproval`:** you are *not* the stakeholder. Ask the human with AskUserQuestion.
   - Show a 3–5 bullet summary of what they're approving, with links. Offer two options: "Approve" and "Request changes". Their notes or "Other" text become the feedback.
   - **Approve:** `$S approve "<note>"`. In github mode, also leave the comment the `/sdlc:approve` command describes.
   - **Request changes:** `$S reject "<feedback>"`, then continue the loop. The next `next` reruns the role with that feedback.
4. **Blocked for another reason:**
   - "CI still running": wait with `gh pr checks <pr> --watch --interval 10`, then loop.
   - Anything a role can fix: delegate once to the phase's role agent with `TASK=gate failed: <reason> — fix it`, run `$S finish <phase>`, then loop.
   - If the same gate blocks twice in a row, stop. Explain the problem and suggest how the user can resolve it.
5. **complete:** show the final recap described in the skill, including the total elapsed time since `state.createdAt`.
