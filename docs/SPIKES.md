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

## 5 — Recall quality, and does the metadata prefix hurt? — PASS

A/B on mainnet: the same 10 facts written twice, once as `[type] [by:@uy] [date] fact` and once as bare text, into two namespaces, then 10 question-shaped queries against each. Full output: `docs/evidence/spike-recall-2026-09-21.txt`.

| | recall@5 | mean distance of hits |
|---|---|---|
| With `[type][by][date]` prefix | 10/10 at rank 1 | 0.583 |
| Bare text | 10/10 at rank 1 | 0.577 |

**The prefix costs 0.006 of distance and nothing in ranking.** Every hit came back at rank 1 in both namespaces.

The distances themselves matter more than the comparison. Clearly relevant matches ranged **0.449 to 0.777**, so the SDK's own guidance ("0.55–0.7 weak, ≥0.7 usually unrelated") is calibrated for statement-shaped queries, not questions. A `maxDistance` of 0.6, which is what the `withMemWal` default of `minRelevance: 0.3` works out to, would have dropped half of these true positives.

**Decisions:** keep the metadata prefix, it pays for itself in parsing and provenance. `DEFAULT_MAX_DISTANCE` is 0.8, on the reasoning that missing a real memory is worse than injecting one weak line, since the untrusted-data framing already tells the model to ignore what does not fit.

## 6 — Streaming through Hono — PASS (M0)

`curl -N` against `POST /api/chat` produced an incremental SSE stream; the Vite page renders it token by token.

## 7 — Manual SEAL decrypt — BLOCKED BY A FINDING, shelved

The mechanics all work. A memory's blob downloads from three independent public
Walrus aggregators, all returning the same 353 bytes of ciphertext:

```
200  https://aggregator.walrus-mainnet.walrus.space/v1/blobs/<id>
200  https://aggregator.mainnet.walrus.mirai.cloud/v1/blobs/<id>
200  https://walrus.globalstake.io/v1/blobs/<id>
```

`EncryptedObject.parse` reads it cleanly: sealed under package `0xe7c16fbe…`,
threshold 1, identity `<owner 32 bytes><counter 8 bytes>` with the counter at 0.
The SEAL session key builds. Then `fetchKeys` fails:

```
NoAccessError: User does not have access to one or more of the requested keys
```

Which is correct behaviour, and it is how we found issue 08: our delegate key is
not in the account's on-chain `delegate_keys`, so `seal_approve` refuses it. The
relayer decrypts the very same blob for the very same key without complaint.

**Decision:** shelve client-side decryption until issue 08 has an answer.
`/proof` links the public ciphertext instead, which still makes the point that a
memory is a real, publicly addressable Walrus blob that only the account can read.
Script kept at `packages/memory/scripts/spike-decrypt.ts` so it can be re-run in
one command once the key is genuinely on chain.

## 8 — Security Delete API on the managed relayer — PASS

`GET /config` reports `securityDeleteEnabled: true`, `securityDeleteBatchMax: 900`, `securityDeleteMaxActiveBatchesPerOwner: 16`. `POST /api/security-delete-auth/challenge` returns `200`.

**Decision:** `/me` offers permanent per-memory deletion for owned-mode users, signed by their own wallet. Guest users get index-only `forget`. This is another concrete ownership difference to show judges.

## 9 — Enoki zkLogin — BLOCKED (needs an Enoki API key + Google OAuth client)

## 10 — Walrus Sites deploy — BLOCKED (needs WAL in the Sessions wallet)

## 11 — Explorer links — PASS

| For | URL |
|---|---|
| Account, delegate list, owner | `https://suiscan.xyz/mainnet/object/<accountId>` |
| Transaction | `https://suiscan.xyz/mainnet/tx/<digest>` |
| Blob, human readable | `https://walruscan.com/mainnet/blob/<blobId>` |
| Blob, raw ciphertext | `https://aggregator.walrus-mainnet.walrus.space/v1/blobs/<blobId>` |

All four verified against live data. Collected in `packages/memory/src/links.ts`.
Two further aggregators answer the same bytes if the primary is down:
`aggregator.mainnet.walrus.mirai.cloud` and `walrus.globalstake.io`.

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

### E — `recall()` returns an empty list while reporting it dropped the matches

Intermittently, and reproducibly under load, the relayer answers a recall with:

```json
{"results": [], "total": 0, "dropped_count": 5}
```

for a namespace that definitely holds matching memories, moments after the same query returned them. It found five candidates and discarded all five, with HTTP 200 and no error. During one spike run this hit the last five queries of ten in a row.

