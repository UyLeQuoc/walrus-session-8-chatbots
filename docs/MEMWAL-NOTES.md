# Walrus Memory (MemWal) — engineering notes

Deeper reference than `BRIEF.md` §5, distilled from `memwal/` (SDK 0.1.8 source, relayer source, docs). File paths are inside `memwal/`.

## Reading order

1. `SKILL.md` — single-file SDK reference.
2. `docs/sdk/cookbook-multi-tenant.md` — the operator-account pattern (our guest mode).
3. `docs/contract/overview.md`, `docs/contract/delegate-key-management.md`, `docs/contract/ownership-and-permissions.md` — on-chain model (our owned mode).
4. `packages/sdk/src/account.ts` — `createAccount`, `addDelegateKey`, `removeDelegateKey`, `generateDelegateKey`; all accept `walletSigner` (dapp-kit shape) or `suiPrivateKey`.
5. `apps/app/src/pages/ConnectMcp.tsx`, `SetupWizard.tsx`, `hooks/useSponsoredTransaction.ts`, `utils/suiClientCompat.ts` — the exact browser flow to copy.
6. `packages/sdk/src/ai/middleware.ts`, `ai/untrusted-memory.ts` — how recall is injected safely.
7. `docs/guides/system-prompt-templates.md` — prompts that make agents write memory.
8. `docs/relayer/api-reference.md`, `docs/api/memory-read-api.md` — endpoints the SDK does not wrap.
9. `packages/mcp/src/auth.ts` (`MemWalCredentials`), `docs/mcp/reference.md` — for the Claude Code demo.

## On-chain model

- `AccountRegistry` (shared): one `MemWalAccount` per Sui address. Lookup = dynamic field on the registry's `accounts` Table keyed by address.
- `MemWalAccount` (shared): `owner`, `delegate_keys: vector<DelegateKey{public_key, sui_address, label, created_at}>`, `active`, rotation counter for SEAL identities.
- Owner: add/remove delegates, freeze/unfreeze, decrypt. Delegate: remember/recall/analyze/restore/decrypt. Delegates cannot manage keys.
- Max 20 delegate keys. Duplicate key → error 0. Removal bumps the rotation counter so old SEAL keys stop working for new writes.
- Mainnet: package `0xcee7a6fd8de52ce645c38332bde23d4a30fd9426bc4681409733dd50958a24c6`, registry `0x0da982cefa26864ae834a8a0504b904233d49e20fcc17c373c8bed99c75a7edd`. Testnet IDs in `docs/contract/overview.md`.

## Sponsored transactions (gasless)

Relayer routes `POST /sponsor` and `POST /sponsor/execute` proxy to Enoki via the sidecar. Allowlist in `services/server/src/routes/sponsor.rs`: exactly one call to `account::create_account`, `account::add_delegate_key`, or `account::remove_delegate_key` (batched removals allowed up to a cap), on the configured package. Flow:

1. `tx.build({ client, onlyTransactionKind: true })` → base64.
2. `createSponsorAuthorization(sender, kindBytes, signPersonalMessage)` from `@mysten-incubation/memwal` → `{authNonce, authSignature, authTimestamp}`.
3. `POST /sponsor {transactionBlockKindBytes, sender, ...auth}` → `{bytes, digest}`.
4. Wallet `signTransaction(Transaction.from(bytes))`.
5. `POST /sponsor/execute {digest, sender, signature}` → `{digest}`.
6. `suiClient.waitForTransaction({digest})`.

Retry 408/429/500/503/504 with backoff; do not retry 502 (dry-run rejected, for example duplicate delegate key).

## Relayer HTTP API (signed with the delegate key)

Headers: `x-public-key`, `x-signature`, `x-timestamp` (±300 s), `x-nonce` (UUID v4, single use), `x-account-id`. Canonical string `{timestamp}.{method}.{path_and_query}.{body_sha256}.{nonce}.{account_id}`. The SDK's private `signedRequest` does this; for endpoints the SDK does not wrap, either reimplement (small) or call `memwal["signedRequest"]` (private, brittle).

