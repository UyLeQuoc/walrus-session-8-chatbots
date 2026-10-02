# [Bug] The delete guides promise permanent deletion of your memories through the Security Delete API, which only deletes legacy V1 blobs

### Surface

Docs

### Network

Mainnet (relayer.memory.walrus.xyz)

### Package version

Docs at `main` `1e023585` (2026-10-02). Relayer `/health`: `relayerVersion` 0.1.0; `GET /config` reports `securityDeleteEnabled: true`. SDK `@mysten-incubation/memwal@0.1.8`.

### What happened?

The guides tell an owner they can permanently delete their memories, from the dashboard or through the Security Delete API. The Security Delete API's own reference says it deletes only legacy blobs from the old V1 database and never accepts caller-supplied ones, so a memory written today cannot be deleted that way. We built a "forget" feature on the guide's promise and had to tell users the opposite. #1043 and #1030 ask how to delete; this report is about the docs telling builders it already works.

### Steps to reproduce

1. Read `docs/guides/manage-your-memory.md`, "Delete memories", lines 84–90: "Deletion permanently removes a memory from Walrus Memory", and "**Programmatic:** The Security Delete API finds memories older than a cutoff, prepares a sponsored transaction, and deletes them in batches". `docs/guides/delete-memories-programmatically.md` says the same in its description and at line 41.
2. Read `docs/api/security-delete.md`, lines 3–10: "permanently deletes legacy Walrus Blob objects that were tracked in MemWal's old-V1 database", and "This API never enrolls caller-supplied blobs into the legacy tracking set".
3. Write a memory with `remember()` today, then look for any route, SDK method or dashboard flow that deletes its Walrus blob. `POST /api/forget` removes vector index rows only; the blob stays until its storage epochs end.
4. `SKILL.md` line 345 advises: "If you need uniqueness, either dedupe before calling `remember()`, or delete the prior entry first." There is no way to delete a current entry.

### Expected

The ownership and delete guides say what an owner can and cannot do with a memory written today: index removal with `forget`, no blob deletion, storage that ends when its epochs run out. The Security Delete pages say in their first line that they cover legacy V1 blobs only. `SKILL.md` stops recommending a deletion that cannot be done. Separately, if per-memory deletion is planned (#1043, #1030), the guides could point there.

### Actual

`manage-your-memory.md` and `delete-memories-programmatically.md` present Security Delete as the way to permanently delete your memories, `GET /config` reports `securityDeleteEnabled: true`, which reads like a capability of the account, and `SKILL.md` tells agents to delete prior entries. A builder reading those reasonably promises users deletion that the system does not provide for current memories.

### Logs or error text

```shell
docs/guides/manage-your-memory.md:84  Deletion permanently removes a memory from Walrus Memory.
docs/guides/manage-your-memory.md:87  The Security Delete API finds memories older than a cutoff ... and deletes them in batches
docs/api/security-delete.md:3        The Security Delete API permanently deletes legacy Walrus Blob objects that
docs/api/security-delete.md:4        were tracked in MemWal's old-V1 database.
docs/api/security-delete.md:8        This API never enrolls caller-supplied blobs into the legacy tracking set
SKILL.md:345                          ... or delete the prior entry first.
```

### Checks

- [X] I searched existing issues and this is not a duplicate.
- [X] This report contains no private keys, mnemonics, or other secrets.

<!-- hippo (walrus-session-8-chatbots): first noted 2026-09-22; reframed 2026-10-03 from a feature request into a docs contradiction because #258, #444, #697, #1030, #1043 and #1061 already ask for deletion. Lines checked on main 1e023585. -->
