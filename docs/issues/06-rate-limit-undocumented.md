# The documented delegate-key limit is 30/min, the deployed one is 60, and the documented weights disagree with the code

> **Re-verified 2026-09-25** against relayer build `5b27683` (`/health` 0.1.0)
> and MemWal `main` (`3182c16`): docs and code as quoted below. The deployed limit
> of 60 was not re-measured, because tripping it means throttling a delegate key
> that live users share.

## Summary

`docs/relayer/overview.md` says each delegate key "is independently limited to
**30 points / minute**", and `docs/api/memory-read-api.md` repeats "the 30/min
per-delegate-key budget". The managed mainnet relayer, when we tripped it,
answered:

```json
{"error":"Rate limit exceeded","layer":"delegate_key","limit":"60 weighted-requests/min","retry_after_seconds":60}
```

The code's default is 30 (`services/server/src/rate_limit.rs`,
`max_requests_per_delegate_key: 30`), overridable with
`RATE_LIMIT_DELEGATE_KEY_PER_MINUTE`, so the managed deployment appears to set
60 while every doc a developer reads says 30.

The published weights also disagree with the code that applies them:

| endpoint | `docs/relayer/overview.md` | `endpoint_weight()` in `rate_limit.rs` |
|---|---|---|
| `/api/analyze` | 10 | **5** |
| `/api/remember` | 5 | 5 |
| `/api/remember/bulk` | not listed | **10** |
| `/api/restore`, `/api/remember/manual` | 3 | 3 |
| `/api/ask`, `/api/embed` | 2 (ask only) | 2 |
| `/v1/owners/:owner/agents` | not listed | 2 |
| recall and everything else | 1 | 1 |

## Why it matters

The official multi-tenant cookbook (`docs/sdk/cookbook-multi-tenant.md`) has one
operator account and one delegate key serving every end user, so the whole app
shares one budget. A client that paces itself from the docs runs at half the
real ceiling; one that paces from the error message is trusting a number the
docs contradict. And `analyze`, the heaviest call, is priced at half what the
docs say.

## Asks

1. State the managed relayer's actual delegate-key limit in the docs, or
   configure it to match them.
2. Bring the weight list in `docs/relayer/overview.md` in line with
   `endpoint_weight()`, including `remember/bulk` and the owner routes.
3. Consider returning the remaining budget in a response header so clients can
   pace without guessing.

## Our workaround

`packages/memory/src/limiter.ts` paces every call per delegate key at 50/min with
concurrency 2, and honours `retry_after_seconds` on a `429`.
