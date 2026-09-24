---
description: (Re)open the live SDLC dashboard for this project
---

1. If `.sdlc/dashboard.json` exists and `curl -fsS <url>/api/state` works, just open the URL (`open` on macOS, `xdg-open` on Linux).
2. Otherwise, start it in the background (Bash `run_in_background: true`): `node "${CLAUDE_PLUGIN_ROOT}/dashboard/server.mjs" --dir "$PWD"`. Wait about a second, read `.sdlc/dashboard.json`, and open the URL.
3. Tell the user the URL. The dashboard updates live as agents work, so it's best on a projector.
