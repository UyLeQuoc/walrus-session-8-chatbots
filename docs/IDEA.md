# Idea: "Your memory, not the bot's"

Working codename: **hippo** (hippocampus). Final product name TBD.

## One-line pitch

A chatbot on the web, Telegram and a CLI, with Discord and Slack adapters written and waiting on tokens, where **every user can own their own memory on-chain**. The bot is only a delegate: it reads and writes into the user's own Walrus Memory account, the user can revoke it in one transaction, and the same memory shows up in Claude Code, Cursor, or any other agent the user connects. Talk to it on Telegram in the morning, on the web in the afternoon, in Claude Code at night: same memory.

## Why this can win

The judging rubric (see `BRIEF.md` §3) and prior sessions tell us what the panel rewards:

| Signal from organizers | How hippo answers it |
|---|---|
| "Is memory doing real work, or is it decorative?" | Memory is the product. Recall shapes every answer, and the bot cites which memory it used. Revoking the delegate key makes the bot visibly dumber, on demand. |
| "Projects that all look the same will score lower" (World Cup rules) | Every submission so far uses the cookbook: one operator account, one namespace per user. Nobody has made the **user** the owner. |
| Walrus's own differentiator vs Mem0 / Zep / Letta | On-chain ownership, delegate keys, verifiability, portability. hippo demonstrates all four in one flow. |
| Real users, before/after | Two before/afters: (1) memory off vs on, (2) bot-owned memory vs user-owned memory, including a live revoke → re-grant demo. |
| Article useful to newcomers | The article doubles as the first public tutorial for the "bring your own account" pattern, which the official docs do not cover. |
| Prize stacking | Gemini as primary model (Beyond the Big Two), a long list of SDK frictions surfaced by the BYO-account flow (Bug Bounty), a genuinely novel article (Best Article), and a Show HN / dev.to post (Promo). |

## The user experience

**Guest mode (zero friction).** A developer messages the bot. The bot remembers them in a namespace under the operator's account. Works immediately.

**Owned mode (the wow).** The user runs `/connect`. The bot generates an Ed25519 delegate keypair for that user, then hands them a link to the hippo web page. The page connects a Sui wallet (Slush, or Google via zkLogin), creates a Walrus Memory account if the wallet has none, and signs `add_delegate_key` for the bot's key. **Gas is sponsored by the Walrus relayer**, so the user pays nothing. From that moment the bot writes into the user's account. Existing guest memories are migrated across with one click.

**Ownership is real, and its limits are stated.** Two of them, both measured rather than assumed: a memory can be made unrecallable but never deleted, and the relayer's own recovery tool cannot re-index this account. hippo says both out loud, in the bot and in the article, because a pitch about ownership that hides what you cannot do is worse than one that names it.

**What ownership does give you.**
- `/whoami` shows the user's MemWalAccount object with a Sui explorer link and the delegate key label.
- `/memory` lists what the bot remembers, each with a blob ID.
- `/disconnect` builds a sponsored `remove_delegate_key` transaction. After it lands, the bot cannot decrypt or recall anything. Re-run `/connect` and it all comes back.
- The user opens the Walrus Memory dashboard and sees hippo as a delegate next to their Claude Code key.

**Portable.** The user pastes the same account into Claude Code via the Walrus Memory MCP plugin and asks "what does hippo know about my stack?" It answers from the same memories. Memory the bot wrote on Telegram is now context in the IDE.

**Same person, every channel.** A wallet sign-in on the web resolves to the same person as `/connect` on Telegram, and a `/link` code does it without a wallet at all, so a fact learned in one channel is recalled in every other. Verified web-to-CLI and asserted in `pnpm demo`; a judge can check it with a link and a bot handle in under two minutes.

## What the bot remembers (memory doing real work)

| Type | Example | Recalled when |
|---|---|---|
| `profile` | "Uy prefers pnpm, TypeScript strict, works on Sui + Next.js" | Every session start, and any "how should I…" question |
| `decision` | "Team decided 2026-09-25: use Drizzle, not Prisma" | Architecture and tooling questions |
| `gotcha` | "Vercel AI SDK v6 needs `specificationVersion: 'v3'` in middleware" | When the same library, error, or tool appears |
| `commitment` | "Minh will ship the connect page by Sep 26" | Standups, "what's pending", deadlines |
| `correction` | "Bot was wrong: relayer default is mainnet, not testnet" | Any related question, to avoid repeating the mistake |
| `style` | "Replies in Vietnamese, wants short answers, no emoji" | Every turn, applied to the system prompt. This is the "learn and adapt to the individual" requirement made visible. |

The bot writes proactively using the four-part policy from the official prompt templates (recall first, write proactively, what to skip, which namespace), dedupes before writing, and filters recall by distance so it does not inject filler.

## Before / after story for the article

1. **Day 0, memory off.** Baseline logs. The bot re-asks the stack, re-suggests rejected tools, forgets commitments.
2. **Memory on, guest mode.** Same users, same questions. The bot recalls and adapts. Screenshots of "the moment it mattered".
3. **Owned mode.** The user connects a wallet. The bot now writes to the user's account. Demo: revoke the key, watch the bot forget, re-grant, watch it remember. Then open Claude Code and recall the same memory there.

   One caveat to record honestly when this is filmed: revocation is not instant. We measured the relayer still accepting a removed key 15 seconds after it left the chain, and refusing it by 32 seconds, so the demo should say "within about a minute" and the film should not cut the pause. hippo also destroys its own copy of the key on `/disconnect`, which closes that window on its side at once. See `docs/evidence/revocation-2026-09-22.md`.
4. **What broke.** The honest list of SDK frictions, each linked to a GitHub issue.

## Scope guardrails

- Order: core, web and Telegram first, then Discord, then Slack. Core, web and the CLI are done and Telegram is live; Discord and Slack are written and need tokens. Team and shared scope remains stretch, and has not been started.
- The bot holds users' delegate private keys encrypted at rest. This is the standard delegate model (the MCP plugin does the same on the user's machine). Ownership means the user can revoke, not that the bot never sees a key. Say this plainly in the article.
- No self-hosted relayer. Managed mainnet relayer only.

## What changed after building it

Two findings sharpened the pitch rather than weakening it.

**Recall can fail silently.** The relayer sometimes returns an empty result while
reporting that it found and discarded matches. A memory bot that believes that
answer looks like it has amnesia. Handling it is the difference between an eval
that passes repeatably and one that passes sometimes, and it is the most
concrete answer to "is memory doing real work here".

**We accused the relayer of ignoring on-chain access control, and we were
wrong.** Our delegate key was absent from the account's on-chain
`delegate_keys` while the relayer accepted it, and we wrote that up as the
largest finding of the week. The key was on
chain the whole time, on an account in a second mainnet deployment that the
documentation does not mention. We were reading the account from the superseded
one. Chasing it is still the most useful thing the project did, because the
route there surfaced a real defect: `GET /config` publishes a package id and no
registry id, so a client that follows the docs for one and the relayer for the
other silently mixes deployments and gets a real but wrong account back. See
`docs/issues/11`, and `docs/issues/08` for the retraction.

Once the account id was right, the test that had been blocked all along ran in a
minute: remove a delegate key on chain and the relayer refuses it 32 seconds
later. The central claim holds, with a pause that the demo should show rather
than hide. hippo also destroys its own copy of the key on `/disconnect`, which
closes that window immediately.
