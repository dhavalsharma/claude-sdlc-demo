# SDLC Lifecycle Demo: a Claude Code plugin

**Watch an idea become a deployed web app, one real SDLC phase at a time.**

A team of AI agents takes a one-line idea through all nine phases of the Software Development Life Cycle. The team is a Product Manager, an Architect, a Developer, a QA Engineer, a Code Reviewer, a DevOps Engineer and an SRE. Along the way they produce the artifacts real teams produce:
- a PRD, user stories, an ADR, and a sprint plan
- a feature branch, a Pull Request, tests, and CI
- code review, a preview deploy, a production deploy, and a release tag
- a runbook, uptime monitoring, and a postmortem

Built for **students and freshers**: it shows *how the software industry actually works*, not just how to write code.

```
Idea → Requirements → Design → Planning → Build → Test → Code Review → Deploy → Operate
 🧭        🧭🙋          📐🙋       🧭        💻      🧪       🔍🙋          🚀       🛟
```
🙋 = a gate where **you** (stakeholder / tech lead) must approve.

## What makes it teach
| Feature | What students learn |
|---------|---------------------|
| **Role agents** | Who does what in a real team, and how work is handed off |
| **Quality gates** | Nothing moves forward until it's verified: the PRD approved, CI green, the review approved, production healthy. Gates check *real* things (files, git, CI status, HTTP health), not claims. |
| **Guard hook** | Try to push to `main` or merge before review and you get blocked, just as branch protection works |
| **Chaos events** | Real-world problems: the client changes scope, a regression slips in, a vulnerable dependency, production goes down |
| **Live dashboard** | A projector-friendly board showing the pipeline, gate lights, who's working and a live activity feed |
| **Real platforms** | GitHub issues, PRs, Actions and branch protection, plus Vercel preview and production deploys |

