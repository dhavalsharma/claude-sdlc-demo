# Architecture Overview: {{Product name}}

## System context
```mermaid
flowchart LR
  user([User / Browser]) --> app[Next.js app on Vercel]
  app --> api[/API routes/]
  api --> store[(Data store)]
```

## Components
| Component | Responsibility | Tech |
|-----------|----------------|------|

## Data model
```mermaid
erDiagram
  ENTITY { string id }
```

## Key flows
1. …

## Cross-cutting concerns
- **Security:** …
- **Observability:** `/api/health` endpoint, Vercel logs
- **Testing:** unit tests (Vitest) in CI
