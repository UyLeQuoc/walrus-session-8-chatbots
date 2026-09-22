# Continuation prompt

Two forms of the same brief. Update the State line in both as milestones land.

- **Short form** below fits the `/goal` command, which caps at 4000 characters.
- **Long form** further down is for pasting into a fresh session, where there is no limit.

## Short form, for `/goal`

```
Continue hippo, my entry for Walrus Session 8 "Chatbots That Remember". Deadline Oct 9, 2026 14:00 UTC.

Read CLAUDE.md and docs/GOAL.md first. GOAL.md is the master plan: milestones M0-M7, each marked with its real status. docs/SPIKES.md is what we measured on mainnet and what it changed. docs/BLOCKERS.md is what only I can provide. docs/DECISIONS.md is the decision log. docs/RUNBOOK.md is how to run the real-use week. docs/NEXT-PROMPT.md holds the long version of this brief.

State (2026-09-22): M0, M1, M2, M5 done. M3 written, security-reviewed and tested against mainnet reads, but the wallet flow has never run. M4 partly done: cross-channel linking works and is asserted in the eval; Discord and Slack need tokens. M6 is ready to start. M7 is drafted.

Verified on mainnet: `pnpm demo` asserts cross-session recall, style adaptation and cross-channel recall. `pnpm diagnose` reports config, chain-versus-relayer disagreements and storage expiry. A clean clone runs from the README alone, CI is green and the dependency audit is clean. Telegram is live as @walrussession8_bot, polling with seven commands registered, and has never received a message.

Blocked on me, in order of risk. Read docs/BLOCKERS.md; it is current.
1. An owner-signed revocation test on the Sessions wallet. Highest-risk unknown in the project: the relayer honours a delegate key the chain does not list, so "revoke on chain and the bot forgets" is unproven.
2. Message @walrussession8_bot, then send the invites in docs/RUNBOOK.md. Testing that needs a Telegram account, which the bot API cannot provide.
3. A second Slush wallet with no MemWalAccount, for the owned-mode and revoke demos.

Findings that shape the design, all ten written up in docs/issues/ and filed with scripts/file-issues.sh:
- recall() can return an empty list while reporting it found and discarded matches. Do not try to prevent this on the client: four runs gave 4, 9, 0 and 15 drops with no pattern, I wrongly blamed concurrency and had to retract it, and SPIKES.md keeps the wrong hypothesis on purpose. Only retrying helps.
- The relayer honours a delegate key absent from the on-chain delegate_keys, so /disconnect destroys hippo's own copy of the key rather than trusting the revoke.
- There is no way to delete a memory you own, and restore() cannot re-index this account. Treat the search index as fragile and Walrus as durable.

How to work.
- Do not ask me what to do next. Every open choice is settled in GOAL.md or ARCHITECTURE.md. If something new comes up, pick the option that protects owned mode, the revoke demo and Telegram, write one line in DECISIONS.md, and keep going.
- When blocked, do everything that is not blocked, append the exact ask to BLOCKERS.md, and move on. Never fabricate credentials, users or evidence.
- Keep pnpm typecheck, lint and test green on every commit. Commit per task, push per milestone.
- Any SDK or relayer friction becomes a docs/issues/ draft with a repro, the same day.
- Measure twice before claiming a cause, and never leave a polling loop running against the relayer. One encouraging run in the direction I expected nearly went into the article as a finding.
- Never store memory text in Postgres, never log a private key, never route to an OpenAI or Anthropic model, never edit memwal/, never commit .env.
- If time runs short, cut in this order: Slack, Sui Stack Messaging, Discord, manual SEAL decrypt, Enoki zkLogin, SuiNS, Walrus Sites. Never cut owned mode, the revoke demo, Telegram, the web app, the article or the evidence.

Start by reading the docs above, then pick up the next unblocked task.
```

## Long form

---

You are continuing work on hippo, my entry for Walrus Session 8 "Chatbots That Remember". The deadline is **Oct 9, 2026 14:00 UTC**.

Read `CLAUDE.md` and `docs/GOAL.md` first. `docs/GOAL.md` is the master plan: milestones M0 to M7, each with tasks and the command that verifies them. `docs/SPIKES.md` records what we measured on mainnet and what it changed. `docs/BLOCKERS.md` lists what only I can provide. `docs/DECISIONS.md` is the running decision log.

**State (2026-09-22): M0, M1, M2 and M5 are done. M3 is written, security-reviewed and tested against mainnet reads, but its wallet flow has never run. M4 is partly done. M6 is ready to start. M7 is drafted.**

