# `recall()` returns an empty result set while reporting it dropped the matches

## Summary

Intermittently, and reliably under sustained use, `POST /api/recall` answers `200` with

```json
{"results": [], "total": 0, "dropped_count": 5}
```

for a namespace that definitely holds matching memories, seconds after the same
query returned them. Five candidates were found and all five were discarded.

The TypeScript SDK's `RecallResult` type does not include `dropped_count`, so a
caller sees an ordinary empty result. For a memory product this is the worst
shape a failure can take: the agent concludes the user has no memories, answers
from nothing, and neither the user nor the developer sees an error.

## Expected

Either the matches come back, or the call fails loudly. If dropping is
deliberate, `dropped_count` belongs in the SDK's response type and in the docs,
with the reason a match can be dropped.

## Actual

`results: []`, `total: 0`, `dropped_count: N > 0`, HTTP 200, no error field, no
warning, nothing in the SDK's typings.

## Repro

```bash
git clone https://github.com/UyLeQuoc/walrus-session-8-chatbots
cd walrus-session-8-chatbots && pnpm install
cp .env.example .env    # fill MEMWAL_ACCOUNT_ID and MEMWAL_PRIVATE_KEY
pnpm --filter @hippo/memory exec tsx scripts/spike-recall.ts
```

The script writes ten facts, waits for indexing, then runs ten queries. During
one run the last five queries in a row returned `dropped_count: 5` with no
results, while the first five answered normally. Re-running the measurement a
minute later returned all ten.

Minimal version, against any namespace that has entries:

```ts
const res = await memwal.recall({ query: "anything", namespace: ns, limit: 5 });
console.log(res.results.length, (res as any).total, (res as any).dropped_count);
```

## Impact and our workaround

During a single run of our cross-session memory eval this fired four times. Three
of four questions would have been answered with no memory at all, and the bot
would have looked like it had forgotten everything the user told it.

We now treat `results.length === 0 && dropped_count > 0` as retryable, three
attempts with backoff, before believing an empty result. The eval passes
repeatably with that in place and fails without it.

## How often, and what does not fix it

Four runs of the same four-question eval against the same namespace:

| Run | Recalls issued | Drop events | Retries exhausted | Eval result |
|---|---|---|---|---|
| 1 | four in parallel | 4 | 0 | 4/4 |
| 2 | four in parallel | 9 | 3 | 4/4 |
| 3 | one at a time | 0 | 0 | 4/4 |
| 4 | one at a time | 15 | 1 | 4/4 |
| 5 | one at a time | 0 | 0 | 4/4 |
| 6 | one at a time | 2 | 0 | 4/4 |

We first thought concurrency was the trigger, since recall plausibly shares the
SEAL decrypt pool your docs describe as capped at three concurrent decrypts.
Run 3 seemed to confirm it. Run 4, sequential and with nothing else touching the
relayer, produced the worst numbers of the set, and runs 5 and 6 then gave 0 and
2. So concurrency is not the explanation, the rate varies by an order of
magnitude between identical runs, and nothing we tried on the client side
reduces it.

What does work is retrying: every run passed, including the one where a recall
gave up after four attempts, because a session-start turn issues several
overlapping queries and the redundancy covered the loss. A single-query client
would simply have forgotten.

## Asks

1. Expose `dropped_count` (and ideally a reason) in the SDK's `RecallResult`.
2. Retry or fail loudly server-side rather than returning a successful empty page.
3. Document what causes a match to be dropped.
