# NOT REPRODUCED — The two documented `recall()` call forms return different results

> **Re-verified 2026-09-25** against relayer build `5b27683` (`/health` 0.1.0), SDK 0.1.7 and 0.1.8. **Not reproduced — do not file.**
> Six alternating rounds of both forms on the same namespace returned identical
> results every time (3 results, 0 dropped). The SDK normalises both forms to the
> same request, and the positional form is now `@deprecated`. The original
> observation was almost certainly one of the intermittent all-dropped recalls
> in issue 01 landing on the positional call. Kept for the record.

## Summary

`SKILL.md` documents both call forms:

```
recall({ query, limit?, topK?, namespace?, maxDistance? })   (preferred)
recall(query, limit?, namespace?)
```

Against the same namespace, the same query, seconds apart, they do not agree.

## Repro

```ts
const ns = "spike-recall-bare:s3";
const q = "which package manager should I use?";

await client.recall({ query: q, limit: 3, namespace: ns });
// → 3 memories, distances 0.546 … 0.560

await client.recall(q, 3, ns);
// → {"results": [], "total": 0, "dropped_count": 3}
```

The positional form found the same three matches and discarded every one.

## Expected

The two forms are documented as equivalent, so they should return the same
results. If the positional form is deprecated, say so in `SKILL.md` and in the
SDK's JSDoc rather than leaving it as an advertised alternative.

## Note

This may share a root cause with the `dropped_count` issue filed separately. We
report it separately because it is deterministic here: the object form worked on
every attempt and the positional form failed on every attempt, in the same
minute, against the same data.

## Our workaround

Only the object form is used anywhere in our codebase.