Working and verified on mainnet:
- `pnpm demo` teaches five facts, drops the conversation, and asserts three things in a fresh session: 4/4 cross-session recall, that a `style` memory changed the reply language unprompted, and that a second channel recalls the same facts. Five runs, all passing.
- `pnpm diagnose` reports what is configured, what works, and where the chain and the relayer disagree. It catches a wrong account id, a stale package id, and a delegate the chain does not list. Exits non-zero when something is broken.
- Cross-channel linking without a wallet: a fact taught on the web chat is recalled from the CLI after `/link <code>`. Wallet sign-in performs the same merge through a stronger proof.
- Telegram is live as `@walrussession8_bot`, polling with seven commands registered. It has never received a message; that needs a Telegram account.
- Guest mode, slash commands, per-person throttle covering commands, `/me` with blob links, storage expiry and wallet sign-in, `/proof`, evidence and restore reporting.
- Wallet sign-in verified end to end with a throwaway keypair (`pnpm --filter @hippo/server probe:signin`): valid signature opens a session, replayed nonce refused, signature over another challenge refused, sign-out closes it. The address is recovered from the signature, never read from the request.
- CI runs lint (failing on warnings), typecheck, test, the web build and `pnpm audit`, plus a guard that `.env`, `memwal/` and `.turbo/` stay untracked. The audit is clean.
- A clean clone runs from the README alone: install, db:push, typecheck, test, build, smoke. Transcript in `docs/evidence/clean-clone-2026-09-21.md`.
- 24 tests, five of them reading the real account on mainnet to cover the verification path that gates owned mode, and five covering wallet signature verification including replay resistance.
- Owned mode code exists end to end (connect page, sponsored transactions, on-chain verification, revoke) but has never been run against a real wallet.
- M7 is drafted and needs editing rather than writing: `docs/article.md`, `docs/promo.md`, `docs/video.md`, `docs/submission.md`, with `[M6]` and `[HUMAN]` marking what is missing. `docs/RUNBOOK.md` has the invite text and consent rules for the real-use week.

A security review of the repo found three real issues, including an unauthenticated takeover in the connect callback. All are fixed, and the verification path now has mainnet tests. Results in `docs/evidence/security-review-2026-09-21.md`.

Ten findings against Walrus Memory are written up with repros in `docs/issues/`, filed with `scripts/file-issues.sh` (dry run first). The four that shaped the design:
- `recall()` can return an empty list while reporting it found and discarded matches, so hippo retries before believing an empty result. **Do not try to prevent this on the client.** Four runs gave 4, 9, 0 and 15 drops with no pattern; I wrongly concluded concurrency was the cause and had to retract it. `docs/SPIKES.md` §H keeps the wrong hypothesis on purpose. Only retrying helps.
- The relayer honours a delegate key that is absent from the account's on-chain `delegate_keys`, so "revoke on chain and the bot forgets" is unproven. `/disconnect` therefore destroys hippo's own copy of the key.
- There is no way to permanently delete a memory you own. `forget` makes it unrecallable and the blob lives out its epochs.
- `restore()` reports seeing zero blobs for namespaces that have memories, while the read API lists 125 for the same owner. Treat the search index as the fragile part and Walrus as the durable one.

Two things checked and found fine, worth knowing so they are not re-investigated: Vietnamese and cross-language recall (8/8, byte-identical round trip) and storage lifetime (about 210 days, nothing expires before judging).

**Blocked on me.** Read `docs/BLOCKERS.md` first; it is current. In order of risk:
1. An owner-signed revocation test on the Sessions wallet. The highest-risk unknown in the project, not a nice-to-have.
2. One message to `@walrussession8_bot`, then the invites in `docs/RUNBOOK.md`.
3. A second Slush wallet with no MemWalAccount, for the owned-mode and revoke demos.

**How to work.**
- Do not ask me what to do next. Every open choice is already settled in `docs/GOAL.md` or `docs/ARCHITECTURE.md`. If something new comes up, pick the option that protects owned mode, the revoke demo and Telegram, write one line in `docs/DECISIONS.md`, and keep going.
- When you are blocked, do everything that is not blocked, append the exact ask to `docs/BLOCKERS.md`, and move to the next milestone's unblocked work. Never fabricate credentials, users or evidence.
- Verify every task with the command listed under its milestone. Keep `pnpm typecheck`, `pnpm lint` and `pnpm test` green on every commit. Commit per task, push per milestone.
- Any SDK or relayer friction becomes a draft in `docs/issues/` with a repro, the same day. Eight are written and ready to file.
- Measure twice before claiming a cause, and never leave a polling loop running against the relayer. One encouraging run in the direction I expected nearly went into the article as a finding; a clean re-run refuted it.
- Never store memory text in Postgres, never log a private key, never route to an OpenAI or Anthropic model, never edit `memwal/`, never commit `.env`.
- If time runs short, cut in this order: Slack, Sui Stack Messaging, Discord, manual SEAL decrypt, Enoki zkLogin, SuiNS, Walrus Sites. Never cut owned mode, the revoke demo, Telegram, the web app, the article or the evidence.

Start by reading the docs above, then pick up the next unblocked task.
