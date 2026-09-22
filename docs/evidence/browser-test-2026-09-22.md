# Browser test of production — 2026-09-22

Driven through a real Chrome against https://hippo-web-ten-nu.vercel.app. The
pages had only ever been rendered in jsdom before this, and two production-only
bugs surfaced immediately. Both are the kind that only appear once the app is on
a real domain.

## The bug that made the bot look like it had amnesia

Taught it three facts, reloaded, asked. It answered:

> I have not been told your cat's name or your preferred package manager.

The database explained it: **nine guest persons, almost all with zero memories**.
Every request was arriving as a brand new person.

The cause is not CORS, which I had already checked. The session cookie is
`SameSite=Lax`, and the browser will not send a `Lax` cookie on a cross-site
request. The page was on `vercel.app` and the API on `railway.app`, which are
different sites, so the cookie was set and never came back. Locally both were
`localhost`, so nothing showed.

The fix keeps the security model rather than trading it away: `apps/web/vercel.json`
now rewrites `/api/*` to the Railway service, so the API is same-origin and
`SameSite=Lax` stays a real CSRF defence. Switching the cookie to `SameSite=None`
would also have worked and would have removed the protection the security review
was relying on.

## The bug where a duplicate check took the feature down

Next attempt:

> I'm sorry, I couldn't store that information. Walrus Memory is temporarily unavailable.

From the logs:

```
[memory] recall failed Error: Walrus Memory temporarily cannot verify credentials
(upstream unavailable). Retry; this is not a sign-in failure.
```

The relayer could not reach its own Sui RPC to verify our delegate key. That
error hit the **dedupe check** that runs before every write, the error
propagated, and the write never happened. A duplicate check, an optimisation,
was a precondition for remembering anything.

Two fixes. The dedupe is now best-effort: if the check cannot run, write anyway,
because a duplicate memory is a far smaller problem than a lost one. And this
class of upstream failure joins 429 in the retryable set.

## After the fixes

```
[fresh page]  "Remember: I am Uy, my cat is called Banh Mi, and I only use pnpm."
              → remembering [profile] I am Uy
                remembering [profile] my cat is called Banh Mi
                remembering [profile] I only use pnpm
              → all three reached Walrus: Ur_vUm2QFl…  w9FF7eVIOk…  WvOUsd-1Mk…

[reload, empty conversation]
              "What is my cat called and which package manager do I use?"
              → "Your cat is named Banh Mi and you use pnpm."
              → recalled 3 memories, expandable, each linked to its Walrus blob
```

`/me` shows mode guest, `3 of 3` stored on Walrus, the three memories with both a
blob link and a ciphertext link, the Claude Code steps, and the wallet sign-in
box. Screenshot: `docs/evidence/screenshots/me-page-2026-09-22.jpg`.

## Smaller things fixed along the way

- The memory-write indicator said `remembered …` and nothing else, because the
  tool result shape had changed and the page still read the old field. It now
  says what it is remembering: `remembering [profile] my cat is called Banh Mi`.
- Two Telegram `409 Conflict` errors appeared in the logs during the deploy
  window, where the old container was still polling as the new one started. Only
  during a deploy, and `railway.toml` pins one replica.
