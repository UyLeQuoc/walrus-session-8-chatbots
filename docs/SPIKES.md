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

## 8 — Security Delete API — CORRECTED, it does not do what I assumed

First read: `GET /config` reports `securityDeleteEnabled: true` and
`POST /api/security-delete-auth/challenge` returns `200`, so I concluded that
owned-mode users could permanently delete individual memories from `/me`.

**That was wrong, and I only caught it when I went to implement it.** The first
two sentences of `docs/api/security-delete.md` say what the API is for:

> The Security Delete API permanently deletes legacy Walrus Blob objects that
> were tracked in MemWal's old-V1 database.
>
> This API never enrolls caller-supplied blobs into the legacy tracking set.

It is a migration cleanup tool for blobs from before the July 2026 cutover. A
memory hippo writes today is never in that set, so it can never be deleted
through it. The endpoint being enabled means only that the relayer would delete
pre-migration blobs for an owner who has any.

**So there is no way to permanently delete a memory you own.** `POST /api/forget`
removes vector index rows, which makes a memory unrecallable, and the encrypted
blob stays on Walrus until its epochs run out. Nothing in the relayer API or the
SDK deletes a current blob.

**Decisions:** `/me` does not offer permanent deletion, because it cannot.
`/memory forget` says plainly what it does and does not do, rather than pointing
at a deletion path that does not exist. Filed as `docs/issues/09`, and it goes in
the article as the honest limit of the ownership story: you own it, you can stop
anyone recalling it, and you cannot make it go away.

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

*Updated 2026-09-22: the eval now asserts three things rather than one. Latest
run in `docs/evidence/demo-2026-09-22-style-asserted.txt`: 4/4 cross-session
recall, style adaptation PASS, cross-channel recall PASS, zero dropped recalls.
The style check looks for Vietnamese-only diacritics in an answer nothing in that
session asked to be Vietnamese, so it cannot pass by accident.*


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

### H — the drop rate is high and erratic, and concurrency does not explain it

I thought I had found the cause. I had not, and the corrected version is more
useful than the wrong one.

The hypothesis was that recall shares the relayer's SEAL decrypt pool, capped at
three concurrent decrypts, and that a session-start turn firing four recalls at
once overflows it. The first measurement supported it: switching to sequential
recalls took a run from nine drops to zero, twice.

Then I killed a stray polling loop that had been issuing a recall every five
seconds against the same delegate key, re-ran the same eval with nothing else
touching the relayer, and got **fifteen drops and one recall that exhausted all
four retries**. Sequential, clean, worse than ever.

| Run | Recalls | Other load | Drop events | Exhausted retries | Eval |
|---|---|---|---|---|---|
| 1 | concurrent | none | 4 | 0 | pass |
| 2 | concurrent | poller | 9 | 3 | pass |
| 3 | sequential | poller | 0 | 0 | pass |
| 4 | sequential | none | 15 | 1 | pass |
| 5 | sequential | none | 0 | 0 | pass |
| 6 | sequential | none | 2 | 0 | pass |

There is no relationship here. Six runs of the same script against equivalent
namespaces gave 4, 9, 0, 15, 0 and 2 drop events. Run 3's zero was luck, not a
fix, and so was run 5's. I am recording the wrong hypothesis rather than deleting it,
because the shape of the mistake matters: one encouraging measurement, in the
direction I expected, and I nearly published it.

**What is actually true, and what the bug report says:**

- The drop is frequent. Fifteen events in one four-question eval.
- It is erratic. Identical runs differ wildly.
- Retrying works. Every run passed 4/4, including the one where a recall gave up
  entirely, because a session-start turn issues several overlapping queries and
  the redundancy covers a loss.
- Nothing a client does seems to prevent it. Only handling it helps.

**Decisions kept anyway:** sequential recalls and concurrency 2 stay. They did
not fix the drop, but they lower load on a shared delegate key that the official
multi-tenant pattern puts every user behind, and that is worth having on its own.
The retry, four attempts backing off from 1.5 s, is what actually keeps the bot
from forgetting.

Evidence: `docs/evidence/demo-2026-09-21-cross-channel.txt` (run 2),
`demo-2026-09-21-sequential.txt` (run 3), `demo-2026-09-22-clean.txt` (run 4).

## 12 — Vietnamese, and cross-language recall — PASS

hippo's first real users are Vietnamese, and it already answers in Vietnamese
when a `style` memory says so, so this was not a curiosity. If embeddings or
storage mangled the language the whole real-use week would be built on sand.

Six facts written in Vietnamese plus one in English, then eight questions across
both languages. Full output in `docs/evidence/spike-vietnamese-2026-09-22.txt`.

**Byte fidelity: 6/6 returned exactly as written.** Every diacritic survived the
round trip through SEAL encryption, Walrus and back. No normalisation, no
mojibake.

**Recall: 8/8 found, mean distance 0.581.**

| Direction | Result |
|---|---|
| Vietnamese question → Vietnamese fact | 5/5, four of them at rank 1 |
| Vietnamese question → English fact | 1/1 at rank 1, distance 0.567 |
| English question → Vietnamese fact | 2/2, distances 0.638 and 0.728 |

Cross-language recall working in both directions is a real bonus: a user can ask
in Vietnamese about something they said in English and still be understood.

**This also re-confirms the distance decision, and this time in the language the
users actually speak.** The two hardest queries landed at **0.714 and 0.728**,
both asking about a package manager. A `maxDistance` of 0.7, which is where the
SDK's own guidance puts the "usually unrelated" line, would have thrown both
away. `DEFAULT_MAX_DISTANCE` at 0.8 keeps them.

**It removes a bug-bounty candidate rather than adding one.** Vietnamese fact
extraction and embedding quality was on the list to check; there is nothing to
report. Worth saying plainly, because a list of complaints is more credible when
the things that work are also named.

## 13 — How long do memories actually live? — PASS, about 7 months

Judging runs to 2026-10-16, so a short storage lifetime would have quietly
undone the submission. `GET /v1/owners/:owner/memories` answers it.

| | |
|---|---|
| Memories visible on the read API | 125, all `status: active` |
| With a resolved expiry | 89 (the sweep had not reached the other 36) |
| Soonest expiry | 2027-03-20, 179 days out, epoch 52 |
| Latest expiry | 2027-04-20, 210 days out, epoch 54 |
| Expiring before judging | **0** |

A memory written today gets roughly **210 days**. Nothing to worry about and
nothing to file: another candidate off the bug-bounty list.

Two things fall out of it.

**`/me` can show expiry honestly.** The read API carries `expires_at` per blob,
so the page tells a user when each memory's storage runs out rather than
implying "forever".

**It makes `docs/issues/10` much sharper.** The read API enumerates 125 live
memories for this owner while `restore()` reports seeing zero on chain for the
same owner. Those two relayer endpoints cannot both be describing this account.
