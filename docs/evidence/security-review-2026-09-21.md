# Security review — 2026-09-21

An adversarial review of `apps/` and `packages/` before the repo goes in front of
judges and strangers clone it. Threat model: users' Ed25519 delegate private
keys, the sponsored-transaction connect flow, a public unauthenticated chat
endpoint, and cross-user memory isolation.

## Fixed

**Unauthenticated takeover of an owned-mode user's memory.** The connect
callback took `walletAddress` from the request body and used it to merge
persons. An attacker who completed the flow honestly with their own account,
which is free because gas is sponsored, could POST a victim's wallet address and
have the victim's person folded into their own session, handing over the
victim's delegate key and memories. The wallet is now read from the account
object on chain (`readAccount().owner`) and the body field is gone. An attacker
cannot produce an account whose on-chain owner is somebody else.

Fixed alongside it: after a merge the code still updated `row.personId`, which
the merge had deleted, so a legitimate second-channel connect never actually
switched the user to owned mode.

**`/memory forget` reported success without deleting anything.** Metadata calls
were signed with the operator key while carrying the user's account id. Because a
mismatched `x-account-id` is silently repaired to whatever the signing key
resolves to (our own `docs/issues/05`), the forget landed on the operator's
account. The user was told their memory was unrecallable when it was not. Those
calls now use the same credential as the memory port.

**Slash commands bypassed the rate limiter.** `/connect` mints a keypair and two
rows, `/memory search` spends the shared relayer budget, and neither was gated or
counted. The rate check now runs before command handling and commands record a
row so they count against the same budget. Verified: the eleventh command in a
minute is refused.

**Style memories reached the system prompt.** Recalled `style` text was
interpolated raw into the system prompt, outside the nonce boundary. In owned
mode that namespace is shared with every other client on the account, which is
the whole point of the Claude Code story, so another client could have planted
system-prompt text. The prompt now only says to look for `[style]` memories
inside the untrusted block.

**Token claims were not atomic**, and **249 turbo cache files were tracked** and
leaked local absolute paths. Both fixed.

## Checked and sound

- **AES-256-GCM** for delegate keys at rest: fresh 12-byte IV per call so no
  reuse, auth tag applied before `final()` so forgeries throw, key length
  validated, and `KEY_ENCRYPTION_KEY` constrained to 64 hex at startup.
- **Keys never escape.** `decryptSecret` has one caller, feeding the request
  signer. Not logged, not returned, not in any prompt. The connect page receives
  only the public key.
- **Revoke destroys the key**, it does not merely flag it, and the memory port
  refuses to build without one.
- **Namespaces are never user-controlled.** Guest is derived from a database
  UUID, owned is a constant inside the user's own account. No request field
  reaches a namespace.
- **CORS** is an exact-match allowlist with no reflection and no wildcard.
- **CSRF** on the chat endpoint: the session cookie is `httpOnly`, `SameSite=Lax`
  and `secure` in production, so a cross-site POST arrives with no cookie and
  acts on a fresh stranger, not the victim.
- **The untrusted-memory boundary** uses a 128-bit random nonce per call, with
  each record JSON-encoded, so recalled text cannot break out of the block.
- **Secrets hygiene**: `.env` has never been committed, `.env.example` holds
  placeholders, and the 64-hex value that appears in the docs is the delegate
  *public* key, which the submission form asks to publish.

## Hardened afterwards

While writing tests for the verification path, two more things got tightened.

**`readAccount` now checks the object's type.** The connect callback takes the
user's wallet from `readAccount(...).owner`, and many unrelated Sui objects have
an `owner` field. Without a type check, a caller could name one of those and have
its owner treated as their wallet. The delegate-membership check made that
unexploitable in practice, since the wrong object lists no matching delegate, but
relying on a second check to save the first is how bugs survive refactors. It now
returns null for anything that is not a `MemWalAccount`.

**The path has tests against mainnet**, in `packages/memory/src/registry.test.ts`:
a key that is genuinely on chain verifies true, an absent key verifies false, a
`0x`-prefixed upper-case key still verifies, a real object of the wrong type
returns null, and a non-existent object returns null. They read the live account
rather than a mock, because the point of the check is that the chain is the
authority. They skip themselves when credentials are absent, so a fresh clone
still passes.

## Built after the review, with its findings in mind

**Wallet sign-in** (`apps/server/src/auth.ts`) was written the opposite way round
from the connect callback the review faulted. The server issues the nonce, the
address is recovered from the signature, and no request field names an identity.
The nonce is burned in a guarded update before any other work, so two concurrent
requests cannot both succeed. Verified end to end with a throwaway keypair:
`pnpm --filter @hippo/server probe:signin` checks that a valid signature opens a
session, a replayed nonce is refused, a signature over a different challenge is
refused, and signing out really closes the session. Five unit tests cover the
signature helper, including that a signature over one nonce does not verify
against another.

## Also found later, by tests

Render tests added on 2026-09-22 caught a denial-of-self on `/me`: an unexpected
response shape from the memories endpoint set state to `undefined`, and the next
render threw on `.filter`, blanking the page. Not a security issue, but the same
class as trusting a payload's shape, and now guarded.

## Accepted for now

**A link code is a one-message takeover if a user is tricked into redeeming
one.** Whoever issues a code wins the merge, so "type `/link ABC123` to verify"
would hand over an account.

Now mitigated properly rather than with a warning: redemption is refused when the
redeeming conversation already has memories of its own. The real use case is
always a fresh channel joining an existing memory, so the restriction costs
nothing, and a phishing target with anything to lose is exactly the case it
blocks. The message tells them to run `/link` from the other side instead. The
warning line in the code's own message stays.

**Connect tokens appear in request logs.** Private logs, ten-minute single-use
tokens. Noted rather than fixed.
