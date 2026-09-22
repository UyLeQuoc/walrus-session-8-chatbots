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
- Mainnet registry: `0x0da982cefa26864ae834a8a0504b904233d49e20fcc17c373c8bed99c75a7edd`.
- **Mainnet package: read it from `GET /config`.** The published docs give the original package `0xcee7a6fd8de52ce645c38332bde23d4a30fd9426bc4681409733dd50958a24c6`; the relayer runs an upgrade at `0xe7c16fbea0560e7057e2bf7422feaa4fb313749fc69c9e9092fac7a33b81d7f5`. Existing objects keep the original in their type, which is normal after a Move upgrade, but **Move calls must target the newer package** or the sponsorship allowlist rejects them. `fetchRelayerConfig()` does this. See `docs/issues/04`.
- Two deployments are live on mainnet and they are separate packages, not an upgrade. `GET /config` gives the current `packageId` but **no registry id**, and the documented registry belongs to the superseded deployment. Mixing them fails in two ways that both look like something else: `/sponsor` answers `502 sponsor_upstream_error`, and an owner lookup returns a real account from the wrong deployment. Check with `pnpm diagnose`, which fails if the chain and the relayer disagree. See `docs/issues/11`.
- Removing a delegate key on chain **does** end relayer access, after a delay. Measured at 32 seconds, still accepted at 15. See `docs/evidence/revocation-2026-09-22.md`.

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
| `POST /api/restore` | `restore(ns, limit)` | Meant to rebuild the index from Walrus, newest-first, no cursor, limit 1–100. **On our account it reports `total: 0` and `truncated: false` for namespaces that have memories**, while the read API lists 125 for the same owner. Do not rely on it as a recovery path. See `docs/issues/10`. |
| `POST /api/stats` | used internally by `resolveOwner()` | `{memory_count, storage_bytes, namespace, owner}`. Reuse for `/whoami`. |
| `POST /api/forget` | **none** | Deletes index rows for a namespace, so nothing can recall them. Blobs persist until their epochs expire, and **nothing deletes a current blob** (see Deletion below). |
| `POST /api/ask` | **none** | Recall + LLM answer server-side. |
| `GET /api/whoami` | **none** | `{account_id, owner, package_id}`; mainnet can resolve without `x-account-id`. |
| `GET /v1/owners/:owner/namespaces` | `listNamespaces()` | Cursor via `updated_after`. |
| `GET /v1/owners/:owner/memories` | **none** | Metadata only: `memory_id, namespace_id, blob_id, created_at, size, agent_id, status, expires_at`. No text. Limit ≤500, `has_more` is the end signal, not page length. |
| `GET /v1/owners/:owner/agents` | **none** | Live `delegate_keys` list `{label, sui_address}`. Reuse for `/whoami`. |
| `GET /api/accounts/:owner/exists` | none, public | Rate-limited existence check. |
| `GET /health`, `/version`, `/config` | `health()`, `compatibility()` | `/config` returns `packageId, network, suiRpcUrl, suiGrpcUrl`. |

Rate limits: the write path returns `60 weighted-requests/min per delegate_key`, not the 30 the public docs state, and the weights are unpublished so a client cannot predict its own budget. The read API is a separate 200/min per delegate key. The official multi-tenant pattern puts every end user behind one delegate key, so pace requests in process; `packages/memory/src/limiter.ts` does, and honours `retry_after_seconds`. See `docs/issues/06`.

**`recall()` can lie about finding nothing.** It sometimes returns `{"results": [], "total": 0, "dropped_count": N}`: N matches found and discarded, HTTP 200, no error, and `dropped_count` is absent from the SDK's types. Six identical eval runs gave 4, 9, 0, 15, 0 and 2 of these. Nothing client-side prevents it; retry before believing an empty result. See `docs/issues/01`.

**Writes take about 24 seconds** and jobs die when the relayer's own Sui RPC is throttled (`seal encrypt failed … Too Many Requests`). Never block a reply on a write, and resubmit a failed job. See `docs/issues/02`.

**Only the object form of `recall()` works.** The documented positional form `recall(q, limit, ns)` dropped every match in testing. See `docs/issues/03`.

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

- `POST /api/forget {namespace}`: index rows only. The memory becomes unrecallable; the blob stays.
- **The Security Delete API does not delete your memories.** Its own opening lines say it "permanently deletes legacy Walrus Blob objects that were tracked in MemWal's old-V1 database" and "never enrolls caller-supplied blobs into the legacy tracking set". It is migration cleanup for pre-July-2026 blobs. `GET /config` reporting `securityDeleteEnabled: true` means only that the route is exposed, not that an account can use it on current memories, which is how we first read it.
- **So there is no way to permanently delete a memory, even as the owner.** Storage runs about 210 days on mainnet, measured, and then the blob expires. Say this plainly to users rather than implying deletion. See `docs/issues/09`.

## Versions (Sep 22, 2026)

| Package | npm latest | In repo |
|---|---|---|
| `@mysten-incubation/memwal` | 0.1.7 (rc 0.1.8-rc.0) | 0.1.8 |
| `@mysten/dapp-kit` | 1.1.17 | ^1.0.3 |
| `@mysten/sui` | 2.31.3 | ^2.6.0 |
| `ai` | 7.0.108 | 6.0.37 (chatbot app) |
| `@ai-sdk/google` | 4.0.76 | – |
| `grammy` | 1.46.0 | – (Telegram, stretch) |

hippo runs `ai` v7, because `@openrouter/ai-sdk-provider` 3.x requires it and nothing here uses `withMemWal`. If you do use the SDK's `/ai` middleware, check it against v7 first: it was written for v4 and v5 and carries a `specificationVersion: "v3"` shim for v6.

## What we would tell someone starting today

1. Run something like `pnpm diagnose` before writing a feature. A wrong `MEMWAL_ACCOUNT_ID` works on mainnet and fails on testnet, so a broken config looks fine (`docs/issues/05`).
2. Read the package id from `GET /config`, not the docs.
3. Measure your own recall distances. True positives ran 0.449 to 0.777 for question-shaped queries, and `withMemWal`'s default relevance threshold works out to a 0.6 cutoff that would drop half of them.
4. Treat the relayer's search index as the fragile part and Walrus as the durable part, and do not count on `restore()` to bridge them.
5. Retry recalls that come back empty with a non-zero `dropped_count`, and resubmit writes whose jobs fail.
