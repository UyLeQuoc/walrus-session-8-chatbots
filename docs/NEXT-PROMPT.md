# Continuation prompt

Two forms of the same brief. Update the State line in both as milestones land.

- **Short form** below fits the `/goal` command, which caps at 4000 characters.
- **Long form** further down is for pasting into a fresh session, where there is no limit.

## Short form, for `/goal`

```
Continue hippo, my entry for Walrus Session 8 "Chatbots That Remember". Deadline Oct 9, 2026 14:00 UTC.

Read CLAUDE.md and docs/GOAL.md first. GOAL.md is the master plan, every milestone marked with its real status, and docs/AUDIT.md checks each task against the codebase: read it before concluding unblocked work is exhausted, because auditing has turned up real gaps every time. docs/SPIKES.md is what we measured on mainnet. docs/BLOCKERS.md is what only I can provide. docs/DECISIONS.md is the decision log. docs/RUNBOOK.md is how to run the real-use week. docs/DEPLOY.md is the deployment.

State (2026-09-22): live in production. Web https://hippo-web-ten-nu.vercel.app, API https://hippo-server-production.up.railway.app, database on Neon, Telegram @walrussession8_bot polling from production. M0, M1, M2, M5 done. M3 written and security-reviewed; its wallet flow has never run. M4 partly done. M6 can start the moment somebody messages the bot. M7 is drafted.

Verified in a real browser against production: teach three facts, reload, ask, and it answers from Walrus with the recalled memories shown and linked to their blobs. pnpm demo asserts cross-session recall, style adaptation and cross-channel recall. pnpm diagnose reports config and chain-versus-relayer disagreements. CI runs lint, typecheck, 29 tests, the web build and pnpm audit.

Blocked on me, in order of risk.
1. An owner-signed revocation test on the Sessions wallet. Highest-risk unknown: the relayer honours a delegate key the chain does not list, so "revoke on chain and the bot forgets" is unproven.
2. Message @walrussession8_bot, then send the invites in docs/RUNBOOK.md, with the /memory off baseline day first. The bot has never received a message.
3. A second Slush wallet with no MemWalAccount, for the owned-mode and revoke demos.

Ten findings are written up in docs/issues/ with repros, filed by scripts/file-issues.sh. Four shape the design:
- recall() can return empty while reporting it found and discarded matches. Do not try to prevent this on the client: six runs gave 4, 9, 0, 15, 0 and 2 drops with no pattern, I wrongly blamed concurrency and had to retract it. Only retrying helps.
- The relayer honours a delegate key absent from the on-chain delegate_keys, so /disconnect destroys hippo's own copy of the key.
- There is no way to delete a memory you own, and restore() cannot re-index this account.
- Production taught two more: a SameSite=Lax cookie is not sent cross-site, which made the bot forget everyone until the API was proxied same-origin; and a failed dedupe check was blocking writes entirely, so dedupe is now best-effort.

How to work.
- Do not ask me what to do next. Every open choice is settled in GOAL.md or ARCHITECTURE.md. If something new comes up, pick the option that protects owned mode, the revoke demo and Telegram, write one line in DECISIONS.md, and keep going.
- When blocked, do everything that is not blocked, append the exact ask to BLOCKERS.md, and move on. Never fabricate credentials, users or evidence.
- Keep pnpm typecheck, lint and test green on every commit. Commit per task, push per milestone. Redeploy after a server change: railway up --service hippo-server --ci.
- Any SDK or relayer friction becomes a docs/issues/ draft with a repro, the same day.
- Measure twice before claiming a cause. Never leave a polling loop running against the relayer, and never run the local server while production polls Telegram.
- Never store memory text in Postgres, never log a private key, never route to an OpenAI or Anthropic model, never edit memwal/, never commit .env or .env.production.
- If time runs short, cut in this order: Slack, Sui Stack Messaging, Discord, manual SEAL decrypt, Enoki zkLogin, SuiNS, Walrus Sites. Never cut owned mode, the revoke demo, Telegram, the web app, the article or the evidence.

Start by reading the docs above, then pick up the next unblocked task.
```

