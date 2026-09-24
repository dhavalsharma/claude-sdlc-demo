# Runbook: {{Product name}}

> **Why this exists:** At 3 a.m. during an outage, nobody should have to guess. The runbook tells the on-call engineer exactly what to check and do.

## Service overview
- **Production URL:** {{url}}
- **Health check:** `GET /api/health` → `200 {"status":"ok"}`
- **Hosting:** Vercel · **Repo:** {{repo}}
- **Owners:** SRE (AI) / you

## Service level objectives (SLOs)
| SLI | Objective |
|-----|-----------|
| Availability (health check 200) | 99.5% monthly |
| p95 page load | < 1.5 s |

## Alerts & how to respond
| Symptom | Likely cause | First steps |
|---------|--------------|-------------|
| Health check non-200 | Bad deploy / config | Check latest deployment → roll back (see below) |

## Common operations
- **Deploy:** merge PR → `vercel deploy --prod`
- **Roll back:** `vercel rollback` (or promote the previous deployment in the Vercel dashboard)
- **Logs:** `vercel logs {{url}}`

## Escalation
SEV1 (site down for all users) → page the owner immediately. SEV2 (major feature broken) → fix within hours. SEV3 → next sprint.