## Quick start
Prerequisites:
- Node 20 or newer, git, and [Claude Code](https://claude.com/claude-code)
- For GitHub mode, also: `gh auth login` and `vercel login`

Get the plugin (once):
```bash
git clone https://github.com/dhavalsharma/claude-sdlc-demo.git ~/claude-sdlc-demo
```

Start each demo from a new, empty folder. The project is created in the current directory:
```bash
mkdir library-finder
```
```bash
cd library-finder
```
```bash
claude --plugin-dir ~/claude-sdlc-demo
```

Then, inside Claude Code:
```
/sdlc:start "Library book finder for a college library"
/sdlc:next          # run the next phase, one at a time (best for teaching)
/sdlc:approve       # sign off at the 🙋 gates, or /sdlc:reject "feedback"
/sdlc:chaos         # inject a real-world problem at any time
```
You can also run `/sdlc:auto` (or `/sdlc:auto --chaos`) to go end to end and pause only for your approvals. The target is 15 minutes or less.

## Commands
| Command | What it does |
|---------|--------------|
| `/sdlc:start "<idea>" [--local\|--github] [--public\|--private]` | Creates the project (and the GitHub repo in github mode), opens the dashboard, and runs the Idea phase |
| `/sdlc:next [--rerun]` | Checks the current gate, then runs the next phase with its role agent |
| `/sdlc:approve [note]` | Human sign-off for Requirements, Design or Code Review |
| `/sdlc:reject "<feedback>"` | Requests changes. The role reworks it immediately with your feedback. |
| `/sdlc:status` | Shows the pipeline, gates, artifacts and active chaos |
| `/sdlc:chaos [type]` | `scope-change`, `failing-test`, `security` or `prod-incident` (random if you don't pick one) |
| `/sdlc:auto [--chaos]` | Runs everything, pausing only for approvals |
| `/sdlc:dashboard` | Reopens the live dashboard |

## Modes
| | **Local** (`--local`) | **GitHub + Vercel** (`--github`) |
|--|--|--|
| Accounts needed | none | GitHub (`gh`) and Vercel (`vercel`) |
| Stories and bugs | `state` + docs | GitHub Issues, labels, milestone |
| Code review | `docs/review.md` | PR review comments |
| CI | `npm test` locally | GitHub Actions, then branch protection |
| Production | `next start` on `localhost:3100` | `https://<project>.vercel.app` |
| Release | git tag | tag + GitHub Release |

Use local mode for offline classrooms. Use GitHub mode when you want students to click through a real repo afterwards.

## Phases and gates
| # | Phase | Role | Produces | Exit gate |
|---|-------|------|----------|-----------|
| 0 | Idea | 🧭 PM | `docs/EPIC.md`, Epic issue | Epic recorded |
| 1 | Requirements | 🧭 PM | `docs/PRD.md`, stories with acceptance criteria | 🙋 you approve |
| 2 | Design | 📐 Architect | `docs/adr/0001-*.md`, `docs/architecture.md` (Mermaid) | 🙋 you approve |
| 3 | Planning | 🧭 PM | Estimates, `docs/sprint-plan.md`, milestone | every story estimated |
| 4 | Build | 💻 Developer | `feature/*` branch, one commit per story, PR | PR open and `next build` passes |
| 5 | Test | 🧪 QA | Vitest tests, `docs/test-plan.md`, CI workflow | tests / CI green |
| 6 | Code Review | 🔍 Reviewer | Review comments, `npm audit`, verdict | reviewer approves and 🙋 you approve |
| 7 | Deploy | 🚀 DevOps | Preview → merge → production → `v1.0.0` | production URL healthy |
| 8 | Operate | 🛟 SRE | `docs/runbook.md`, uptime monitor | runbook and `/api/health` 200 |

Built-in feedback loops:
- QA finds a bug → the Developer fixes it → QA verifies.
- The Reviewer requests changes → the Developer fixes them → the Reviewer re-reviews.
- You reject → the role reworks with your feedback.

## Chaos events
| Event | When | What happens | Lesson |
|-------|------|--------------|--------|
| `scope-change` | Planning to Review | The client asks for something new, and the pipeline rewinds to Requirements | Requirements change; agile teams re-plan |
| `failing-test` | Test to Review | A "harmless refactor" breaks logic, so tests and CI go red. QA files a bug and the Developer fixes it. | Why tests and CI exist |
| `security` | Test to Review | A vulnerable `lodash` is added. `npm audit` and the Reviewer block it. | Shift-left security |
| `prod-incident` | Operate | Someone deploys an un-reviewed change from their laptop and production health fails. The SRE responds, rolls back, and writes a postmortem. | Incident response, blameless postmortems |

## Suggested 45-minute class
1. **(5 min)** Pitch: ask the class for an app idea and run `/sdlc:start`. Put the dashboard on the projector.
2. **(10 min)** Requirements and Design: read the PRD together, and **reject once** with class feedback so they see how cheap rework is at this stage. Approve the ADR after discussing the trade-offs.
3. **(15 min)** Planning to Test: talk about story points, branches, PRs and CI while the agents work.
4. **(5 min)** Chaos: run `/sdlc:chaos failing-test` or `security`, and watch the pipeline catch it.
5. **(5 min)** Review, Deploy, Operate: approve the review, open the live URL on students' phones, then run `/sdlc:chaos prod-incident`.
6. **(5 min)** Debrief with the dashboard timeline: which safeguard caught which problem, and what would it have cost in production?

## How it works
```
claude-sdlc-demo/
├── .claude-plugin/plugin.json   plugin manifest (name: sdlc)
├── commands/                    /sdlc:* slash commands (the orchestrator)
├── agents/                      7 role agents (sdlc:product-manager, …)
├── skills/sdlc-phases/          orchestration guide + agent contract
├── hooks/hooks.json             PreToolUse guard on Bash
├── scripts/
│   ├── phases.mjs               the pipeline definition (single source of truth)
│   ├── state.mjs                state machine: .sdlc/state.json + events.jsonl
│   ├── gate.mjs                 exit-gate checks (files, git, gh, npm, HTTP)
│   ├── guard.mjs                blocks push-to-main / early merge / early prod deploy
│   ├── chaos.mjs                chaos catalogue, inject / resolve
│   └── local-prod.mjs           detached "production" server for local mode
├── dashboard/                   zero-dependency SSE server + single-page board
├── templates/                   PRD, ADR, stories, test plan, review, runbook, postmortem, CI
└── starter/                     minimal Next.js 16 + Vitest app (Vercel-ready)
```
- **Deterministic parts are scripts:** the state machine, gates, the guard and chaos.
- **Creative parts are agents:** writing the PRD, designing, coding, testing, reviewing.
- The orchestrator (the slash commands) never does a role's work. It only delegates and enforces the process.

## Notes and limits
- **Self-approval on GitHub:** GitHub doesn't let an account approve its own PR. Since the agents use your account, the Reviewer posts a *comment* review, and your `/sdlc:approve` is the approval of record.
- **Branch protection:** enabled by QA once CI exists. On private repos it needs a paid GitHub plan. If it fails, the local guard hook still enforces the rules.
- **Vercel preview URLs** may sit behind Vercel login (Deployment Protection). The public production domain is what the gates check.
- The project is created in the **current directory**, so start from an empty folder.
