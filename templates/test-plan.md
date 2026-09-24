# Test Plan: {{Product name}}

> **Why this exists:** A test plan answers "how do we know it works?" for every acceptance criterion, before users find out the hard way.

## Scope
What is tested and what isn't (and why).

## Test levels
| Level | Tool | Runs where | Covers |
|-------|------|------------|--------|
| Unit | Vitest | CI on every push | Business logic in `lib/` |
| Build | `next build` | CI on every push | Compiles, no type/import errors |
| Security | `npm audit` | CI on every push | Known vulnerable dependencies |
| Smoke | `curl /api/health` | After deploy | App is up |

## Traceability: acceptance criteria → tests
| Story | Acceptance criterion | Test |
|-------|----------------------|------|
| US-1 | | `lib/x.test.js › …` |

## Entry / exit criteria
- **Entry:** PR open, build passes.
- **Exit:** all tests green in CI, no high-severity audit findings.
