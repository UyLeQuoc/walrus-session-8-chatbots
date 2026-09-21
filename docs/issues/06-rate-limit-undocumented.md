# Write rate limit is 60/min, not the documented 30/min, and the weights are unpublished

## Summary

`docs/api/memory-read-api.md` describes the write path as bounded by "the 30/min
per-delegate-key budget". The managed mainnet relayer actually returns:

```json
{"error":"Rate limit exceeded","layer":"delegate_key","limit":"60 weighted-requests/min","retry_after_seconds":60}
```

Neither number is usable on its own, because the budget is spent in *weighted*
requests and the weights are not published for the write path. The read API doc
lists weights for its three routes (1, 1, 2); the write routes have none.

## Why it matters

The official multi-tenant cookbook (`docs/sdk/cookbook-multi-tenant.md`) has one
operator account and one delegate key serving every end user. That is the
recommended architecture, and it means a single shared budget. Without knowing
what a `remember` costs relative to a `recall`, an app cannot pace itself, and
the first symptom is one user's burst returning `429` for everybody.

Our own dedupe design makes this concrete: each `remember` is preceded by a
`recall`, so we cannot even count our own requests without knowing the weights.

## Asks

1. Correct the documented limit.
2. Publish the weights for `/api/remember`, `/api/remember/bulk`, `/api/recall`,
   `/api/analyze`, `/api/restore`.
3. Consider returning the remaining budget in a response header, the way most
   APIs do, so clients can pace without guessing.

## Our workaround

`packages/memory/src/limiter.ts` paces every call per delegate key at 50/min with
concurrency 4, and honours `retry_after_seconds` on a `429`.
