# ON HOLD — `remember` jobs fail with "seal encrypt failed … Too Many Requests" and the memory is lost

> **Re-verified 2026-09-25** against relayer build `5b27683` (`/health` 0.1.0), SDK 0.1.7 and 0.1.8. **On hold: not reproduced since
> 2026-09-21.** No failed write in over a hundred since, across every eval log and
> spike. The relayer added retries for throttled Sui object reads that day
> (MemWal commit `8889578e`, WALM-614, noting "Prod rejects 57% of GetObject with
> Unavailable"), which likely covers it. File only if it recurs.

## Summary

Accepted `remember` jobs finish in a failed state with:

```
remember job failed: Internal Error: seal encrypt failed:
seal/encrypt failed during read_account_identity:
RpcError: Too Many Requests (traceId=051e0826-272e-4…)
```

The relayer's own Sui RPC provider throttles the relayer while it reads the
account identity for SEAL encryption. The user's memory is dropped.

This is not the caller's rate limit: our client was pacing itself under the
delegate-key budget and no `429` was returned to us. The `429` happens between
the relayer and its upstream, and surfaces to us as an opaque `Internal Error`
on a job we were already told had been accepted.

## Expected

The relayer retries its own upstream read, or the job stays queued, or the error
says plainly that this is a transient upstream failure worth resubmitting.

## Actual

`POST /api/remember` returns `202` with a job id. The job later reports failure
with the message above. The write is gone. An agent that told the user "saved"
has now lied to them, and the only way to notice is to poll the job.

## Repro

Write steadily to one account for a few minutes while anything else uses the same
mainnet relayer. In our case:

```bash
bun run demo        # teaches five facts, waits, asks four questions
```

Failed jobs and their error text land in our `memory_index` table:

```sql
select status, error from memory_index where status = 'failed';
```

Trace IDs from our runs: `051e0826-272e-4…`, `0bc90018-537e-4…`.

## Impact and our workaround

We now resubmit a failed write up to three times with exponential backoff, and we
insert the local index row at accept time rather than at blob time, so a crash or
deploy inside the roughly 25-second write window does not lose the record of a
memory the user was already told about.

## Asks

1. Retry the upstream identity read inside the relayer.
2. Distinguish transient upstream failures from permanent ones in the job error.
3. Consider a dedicated or higher-rate Sui RPC endpoint for the SEAL path.
