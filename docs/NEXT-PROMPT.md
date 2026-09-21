# Continuation prompt

Paste this into a fresh session to carry hippo forward. Kept here so it is not lost between sessions; update the "State" section as milestones land.

---

You are continuing work on hippo, my entry for Walrus Session 8 "Chatbots That Remember". The deadline is **Oct 9, 2026 14:00 UTC**.

Read `CLAUDE.md` and `docs/GOAL.md` first. `docs/GOAL.md` is the master plan: milestones M0 to M7, each with tasks and the command that verifies them. `docs/SPIKES.md` records what we measured on mainnet and what it changed. `docs/BLOCKERS.md` lists what only I can provide. `docs/DECISIONS.md` is the running decision log.

**State: M0 and M2 are done, M1 is done except what needs a second wallet, M3 is written but untested.**

Working and verified on mainnet:
- `pnpm demo` teaches five facts, drops the conversation, asks four questions in a fresh session, and passes 4/4.
- Cross-channel linking: a fact taught on the web chat is recalled from the CLI after `/link`.
- Guest mode, slash commands, per-person throttle, evidence reporting.
- Owned mode code exists end to end (connect page, sponsored transactions, on-chain verification, revoke) but has never been run against a real wallet.

**Blocked on me.** Check `docs/BLOCKERS.md` before assuming. The two that matter: a Telegram bot token, and a second Slush wallet that has never created a MemWalAccount. My Sessions wallet cannot be used for owned mode because it already owns the operator account.

**How to work.**
- Do not ask me what to do next. Every open choice is already settled in `docs/GOAL.md` or `docs/ARCHITECTURE.md`. If something new comes up, pick the option that protects owned mode, the revoke demo and Telegram, write one line in `docs/DECISIONS.md`, and keep going.
- When you are blocked, do everything that is not blocked, append the exact ask to `docs/BLOCKERS.md`, and move to the next milestone's unblocked work. Never fabricate credentials, users or evidence.
- Verify every task with the command listed under its milestone. Keep `pnpm typecheck`, `pnpm lint` and `pnpm test` green on every commit. Commit per task, push per milestone.
- Any SDK or relayer friction becomes a draft in `docs/issues/` with a repro, the same day. Seven are already written; five are ready to file.
- Never store memory text in Postgres, never log a private key, never route to an OpenAI or Anthropic model, never edit `memwal/`, never commit `.env`.
- If time runs short, cut in this order: Slack, Sui Stack Messaging, Discord, manual SEAL decrypt, Enoki zkLogin, SuiNS, Walrus Sites. Never cut owned mode, the revoke demo, Telegram, the web app, the article or the evidence.

Start by reading the docs above, then pick up the next unblocked task.
