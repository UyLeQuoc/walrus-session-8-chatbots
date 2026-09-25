# SDK 0.1.8: read, measured, not merged — 2026-09-25

**Decision: 0.1.8 stays on the `sdk-0.1.8` branch.** It passes everything and did
not drop more recalls than 0.1.7, but "no slower recall" could not be shown: the
relayer was degraded for the whole measurement, and under it the two 0.1.8 runs
landed on either side of the 0.1.7 run. Merge it when an A/B/A bench on a healthy
relayer puts 0.1.8's median within the spread of 0.1.7's, with no more drops.

## What changed from 0.1.7

Read from the published packages (`npm pack` of both, `dist/` diffed). hippo uses
`remember`, `waitForRememberJob` and `recall`, so the first three matter:

1. **Every request has a deadline**, 30 s by default (`requestTimeoutMs`), and
   each `waitForRememberJob` poll is bounded by it. In 0.1.7 only `recall` had
   one (15 s), so a stalled poll could outlive its wait budget.
2. **`recall` tells the relayer its deadline** (`deadline_ms: 14000`). A recall
   the relayer cannot finish now comes back as
   `504 RECALL_TIMEOUT … during seal_decrypt`, naming the stuck stage, where 0.1.7
   aborts on its own clock with a bare `AbortError`.
3. **The remember idempotency key is derived from namespace and text**, in a
   30-minute bucket, instead of a random UUID. Two identical writes within 30
   minutes now become one job and one blob. hippo's resubmit of a failed write
   still works: the relayer (`routes/remember.rs` on `main`, 3182c16) resets a
   `failed` job with no blob and runs it again under the same id. One visible
   difference: if one person repeats a fact before the first write is
   recallable, dedupe cannot see it, and hippo would record two `memory_index`
   rows for one blob, where 0.1.7 paid for two blobs.
4. Polling honours `retry_after_seconds` on a 429. `restore` and `analyze` get a
   60 s deadline. The `withMemWal` middleware changed; hippo does not use it.

## Measurements

All against mainnet, relayer build `5b27683`, the operator account, hippo's own
query shape ("new": the message plus one tag pull).

### 0.1.7, healthy relayer (2026-09-24, 18:13–18:52Z)

| Run | Result | Dropped attempts | Recall, first turn / later / later without corrections |
|---|---|---|---|
| `pnpm demo`, clean clone 1 | all PASS, 5 min 23 s | 0 | 3.1 s / 2.2 s / 1.4 s |
| `pnpm demo`, clean clone 2 | all PASS, 4 min 38 s | 0 | 3.6 s / 2.2 s / 1.1 s |
| `bench:recall`, 10 rounds | new shape median 2.28 s, slowest 3.86 s | 0 | — |

### 0.1.8, as the goal asked (2026-09-25, from about 06:28Z)

| Run | Result | Dropped attempts | Recall, first turn / later / later without corrections |
|---|---|---|---|
| `pnpm demo` 1 | all PASS, 313 s | 0 | 4.1 s / 2.6 s / 1.2 s |
| `pnpm demo` 2 | all PASS, 996 s | 3, plus one `504 RECALL_TIMEOUT … seal_decrypt` | 60.5 s / 36.3 s / 5.6 s |

Run 2 looked like a regression, so the bench was run on both versions back to
back, to separate the SDK from the relayer's hour.

### Both, back to back, same namespace (2026-09-25, 06:54–07:31Z)

The first attempt ended at the first failure in every run, on 0.1.7 as much as
0.1.8: 0.1.8 on `504 RECALL_TIMEOUT … during seal_decrypt`, 0.1.7 on its own
`AbortError`. So the bench now counts a failed recall, times it to the failure,
and goes on. Then, ten rounds each (20 recalls of the new shape, 40 of the old):

| Order | SDK | New shape median | Slowest | Recalls failed (all shapes) | Dropped attempts |
|---|---|---|---|---|---|
| A | 0.1.8 | 18.62 s | 74.62 s | 2 / 60 | 3 |
| B | 0.1.7 | 14.26 s | 40.06 s | 10 / 60, all `AbortError` | 3 |
| C | 0.1.8 | 12.60 s | 68.32 s | 0 / 60 | 1 |

A two-round probe at 07:32Z on 0.1.7 still gave a 9.25 s median. On this relayer
a recall normally takes about 2 s; `/health` reported `writes: ok` with
`write_ready: false` at 07:00Z.

## Reading it

- **Drops: not more.** 3 and 1 on 0.1.8 against 3 on 0.1.7 in the same
  conditions. The demo's 3 were in the degraded window too.
- **Failures: fewer on 0.1.8.** 0.1.7 cuts a slow recall off at 15 s and loses the
  memory for that turn; 0.1.8 lets the relayer answer or name the stage.
- **Speed: not shown either way.** 0.1.8 was both slower (A) and faster (C) than
  0.1.7 (B) within forty minutes, so the relayer's drift is larger than any
  difference between the SDKs. The goal's bar is "no slower", and a measurement
  that cannot distinguish the two does not clear it.

## Issue drafts it touches

- **01** (dropped recalls): still reproduces on 0.1.8, with 7 dropped attempts
  across its four runs today (0 and 3 in the demos, 3 and 1 in the benches).
  0.1.8 adds one fact: a stalled recall now names its stage, and it was
  `seal_decrypt`, which fits the relayer logging drops as decrypt failures.
  Added to the draft.
- **02** (jobs dying from RPC throttling, on hold): if it returns, a resubmit
  under 0.1.8 restarts the same job rather than minting a new one.
- **06** (rate limits): 0.1.8 honours `retry_after_seconds` while polling. The
  documentation mismatch the draft is about is unchanged.
- **10** (`restore`): re-verified on both versions the same morning with the same
  result; 0.1.8 only raises its client deadline to 60 s.
- 04, 05, 09, 11, 12, 13: not affected.