## Long form

---

You are continuing work on hippo, my entry for Walrus Session 8 "Chatbots That Remember". The deadline is **Oct 9, 2026 14:00 UTC**.

Read `CLAUDE.md` and `docs/GOAL.md` first. `docs/GOAL.md` is the master plan: milestones M0 to M7, each with tasks and the command that verifies them. `docs/SPIKES.md` records what we measured on mainnet and what it changed. `docs/BLOCKERS.md` lists what only I can provide. `docs/DECISIONS.md` is the running decision log.

**State (2026-09-22): live in production.** Web https://hippo-web-ten-nu.vercel.app, API https://hippo-server-production.up.railway.app, database on Neon, Telegram `@walrussession8_bot` polling from production. M0, M1, M2 and M5 are done. M3 is written and security-reviewed but its wallet flow has never run. M4 is partly done. M6 can start the moment somebody messages the bot. M7 is drafted.

Verified in a real browser against production:
- Teach three facts, reload the page so nothing is left in the conversation, ask again, and it answers from Walrus. Every reply shows the memories it used, expandable, each linked to its encrypted blob.
- `/me` shows the memories with blob and ciphertext links, storage expiry when the relayer has resolved it, the Claude Code steps, and wallet sign-in.

Two production-only bugs surfaced in that browser session and are fixed. Both are written up in `docs/evidence/browser-test-2026-09-22.md`:
- **The bot forgot everyone.** A `SameSite=Lax` cookie is not sent cross-site, and the page was on vercel.app while the API was on railway.app, so every message arrived as a new person. `apps/web/vercel.json` now proxies `/api/*` to Railway, which keeps them same-site and keeps `SameSite=Lax` as a real CSRF defence.
- **A duplicate check was blocking writes.** The relayer failed the dedupe recall with "temporarily cannot verify credentials (upstream unavailable)", the error propagated, and the bot told users it could not remember anything. Dedupe is now best-effort.

Also working and verified:
- `pnpm demo` asserts cross-session recall, style adaptation and cross-channel recall.
- `pnpm diagnose` reports config, chain-versus-relayer disagreements and storage expiry.
- CI runs lint (failing on warnings), typecheck, 29 tests across three packages, the web build and `pnpm audit`, which is clean.
- A clean clone runs from the README alone, and the production image is verified by building and running it, not just building it.
- M7 is drafted and needs editing rather than writing: `docs/article.md`, `docs/promo.md`, `docs/video.md`, `docs/submission.md`.

Ten findings against Walrus Memory are written up with repros in `docs/issues/`, filed with `scripts/file-issues.sh`. The ones that shaped the design:
- `recall()` can return an empty list while reporting it found and discarded matches. **Do not try to prevent this on the client.** Six runs gave 4, 9, 0, 15, 0 and 2 drops with no pattern; I wrongly concluded concurrency was the cause and had to retract it. `docs/SPIKES.md` §H keeps the wrong hypothesis on purpose. Only retrying helps.
- The relayer honours a delegate key absent from the account's on-chain `delegate_keys`, so `/disconnect` destroys hippo's own copy of the key rather than trusting the revoke.
- There is no way to permanently delete a memory you own, and `restore()` cannot re-index this account. Treat the search index as fragile and Walrus as durable.

Checked and found fine, so they are not re-investigated: Vietnamese and cross-language recall (8/8, byte-identical round trip) and storage lifetime (about 210 days, nothing expires before judging).

**Blocked on me.** Read `docs/BLOCKERS.md`; it is current. In order of risk:
1. An owner-signed revocation test on the Sessions wallet. The highest-risk unknown in the project.
2. One message to `@walrussession8_bot`, then the invites in `docs/RUNBOOK.md`, with the `/memory off` baseline day first.
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