| Endpoint | SDK wrapper | Notes |
|---|---|---|
| `POST /api/remember`, `/remember/:job`, `/remember/bulk`, `/bulk/status` | `remember*`, `waitForRememberJob*` | Async job; `*AndWait` polls. |
| `POST /api/recall` | `recall()` | `{query, limit, namespace, maxDistance}`; returns `{blob_id, text, distance}`. |
| `POST /api/analyze` | `analyze*` | LLM fact extraction then one job per fact. |
| `POST /api/embed` | `embed()` | |
| `POST /api/restore` | `restore(ns, limit)` | Rebuild index from Walrus, newest-first, no cursor, limit 1–100. |
| `POST /api/stats` | used internally by `resolveOwner()` | `{memory_count, storage_bytes, namespace, owner}`. Reuse for `/whoami`. |
| `POST /api/forget` | **none** | Deletes index rows for a namespace. Blobs persist. |
| `POST /api/ask` | **none** | Recall + LLM answer server-side. |
| `GET /api/whoami` | **none** | `{account_id, owner, package_id}`; mainnet can resolve without `x-account-id`. |
| `GET /v1/owners/:owner/namespaces` | `listNamespaces()` | Cursor via `updated_after`. |
| `GET /v1/owners/:owner/memories` | **none** | Metadata only: `memory_id, namespace_id, blob_id, created_at, size, agent_id, status, expires_at`. No text. Limit ≤500, `has_more` is the end signal, not page length. |
| `GET /v1/owners/:owner/agents` | **none** | Live `delegate_keys` list `{label, sui_address}`. Reuse for `/whoami`. |
| `GET /api/accounts/:owner/exists` | none, public | Rate-limited existence check. |
| `GET /health`, `/version`, `/config` | `health()`, `compatibility()` | `/config` returns `packageId, network, suiRpcUrl, suiGrpcUrl`. |

Rate limits: write path 30 weighted req/min per delegate key (plus per-account tiers); read API 200/min per delegate key, separate budget.

## SDK behaviours to design around

- `remember()` always appends. No upsert, no idempotency on content (there is a derived idempotency key per request, not per text).
- `recall()` top-K with no default cutoff. Use `maxDistance`. Bands: `<0.25` dup, `0.25–0.55` related, `0.55–0.7` weak, `>=0.7` unrelated. `minRelevance` in `withMemWal` is `1 - distance`.
- Indexing lag: seconds. `rememberAndWait` default timeout 30 s.
- Namespace: flat, exact match, ≤255 UTF-8 bytes, no NUL, stored verbatim, **public on-chain**.
- `MemWal.create()` is cheap; create one per request with the right key + account + namespace. `resolveOwner()` is memoised per instance.
- `withMemWal` middleware: recall on last user message, inject via `formatUntrustedMemories()` + `UNTRUSTED_MEMORY_SYSTEM_INSTRUCTION` (both exported from `/ai`), `analyze()` fire-and-forget after generation, `flush()` for serverless. We reuse the two formatting exports only.
- Node ≥18. Peer deps only needed for `/manual` and `/account` (`@mysten/sui`).
- Delegate key is a 32-byte Ed25519 seed as 64 hex. `generateDelegateKey()` returns `{privateKey, publicKey: Uint8Array, suiAddress}`.

## Dashboard (memory.walrus.xyz)

- Wallet via dapp-kit; Google via Enoki zkLogin (`registerEnokiWallets`, needs an Enoki API key + Google client ID + allowed origins). For hippo, Slush wallet is enough; zkLogin is optional polish.
- Setup wizard: `create_account` then `add_delegate_key`, both sponsored, then resolve account ID from the registry after finality.
- `/connect/mcp?port&publicKey&label&relayer&connectState`: preflights a localhost bridge, so it cannot be reused by a server bot. Our page replaces the bridge with a server token.
- Delegate keys can be removed from the dashboard UI; that is the user-facing revoke path judges can see.

## MCP plugin (for the portability demo)

- `npx -y @mysten-incubation/memwal-mcp`, or the Claude Code plugin (`/plugin marketplace add MystenLabs/MemWal`, `/plugin install memwal@memwal-plugins`).
- Login: `memwal_login` opens the dashboard, signs `add_delegate_key`, writes `~/.memwal/credentials.json` (`MemWalCredentials` shape in `packages/mcp/src/auth.ts`).
- `--namespace hippo` or `MEMWAL_NAMESPACE=hippo` makes Claude Code read the same namespace hippo writes to.
- `memwal_logout` only deletes the local file; on-chain revoke is on the dashboard.

## Deletion

- `POST /api/forget {namespace}`: index only.
- Security Delete API (`docs/api/security-delete.md`, `docs/guides/delete-memories-programmatically.md`): wallet challenge → bearer → list deletable blobs → prepare sponsored deletion → submit signature. Owner wallet required. Out of scope; link from `/memory forget` reply.

## Versions (Sep 22, 2026)

| Package | npm latest | In repo |
|---|---|---|
| `@mysten-incubation/memwal` | 0.1.7 (rc 0.1.8-rc.0) | 0.1.8 |
| `@mysten/dapp-kit` | 1.1.17 | ^1.0.3 |
| `@mysten/sui` | 2.31.3 | ^2.6.0 |
| `ai` | 7.0.108 | 6.0.37 (chatbot app) |
| `@ai-sdk/google` | 4.0.76 | – |
| `grammy` | 1.46.0 | – (Telegram, stretch) |

Pin `ai` to the major the SDK's `/ai` entry was tested with (v6) unless a spike shows v7 works with `wrapLanguageModel`.
