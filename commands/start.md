---
description: Start an SDLC run - turn an idea into a project, open the live dashboard, and run the Idea phase
argument-hint: "\"<your app idea>\" [--local | --github] [--name <slug>] [--public | --private]"
---

Start a new SDLC demonstration run for: **$ARGUMENTS**

Read `${CLAUDE_PLUGIN_ROOT}/skills/sdlc-phases/SKILL.md` first, and follow it as the orchestrator. In this file, `$S …` is shorthand for `node "${CLAUDE_PLUGIN_ROOT}/scripts/state.mjs" …`. Always type the full command. Don't store it in a shell variable, because zsh won't word-split it.

## 1. Preconditions
- If `.sdlc/state.json` already exists here, stop. Show `$S status` and suggest `/sdlc:next`.
- The project is created **in the current directory**. If the directory has files other than dotfiles, stop and ask the user to run `/sdlc:start` from a new empty folder, e.g. `mkdir my-app && cd my-app && claude --plugin-dir <plugin>`.
- If no idea text was given, ask for one. Suggest examples: "Student attendance tracker", "Canteen menu & pre-order", "Library book finder".

## 2. Mode and names
- **Name:** a kebab-case slug of the idea, at most 30 characters, unless `--name` was given.
- **Mode:**
  - `--local` → local mode. `--github` → github mode.
  - Neither flag: check `gh auth status` and `vercel whoami`.
    - If both work, ask the user with AskUserQuestion. Offer "GitHub + Vercel (Recommended)", which creates a real repo `<gh-user>/<name>` and deploys to Vercel, or "Local only", which uses git and a local production server with no accounts.
    - If either fails, use local mode and tell the user which login is missing: `gh auth login` / `vercel login`.
- **github mode visibility:** use `--public`/`--private` if given. Otherwise ask, and default to public, since branch protection on private repos needs a paid GitHub plan.
- **Creating a repo publishes something under the user's account.** Make sure the user has confirmed the repo name and visibility, via their flags or your question, before you create it.

## 3. Initialise
1. `$S init --idea "<idea>" --name <name> --mode <mode>`
2. Start the live dashboard **in the background** (Bash `run_in_background: true`): `node "${CLAUDE_PLUGIN_ROOT}/dashboard/server.mjs" --dir "$PWD"`. Wait about a second, read `.sdlc/dashboard.json` for the URL, then open it: `open <url>` on macOS, `xdg-open` on Linux. Tell the user to put it on the projector.
3. Set up git:
   - `git init -b main`
   - copy `${CLAUDE_PLUGIN_ROOT}/starter/.gitignore` to `.gitignore`
   - write `README.md`: the project title, the idea, a note that it was built through a 9-phase SDLC pipeline by role-based AI agents, and an empty "Links" section
   - `git add -A && git commit -m "chore: project kickoff"`
4. **github mode:**
   - `gh repo create <name> --<visibility> --source . --remote origin --push --description "<idea>"`
   - `gh repo view --json nameWithOwner,url`, then `$S set github.repo '"<owner/name>"'`, `$S set github.url '"<url>"'` and `$S artifact repo <url> --label "GitHub repository"`
   - `$S event system "Repository created on GitHub"`

## 4. Idea phase
1. Run `$S next`. It returns `run` for the idea phase.
2. Follow **Running a phase** in the skill. The `sdlc:product-manager` agent writes the Epic.
3. Finish with a short welcome that explains:
   - the 9 phases, as one line with arrows
   - that each phase is done by a different role, like a real team
   - that 🔒 gates stop the pipeline until quality checks pass, and 3 of them need *their* approval as the stakeholder or tech lead
   - that `/sdlc:chaos` injects real-world problems at any time
   - the next step: `/sdlc:next`, or `/sdlc:auto` to run everything and pause only for approvals
