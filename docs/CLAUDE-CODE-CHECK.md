# The Claude Code check

`docs/GOAL.md` M3 task 9, and the screenshot the article needs. It proves the
claim the whole project rests on: the memory is in your Walrus Memory account,
so another agent reads it through the official Walrus Memory MCP and hippo plays
no part. Only the owner can run it, because two steps need your wallet's
signature. About 15 minutes.

`/me` on https://ask-hippo.vercel.app shows the same steps to every visitor.

## Before you start

- A browser wallet such as Slush, with the address you want to own the memory.
  **Not the Sessions wallet.** It owns `0x5a257802…`, the operator account where
  every guest's memory lives, and both hippo's `/connect` and the dashboard's
  login reuse the account a wallet already owns. Using it would give Claude Code
  a key to every guest's memory. A fresh Slush wallet also serves for filming
  `/connect` (`docs/BLOCKERS.md`).
- **Not Google sign-in:** hippo's Enoki app and the Walrus Memory dashboard derive
  different addresses from the same Google account, so the dashboard would not
  find the account hippo made.
- A little SUI in that wallet, in case sponsorship is refused. Both
  transactions are sponsored when it works: hippo's `/connect`
  (`docs/ARCHITECTURE.md`) and the dashboard's `add_delegate_key`
  (`memwal/apps/app/src/pages/ConnectMcp.tsx`, `useSponsoredTransaction`).
- Claude Code, in an empty folder, so nothing from a project ends up in the
  conversation.

## 1. Own your memory in hippo

1. Open https://ask-hippo.vercel.app with Slush installed.
2. `/me` → connect the wallet and own the memory, or type `/connect` in the chat
   and open the link. Sign. Wait until `/me` says **you own this**.
3. **Now** tell hippo three or four things in a new chat, for example: "I build
   on Sui with TypeScript", "Keep answers short", "The hippo demo is due on
   2026-10-09". Wait until each reads **on Walrus**.

Step 3 matters. What you said as a guest is under hippo's account in
`hippo-guest:<id>`, which your wallet cannot open. hippo keeps reading it for
you, but Claude Code will only see what was written after you connected, in your
account under namespace `hippo`.

## 2. Add Claude Code as a second delegate

1. In Claude Code:
   ```
   /plugin marketplace add MystenLabs/MemWal
   /plugin install memwal@memwal-plugins
   ```
2. Ask: "Log in to Walrus Memory." Claude Code calls `memwal_login`, which opens
   the Walrus Memory dashboard. Connect **the same Slush wallet** and sign. The
   dashboard looks up the account your wallet owns and adds a second key to it.
3. Automatic saving stays off after a login through the tool until you say yes
   in a terminal (`memwal/packages/mcp/AUTO-MEMORY.md`). Leave it off for this
   check, so the only memories in the account are the ones hippo wrote.

**Screenshot A:** reload `/me` on hippo. The delegate list now shows two keys,
hippo's marked, and the one Claude Code added.

## 3. Ask Claude Code

```
What does hippo know about me? Use memwal_recall with namespace "hippo".
```

**Screenshot B:** the answer, with the recalled lines visible. They start with
hippo's tags, such as `[profile] [by:@…] [#web] [2026-10-…]`.

Optional, and it makes the point stronger: ask Claude Code to remember one fact
in hippo's format (`.claude/skills/hippo-memory/SKILL.md`), namespace `hippo`.
Then ask hippo on the web or Telegram about it. Memory written by one agent is
recalled by the other.

## 4. Hand it back

- Save the screenshots as `docs/evidence/claude-code-<date>-delegates.png` and
  `docs/evidence/claude-code-<date>-recall.png`.
- The submission form asks how many agents wrote blobs. With the optional step,
  two did on this account: hippo's key and Claude Code's. `bun run evidence`
  counts only what hippo wrote, from its own index, so say which step ran.
- Tell the agent the account id and which steps ran. It writes
  `docs/evidence/claude-code-<date>.md` and the article paragraph from what you
  saw, not from this plan.

Revoking is a separate check: `/disconnect` removes hippo's key and leaves Claude
Code's, which shows that each delegate is revoked on its own.
