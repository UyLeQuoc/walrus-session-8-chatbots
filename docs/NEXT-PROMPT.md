# Continuation prompt

Paste this into a fresh session to carry hippo forward. Kept here so it is not lost between sessions; update the "State" section as milestones land.

---

You are continuing work on hippo, my entry for Walrus Session 8 "Chatbots That Remember". The deadline is **Oct 9, 2026 14:00 UTC**.

Read `CLAUDE.md` and `docs/GOAL.md` first. `docs/GOAL.md` is the master plan: milestones M0 to M7, each with tasks and the command that verifies them. `docs/SPIKES.md` records what we measured on mainnet and what it changed. `docs/BLOCKERS.md` lists what only I can provide. `docs/DECISIONS.md` is the running decision log.

**State: M0, M1, M2 and M5 are effectively done. M3 is written but untested against a real wallet. M4, M6 and M7 wait on inputs only I can give.**

Working and verified on mainnet:
- `pnpm demo` teaches five facts, drops the conversation, asks four questions in a fresh session, and adds a cross-channel check. It passes.
- Cross-channel linking without a wallet: a fact taught on the web chat is recalled from the CLI after `/link <code>`. Wallet sign-in performs the same merge through a stronger proof.
- Guest mode, slash commands, per-person throttle, `/me` with real blob links, evidence reporting.
- A clean clone runs from the README alone: install, db:push, typecheck, test, build, smoke. Transcript in `docs/evidence/clean-clone-2026-09-21.md`.
- Owned mode code exists end to end (connect page, sponsored transactions, on-chain verification, revoke) but has never been run against a real wallet.

Eight findings are written up with repros in `docs/issues/`. The two that changed the design:
- `recall()` can return an empty list while reporting it found and discarded matches, so hippo retries before believing an empty result.
- The relayer honours a delegate key that is absent from the account's on-chain `delegate_keys`, so "revoke on chain and the bot forgets" is unproven. hippo therefore deletes its own copy of the key on revoke, which makes the revoke true regardless.

**Blocked on me.** Read `docs/BLOCKERS.md` first; it is current. The three that matter, in order:
1. An owner-signed revocation test on the Sessions wallet. This is the highest-risk unknown in the project, not a nice-to-have.
2. A Telegram bot token. The adapter is written and typechecked but has never run.
3. A second Slush wallet with no MemWalAccount, for the owned-mode and revoke demos.

**How to work.**
- Do not ask me what to do next. Every open choice is already settled in `docs/GOAL.md` or `docs/ARCHITECTURE.md`. If something new comes up, pick the option that protects owned mode, the revoke demo and Telegram, write one line in `docs/DECISIONS.md`, and keep going.
- When you are blocked, do everything that is not blocked, append the exact ask to `docs/BLOCKERS.md`, and move to the next milestone's unblocked work. Never fabricate credentials, users or evidence.
- Verify every task with the command listed under its milestone. Keep `pnpm typecheck`, `pnpm lint` and `pnpm test` green on every commit. Commit per task, push per milestone.
- Any SDK or relayer friction becomes a draft in `docs/issues/` with a repro, the same day. Seven are already written; five are ready to file.
- Never store memory text in Postgres, never log a private key, never route to an OpenAI or Anthropic model, never edit `memwal/`, never commit `.env`.
- If time runs short, cut in this order: Slack, Sui Stack Messaging, Discord, manual SEAL decrypt, Enoki zkLogin, SuiNS, Walrus Sites. Never cut owned mode, the revoke demo, Telegram, the web app, the article or the evidence.

Start by reading the docs above, then pick up the next unblocked task.
