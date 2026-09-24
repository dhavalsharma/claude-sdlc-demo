---
description: Show where the SDLC pipeline is - phases, gates, artifacts and active chaos
---

1. Run `node "${CLAUDE_PLUGIN_ROOT}/scripts/state.mjs" status` and show the output in a code block.
2. Read `.sdlc/dashboard.json`. If it exists, show the dashboard URL. If the dashboard isn't reachable, suggest `/sdlc:dashboard`.
3. Say in one line what the next step is: approve, next, wait for CI, or resolve chaos.
