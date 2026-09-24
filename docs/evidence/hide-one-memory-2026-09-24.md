# Hiding one memory

`/memory forget` was all or nothing, and typing it bare erased everything with
no confirmation. Walrus cannot delete or edit a blob, and the relayer can only
forget a whole namespace, so hiding one memory is hippo's own filter: a
`hidden_at` column on `memory_index`, checked on every recall and on dedupe.

## What changed

- `/memory forget <blob>` hides one memory, `/memory unhide <blob>` brings it
  back, and `/memory forget all` is now required to forget everything. Bare
  `/memory forget` prints usage instead of erasing.
- `/me` has a hide / use again control on each row and on search results;
  hidden rows stay visible and marked, rather than looking deleted.
- A hidden memory is also ignored by dedupe. Otherwise restating a hidden fact
  is answered "already known" and stored nowhere hippo can see.
- The export still includes hidden memories, marked: hiding stops hippo using a
  memory, it does not make it stop being the person's.
- Blob prefixes match exactly, not with `LIKE`: blob ids contain `_`, which
  `LIKE` reads as any character. The blob in this run was `MKP2-KVpB_…`.
- `/memory forget all` now forgets the guest namespace too for someone who has
  since taken ownership. It used to forget only the owned account's namespace,
  so what they said as a guest stayed recallable, while `/privacy` and
  `/disconnect` promised otherwise.

## Measured on mainnet, through a local server

```
› I edit everything in VS Code with vim keys.
› Our Redis runs on port 6380.
search: • I edit everything in VS Code with vim keys.  relevance 0.39 · blob MKP2-KVpB_…
forget (no arg): /memory forget <blob>  stop me using one memory: …
forget one: I will not use that profile memory again (blob MKP2-KVpB_…). It is still on Walrus, encrypted, …
ask after hiding: I have no memory of you telling me which editor you use. Would you like to tell me?
search after hiding: • Our Redis runs on port 6380. …
say it again: Got it. You use VS Code with Vim keybindings.
rows: profile, gotcha, profile(hidden)          ← the restated fact was stored
unhide: I will use that profile memory again (blob MKP2-KVpB_…).
export: {"memories":3,"withText":3,"verified":3,…}
```

## What it cannot do

The blob stays on Walrus, and in owned mode any other app signed in to the
person's account can still recall it. Both the chat reply and the page say so.

## Deployed

The owner approved the column in chat. The plan against production, printed
before anything was applied:

```
statements: 1, data loss: false
  ALTER TABLE "memory_index" ADD COLUMN "hidden_at" timestamp with time zone;
plan is purely additive
applied
```

and a re-plan afterwards showed `statements: 0`. The server and web were
deployed after the column existed, never before. On production, without
writing any memory:

```
GET  /api/me/memories                       → {"memories":[]}  [200]
POST /api/me/memories/visibility (unknown)  → {"error":"No memory of yours has that blob."}  [404]
/memory forget  (bare)                       → usage, not an erase
```

`drizzle-kit push` itself could not be used as written in `railway.toml`: its
confirmation prompt needs a TTY, and its programmatic `pushSchema` reads
`result.rows`, the node-postgres shape, which postgres-js does not return, so the
schema pull failed and drizzle-kit exited 1 with the error swallowed.
`packages/db/scripts/plan-push.ts` adapts the result shape, prints the plan, and
applies only additive statements.
