# Idea: "Your memory, not the bot's"

Working codename: **hippo** (hippocampus). Final product name TBD.

## One-line pitch

A chatbot that lives on the web, Telegram, Discord and Slack at once, where **every user owns their own memory on-chain**. The bot is only a delegate: it reads and writes into the user's own Walrus Memory account, the user can revoke it in one transaction, and the same memory shows up in Claude Code, Cursor, or any other agent the user connects. Talk to it on Telegram in the morning, on the web in the afternoon, in Claude Code at night: same memory.

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

**Ownership is real, not a slogan.**
- `/whoami` shows the user's MemWalAccount object with a Sui explorer link and the delegate key label.
- `/memory` lists what the bot remembers, each with a blob ID.
- `/disconnect` builds a sponsored `remove_delegate_key` transaction. After it lands, the bot cannot decrypt or recall anything. Re-run `/connect` and it all comes back.
- The user opens the Walrus Memory dashboard and sees hippo as a delegate next to their Claude Code key.

**Portable.** The user pastes the same account into Claude Code via the Walrus Memory MCP plugin and asks "what does hippo know about my stack?" It answers from the same memories. Memory the bot wrote on Telegram is now context in the IDE.

**Same person, every channel.** `/connect` on Telegram and a wallet sign-in on the web resolve to the same person, so a fact learned in one channel is recalled in all of them. Judges can verify this with a link and a bot handle in under two minutes.

## What the bot remembers (memory doing real work)

| Type | Example | Recalled when |
|---|---|---|
| `profile` | "Uy prefers pnpm, TypeScript strict, works on Sui + Next.js" | Every session start, and any "how should I…" question |
| `decision` | "Team decided 2026-09-25: use Drizzle, not Prisma" | Architecture and tooling questions |
| `gotcha` | "Vercel AI SDK v6 needs `specificationVersion: 'v3'` in middleware" | When the same library, error, or tool appears |
| `commitment` | "Minh will ship the connect page by Sep 26" | Standups, "what's pending", deadlines |
| `correction` | "Bot was wrong: relayer default is mainnet, not testnet" | Any related question, to avoid repeating the mistake |

The bot writes proactively using the four-part policy from the official prompt templates (recall first, write proactively, what to skip, which namespace), dedupes before writing, and filters recall by distance so it does not inject filler.

## Before / after story for the article

1. **Day 0, memory off.** Baseline logs. The bot re-asks the stack, re-suggests rejected tools, forgets commitments.
2. **Memory on, guest mode.** Same users, same questions. The bot recalls and adapts. Screenshots of "the moment it mattered".
3. **Owned mode.** The user connects a wallet. The bot now writes to the user's account. Demo: revoke the key, watch the bot forget, re-grant, watch it remember. Then open Claude Code and recall the same memory there.
4. **What broke.** The honest list of SDK frictions, each linked to a GitHub issue.

## Scope guardrails

- Order: core + web + Telegram first (by Sep 26), Discord second (one day, the adapter is thin), Slack third if time allows. Team/shared scope is stretch.
- The bot holds users' delegate private keys encrypted at rest. This is the standard delegate model (the MCP plugin does the same on the user's machine). Ownership means the user can revoke, not that the bot never sees a key. Say this plainly in the article.
- No self-hosted relayer. Managed mainnet relayer only.
