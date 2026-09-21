# Spikes (M1)

Format: result — evidence — decision. Run against the managed mainnet relayer `https://relayer.memory.walrus.xyz` unless noted. Date: 2026-09-21/22.

## 0 — Credentials shape (unplanned, found first)

**Result: the account ID in `.env` was wrong and mainnet hid it.**

`MEMWAL_ACCOUNT_ID` had been set to the *delegate public key* (`f07169b6…`), not the `MemWalAccount` object ID. Every call still succeeded, because the relayer resolves the account in this order: cache → the `x-account-id` hint → a bounded on-chain registry scan. The hint is part of the signed canonical string but a wrong value is not rejected; the scan silently repairs it. On testnet the same config fails with `401`, since the scan needs JSON-RPC that testnet no longer serves.

Resolved the real values from the registry's `Table<address, ID>`:

| Field | Value |
|---|---|
| Owner (Sui address) | `0xf8a4da3a751fba566508deb5166196ec5530602a924b3b0c132963e98188fb04` |
| `MEMWAL_ACCOUNT_ID` | `0x4926f26b7a166e146161c517723c50762988f2772024cc5de7504f7350d9b7a5` |
| `MEMWAL_AGENT_ID` (submission form) | `f07169b63a377f86902696bf295997e3b2183043edd6024b4fc86907dfb85fa2` |

**Decision:** `packages/memory/src/registry.ts` ports the dashboard's registry lookup; `scripts/find-account.ts` prints the correct values from a delegate key alone. `.env.example` now says which is which. **Bug bounty:** a mismatched `x-account-id` should be rejected, or at least warned about, instead of being silently repaired only on mainnet.

## 1 — Write and recall on mainnet — PASS

`pnpm smoke --write` stored `[profile] [by:@smoke] [2026-09-21] …` and recalled it.

- Blob: `Weyzfr_Mu4hE2fp4j2lkQQaNszVYDFOuBZ0B01S75Ho`
- Account explorer: https://suiscan.xyz/mainnet/object/0x4926f26b7a166e146161c517723c50762988f2772024cc5de7504f7350d9b7a5
- **Write latency: 23.7 s** for `rememberAndWait`.

**Decision:** never block a chat reply on a write. `rememberWithDedupe` now accepts the job (sub-second) and returns a `settled` promise that records the blob ID in `memory_index` in the background. See `packages/memory/src/policy.ts`.

## 2 — Sponsored transactions from a non-Walrus origin — PASS

`OPTIONS https://relayer.memory.walrus.xyz/sponsor` with `Origin: http://localhost:5174` returns `200` with `access-control-allow-methods: GET,POST,DELETE,OPTIONS` and `vary: origin`. A `POST` from the same origin reaches the handler (`400 Invalid request body` for an empty payload, which is the handler talking, not CORS).

**Decision:** the web app calls `/sponsor` and `/sponsor/execute` directly. No server proxy needed, which removes a whole route from M3.

## 3 — Full connect on mainnet with a fresh wallet — BLOCKED

Needs a second Slush wallet. See `docs/BLOCKERS.md`.

## 4 — Revoke gives 401 — BLOCKED (depends on 3)

## 5 — Recall quality, and does the metadata prefix hurt? — see `docs/evidence/spike-recall-*.txt`

Early signal from spike 1: the query "which package manager does the user prefer?" matched a fact containing "Prefers pnpm" at **distance 0.745**, which the SDK's own bands call "usually unrelated". The stored line carried a `[profile] [by:@smoke] [2026-09-21] Smoke test run at <ISO timestamp>` prefix, so roughly half the embedded tokens were metadata.

**Decision (interim):** default `maxDistance` raised from 0.6 to 0.75 in `recallRelevant`. Final prefix decision follows the A/B run.

## 6 — Streaming through Hono — PASS (M0)

`curl -N` against `POST /api/chat` produced an incremental SSE stream; the Vite page renders it token by token.

## 7 — Manual SEAL decrypt — NOT STARTED (2 h cap)

## 8 — Security Delete API on the managed relayer — PASS

`GET /config` reports `securityDeleteEnabled: true`, `securityDeleteBatchMax: 900`, `securityDeleteMaxActiveBatchesPerOwner: 16`. `POST /api/security-delete-auth/challenge` returns `200`.

**Decision:** `/me` offers permanent per-memory deletion for owned-mode users, signed by their own wallet. Guest users get index-only `forget`. This is another concrete ownership difference to show judges.

## 9 — Enoki zkLogin — BLOCKED (needs an Enoki API key + Google OAuth client)

## 10 — Walrus Sites deploy — BLOCKED (needs WAL in the Sessions wallet)

## 11 — Explorer links — PARTIAL

`https://suiscan.xyz/mainnet/object/<id>` renders the `MemWalAccount`. Walrus blob link pattern still to confirm.

## Unplanned findings

### A — The relayer runs an upgraded package; the docs are stale

`GET /config` reports `packageId: 0xe7c16fbea0560e7057e2bf7422feaa4fb313749fc69c9e9092fac7a33b81d7f5`, while `memwal/docs/contract/overview.md` and the dashboard `.env.example` still say `0xcee7a6fd8de52ce645c38332bde23d4a30fd9426bc4681409733dd50958a24c6`. Both object IDs exist on chain. Existing objects keep the original package in their type (`0xcee7a6fd…::account::MemWalAccount`), which is normal after a Move upgrade, but **Move calls must target the newer package** or the sponsorship allowlist, which compares against the relayer's configured package, will reject them.

**Decision:** `fetchRelayerConfig()` reads the package ID from `/config` at runtime; `MEMWAL_PACKAGE_ID` is a fallback only. **Bug bounty:** published contract IDs are stale, and following the docs would have broken the connect flow.

### B — `GET /api/whoami` returns 404

Documented in `memwal/docs/relayer/api-reference.md` as a protected route for rebuilding lost credentials. The managed mainnet relayer answers `404`. **Bug bounty.**

### C — `GET /v1/owners/:owner/agents` is flaky

Returns `500 Internal server error` with a trace ID on some calls and `200` with six delegate keys on others, for the same owner, minutes apart. Trace IDs captured: `9657f4b7-dc8d-4449-b918-6e28cd92ed4b`, `7ef15cde-c149-4b1f-a52a-eb16e72d9920`, `a53e95d6-a231-4dde-a46d-bb2e8f2bcb67`, `a3be2c4c-788f-43e4-96fd-b9faa1735a7d`. The docs note this route makes a live on-chain `sui_getObject` call, and public fullnodes have retired JSON-RPC, which is a plausible cause.

Also: the route reports **six** delegate keys while the on-chain object's `delegate_keys` array has **four**. **Bug bounty**, with the count mismatch as a second issue.

**Decision:** `scripts/smoke.ts` retries and degrades instead of failing; `/whoami` in the bot reads delegate labels best-effort.

### D — The write rate limit is 60/min, not 30/min

The relayer returns `{"error":"Rate limit exceeded","layer":"delegate_key","limit":"60 weighted-requests/min","retry_after_seconds":60}`. Public docs say 30/min per delegate key. Either way it is *weighted*, and the weights are not published, so a client cannot predict its own budget.

**Decision:** `packages/memory/src/limiter.ts` paces every call per delegate key (default 50/min, concurrency 4) and `runLimited` honours `retry_after_seconds`. Guest mode shares one key across all users, so this is load-bearing. **Bug bounty:** publish the weights, and document the real limit.
