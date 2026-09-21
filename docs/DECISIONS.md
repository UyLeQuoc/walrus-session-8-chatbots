# Decisions log

- 2026-09-22 — Use `ai` v7 across the repo instead of v6. `@openrouter/ai-sdk-provider` 3.x requires v7 and we do not use `withMemWal`, so nothing pins us to v6.
- 2026-09-22 — Web app is a Vite SPA, so all bots and the API live in one Hono process (`apps/server`). Long-lived gateways need a persistent process anyway.
- 2026-09-22 — CORS default allows `localhost:5173` and `5174`; the developer's machine has another app on 5173.
