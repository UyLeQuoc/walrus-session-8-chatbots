# `restore()` reports `total: 0` and `truncated: false` for a namespace that has memories

## Summary

`restore()` is the documented recovery path when the relayer's vector index is
lost: the memories are on Walrus, and restore re-indexes them. On our mainnet
account it sees nothing at all, and says so in a way that reads like success.

```
namespace: hippo-guest:163670a8-1c7f-4ae0-9c3c-58fffbc4846a
recall   : 2 results          ← the index currently holds these

restore(limit=10):  {"restored":0,"skipped":0,"failed":0,"total":0,"truncated":true}
restore(limit=50):  {"restored":0,"skipped":0,"failed":0,"total":0,"truncated":false}
restore(limit=100): {"restored":0,"skipped":0,"failed":0,"total":0,"truncated":false}
```

`total` is documented as "all on-chain blobs the relayer saw for `(owner,
namespace)` before the limit was applied". Zero, for a namespace whose memories
`recall` returns right now. `skipped` is also zero, where already-indexed blobs
should land.

The owner does own the blobs. Listing owned objects for
`0xf8a4da3a751fba566508deb5166196ec5530602a924b3b0c132963e98188fb04` returns
**197 Walrus `Blob` objects**, so this is not a case of the relayer keeping blob
ownership.

**Sharper still: your own read API sees 125 of these memories.**
`GET /v1/owners/:owner/memories` returns 125 rows for this owner, all
`status: "active"`, 89 of them with a resolved `end_epoch` and `expires_at`
running to March and April 2027. So one relayer endpoint enumerates 125 live
memories for the owner while another reports that it can see zero on chain for
the same owner. Whatever the cause, those two answers cannot both be describing
the same account.

## Why we think the candidate cap is involved

`docs/api/memory-read-api.md` and the `restore` notes already describe the
mechanism and its blind spot:

> `truncated=false` is **not** proof the sidecar saw every onchain blob; blobs
> beyond the owner-wide sidecar candidate cap can still be missing. WALM-451
> tracks a `sourceCapped` field for that case.

The cap is described as 100. This account owns 197 blobs. If the owner-wide
candidate fetch takes the first 100 and our namespace's blobs are not among
them, `total: 0` follows, and `truncated: false` at `limit >= 20` follows too,
because truncation is then computed from the missing-blob page length rather
than from anything on chain.

We cannot see the server, so treat the mechanism as our inference. The
observable facts are not inference: 197 blobs owned, recall working, restore
reporting zero with `truncated: false`.

## Why it matters

Restore is the answer to the obvious question about this architecture: if the
relayer's database goes away, is my memory gone? The documented answer is no,
run restore. On an account with a normal amount of history, restore currently
reports that there is nothing to restore, and nothing in the response tells the
caller that its view was truncated. A recovery tool that silently sees nothing
is worse than one that errors.

It also undercuts a claim builders repeat, us included: that memory on Walrus
survives the relayer. It may, but not through this endpoint on this account.

## Expected

1. `total` reflects the on-chain blobs for the namespace, or the response says
   the candidate set was capped. Landing `sourceCapped` (WALM-451) would be
   enough to stop a caller misreading this.
2. `truncated: false` should not be returned when the candidate fetch was
   capped.
3. Ideally, restore takes a namespace-scoped path rather than an owner-wide scan,
   so an account's total blob count does not determine whether a small namespace
   can be recovered.

## Repro

```bash
# an account with more than ~100 owned Blob objects, and a namespace with memories
pnpm --filter @hippo/memory exec tsx scripts/probe-restore.ts <namespace>
pnpm --filter @hippo/memory exec tsx scripts/probe-blob-owner.ts <owner-address>
```

The first prints recall working and restore reporting zero. The second prints the
owned `Blob` count.
