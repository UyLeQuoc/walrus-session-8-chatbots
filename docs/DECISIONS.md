# Decisions log

- 2026-09-22 — Use `ai` v7 across the repo instead of v6. `@openrouter/ai-sdk-provider` 3.x requires v7 and we do not use `withMemWal`, so nothing pins us to v6.
- 2026-09-22 — Web app is a Vite SPA, so all bots and the API live in one Hono process (`apps/server`). Long-lived gateways need a persistent process anyway.
- 2026-09-22 — CORS default allows `localhost:5173` and `5174`; the developer's machine has another app on 5173.
- 2026-09-21 — Memory writes no longer block the reply. `rememberAndWait` measured 23.7 s on mainnet; the tool now accepts the job and records the blob ID in the background (`policy.ts`, `port.ts`).
- 2026-09-21 — The package ID is read from the relayer's `GET /config` at runtime, not from the docs. The live mainnet package is an upgrade the docs do not mention, and the sponsorship allowlist compares against it.
- 2026-09-21 — Every relayer call is paced by a per-delegate-key limiter with `retry_after` handling. The observed limit is 60 weighted requests per minute, shared by all guest users on one key.
- 2026-09-21 — Default recall `maxDistance` is 0.75, not 0.6. Measured distances for clearly relevant matches ran to 0.745 once the metadata prefix was embedded with the fact.
- 2026-09-21 — Keep the `[type] [by:@user] [date]` prefix on stored memories. A/B on mainnet showed it costs 0.006 mean distance and no ranking, while buying type filtering, provenance and dates.
- 2026-09-21 — `DEFAULT_MAX_DISTANCE` is 0.8. Measured true positives reached 0.777; a 0.6 cutoff, which is what `withMemWal`'s default `minRelevance` works out to, would have dropped half of them.
- 2026-09-21 — Only the object form of `recall()` is used. The positional overload dropped every match in testing.