The SDK's `RecallResult` type omits `dropped_count`, so a caller sees an ordinary empty result and concludes the user has no memories. For a memory product this is the worst possible silent failure: the bot forgets, confidently, and nothing logs.

**Decision:** `recallRelevant` treats `results.length === 0 && dropped_count > 0` as retryable and tries three times with backoff before believing it. **Bug bounty, highest value of the set:** expose `dropped_count` in the SDK types, and either surface the drop reason or retry server-side.

### F — the two documented `recall()` call forms are not equivalent

`SKILL.md` documents both `recall({ query, limit, namespace })` and `recall(query, limit, namespace)`. Against the same namespace, same query, seconds apart:

| Form | Result |
|---|---|
| `recall({ query: q, limit: 3, namespace: ns })` | 3 memories, distances 0.546–0.56 |
| `recall(q, 3, ns)` | `{"results": [], "total": 0, "dropped_count": 3}` |

The positional form found the same three and dropped every one. **Bug bounty.**

**Decision:** only the object form is used anywhere in this repo.

## Eval result (M2 exit criterion, met early)

`pnpm demo` teaches hippo five things in one session, throws the conversation away, then asks four questions in a fresh session. Full log: `docs/evidence/demo-2026-09-21.txt`.

```
PASS  Which package manager should I use here?   → "pnpm."                          (3 memories recalled)
PASS  Which ORM did we settle on?                → "We settled on Drizzle."          (4 memories recalled)
PASS  What port is the database on?              → "Our Postgres runs on port 5433." (4 memories recalled)
PASS  What do you know about me?                 → answered in Vietnamese             (4 memories recalled)
4/4 recalled correctly across sessions.
```

Two things worth pointing at in the article:

1. The last answer came back **in Vietnamese** without being asked in that session. A `style` memory written in session one changed how the bot writes in session two. That is memory shaping behaviour, not memory being quoted back.
2. **The drop bug fired four times during this single run.** Without the retry in `recallRelevant`, three of these four questions would have been answered with no memory at all, and the bot would have looked like it had forgotten everything. The mitigation is what makes the eval pass repeatably.

### G — the relayer honours a delegate key the chain does not

The largest finding of the session, written up in full as
`docs/issues/08-relayer-honours-a-delegate-the-chain-does-not.md`.

Our delegate key is absent from the account's on-chain `delegate_keys` vector,
yet the relayer accepts it for every authenticated route including decryption,
and `GET /v1/owners/:owner/agents` lists it. A randomly generated key is properly
rejected with `401`, so this is not an open bypass: the relayer specifically
knows this key. `access_counter_version` is `0`, so it is not a stale entry from
a past revocation.

This matters to hippo more than to most builders, because "revoke on chain and
the bot forgets" is the demo the whole submission is built around.

**Decisions taken now, rather than waiting for an answer:**

1. `/disconnect` deletes hippo's encrypted copy of the delegate private key
   rather than only marking it revoked. Whatever the relayer would do, hippo no
   longer holds the credential, so the revoke is true on our side.
2. The revoke demo will be recorded showing both halves: the on-chain removal,
   and a `pnpm smoke` run with the removed key against the relayer. If the
   relayer still accepts it for a while, that goes in the article honestly and
   becomes the sharpest feedback in the submission.
3. Client-side decryption is shelved (spike 7).

The owner-signed revocation test is now the top item in `docs/BLOCKERS.md`.

### H — the drop rate rises with concurrent recalls

Two full eval runs, same script, same namespace size:

| Run | Drop events | Exhausted all three retries |
|---|---|---|
| First (`demo-2026-09-21.txt`) | 4 | 0 |
| Second (`demo-2026-09-21-cross-channel.txt`) | 12 | 3 |

Both runs passed, because a session-start turn fires four recall queries and only
some of them get dropped, but the trend matters: the failure is not rare and it
gets worse when several recalls are in flight at once.

Working hypothesis: recall shares the relayer's SEAL decrypt pool, which
`docs/fundamentals/architecture/how-storage-works.md` describes as capped at
three concurrent decrypts because it is CPU bound. Four concurrent recalls, each
decrypting several results, would exceed it, and the relayer appears to drop
rather than queue.

**Decision:** lower the client limiter's default concurrency from 4 to 2, and
give the recall retry a longer backoff. Reliability of recall is judging
criterion one, so it is worth the small latency cost. Re-measure after the change
and record both numbers here.
