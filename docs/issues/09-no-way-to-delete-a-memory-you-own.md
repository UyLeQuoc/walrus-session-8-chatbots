# There is no way to permanently delete a memory, even as the account owner

## Summary

`POST /api/forget` removes vector index rows for a namespace, which makes those
memories unrecallable. The encrypted blobs stay on Walrus until their storage
epochs expire. Nothing in the relayer API or either SDK deletes a current blob.

The Security Delete API looks like the answer and is not. Its own first lines:

> The Security Delete API permanently deletes legacy Walrus Blob objects that
> were tracked in MemWal's old-V1 database.
>
> This API never enrolls caller-supplied blobs into the legacy tracking set.

It is migration cleanup for blobs written before the July 2026 cutover. A memory
written today is never in that set. `GET /config` reporting
`securityDeleteEnabled: true` on mainnet therefore does not mean a user can
delete their own memories, which is how we first read it.

## Why this matters more than it looks

The ownership model is the product. `docs/fundamentals/concepts/ownership-and-access.md`
says memory is "cryptographically owned by a user", that the owner has full
control, and that this "opens the door to future capabilities like a memory
marketplace, where users could transfer memories". Owners can add delegates,
remove delegates, freeze the account and decrypt anything. They cannot delete.

For an application built on that promise this is awkward to explain. Ours is a
chatbot whose pitch is that the user owns their memory and can revoke the bot.
When a user asks it to forget something, the honest answer is: nobody can read it
without your keys and I can no longer find it, but it is still there, and it will
be until the epochs run out. That is a reasonable position for immutable storage
to take. It is not the position the documentation sets up.

It also interacts with the epoch question. `GET /v1/owners/:owner/memories`
returns `expires_at`, so the storage does end, but a user who wants something
gone today has no lever at all.

## Expected

One of:

1. A per-memory or per-namespace delete that burns the Walrus blob, owner-signed
   and sponsored the way `add_delegate_key` already is. The contract has the
   ownership model for it; `delete_blob` exists in the Walrus package.
2. Failing that, a clear statement in the ownership docs that deletion is not
   part of the model, so builders describe it correctly to their users, and a
   note in the Security Delete doc's summary that it covers legacy blobs only.

## Smaller ask that would have saved us the confusion

`securityDeleteEnabled` in `GET /config` reads like a capability flag for the
account. Renaming it, or documenting it as "legacy blob cleanup is exposed on
this deployment", would stop the next person concluding what we did.
