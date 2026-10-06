# [Bug] restore() reports total: 0 and truncated: false for a namespace that recall still answers from

### Surface

Relayer / hosted API

### Network

Mainnet (relayer.memory.walrus.xyz)

### Package version

`@mysten-incubation/memwal@0.1.8`; relayer `/health` `relayerVersion` 0.1.0. Re-run 2026-10-02 18:51 UTC.

### What happened?

`restore()` is the documented recovery path if the relayer's index is lost. On our mainnet account it finds nothing, or almost nothing, in namespaces whose memories `recall()` returns, and it says so with `truncated: false`, which reads like a complete answer. Not covered by #623 (package migration), #754 (unreadable blobs dropped), #762 (fixed), #1060 (`created_at` reset on restore), #1108 (MCP restore truncates at its default page size with no cursor) or #1086 (`limit` validation): here `total` itself is zero, at every limit, while recall answers from the namespace.

### Steps to reproduce

1. Use an owner with many Walrus `Blob` objects. Ours, owner `0xf8a4da3a751fba566508deb5166196ec5530602a924b3b0c132963e98188fb04` (account `0x5a257802…`), owns **457** `Blob` objects today, and `GET /v1/owners/:owner/memories` lists **384** active memories.
2. Pick a namespace that has memories and call `recall({ query, namespace, limit: 5 })`. It returns results.
3. Call `restore(namespace, limit)` with `limit` 10, 50 and 100.

Script used: `packages/memory/scripts/probe-restore.ts <namespace>` in https://github.com/UyLeQuoc/walrus-session-8-chatbots (recall once, then restore three times). `probe-blob-owner.ts <owner>` counts the owned `Blob` objects.

### Expected

`total` counts the on-chain blobs for `(owner, namespace)`, as the docs define it, so a namespace that recall answers from has `total` of at least its recalled memories. If the owner-wide candidate fetch was capped, the response says so, and `truncated` is not `false`.

### Actual

Namespace 1: recall returns 2 memories, restore sees none.
Namespace 2: recall returns 5 (the limit asked), restore sees 1 and reports it as complete.

`docs/api/memory-read-api.md` already warns that `truncated=false` is not proof the sidecar saw every on-chain blob, because of the owner-wide candidate cap, and mentions a planned `sourceCapped` field (WALM-451). That field is not in the response yet. Our inference, which we cannot confirm from outside: with 457 owned blobs and a cap around 100, a namespace whose blobs fall outside the first page gets `total: 0`. The observable facts do not depend on that: recall works, the read API lists 384 memories, and restore reports zero.

A recovery tool that silently sees nothing is the case it most needs to report.

### Logs or error text

```shell
namespace: hippo-guest:163670a8-1c7f-4ae0-9c3c-58fffbc4846a
recall   : 2 results
restore(limit=10):  {"restored":0,"skipped":0,"failed":0,"total":0,"truncated":true}
restore(limit=50):  {"restored":0,"skipped":0,"failed":0,"total":0,"truncated":false}
restore(limit=100): {"restored":0,"skipped":0,"failed":0,"total":0,"truncated":false}

namespace: spike-recall-bare:s3
recall   : 5 results
restore(limit=10):  {"restored":0,"skipped":0,"failed":0,"total":0,"truncated":true}
restore(limit=50):  {"restored":0,"skipped":1,"failed":0,"total":1,"truncated":false}
restore(limit=100): {"restored":0,"skipped":1,"failed":0,"total":1,"truncated":false}
```

### Checks

- [X] I searched existing issues and this is not a duplicate.
- [X] This report contains no private keys, mnemonics, or other secrets.

<!-- hippo (walrus-session-8-chatbots): first measured 2026-09-22 (197 blobs, read API 125); re-verified 2026-09-25 and 2026-10-02 18:51 UTC with the numbers above. Responses trimmed of the namespace and owner fields, which match the request. -->
