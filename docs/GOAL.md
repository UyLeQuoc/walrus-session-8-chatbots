# GOAL — end-to-end execution plan for hippo

This is the master instruction for an agent (or a human) to take hippo from the current scaffold to a submitted, prize-competitive entry in Walrus Session 8 without asking for direction. Every decision that can be made in advance is made here. Read `CLAUDE.md` first, then this file, then the milestone you are on.

## Mission

Ship a chatbot that remembers users across web, Telegram, Discord and Slack, where each user can own their memory in their own Walrus Memory account on Sui mainnet and revoke the bot in one transaction. Prove it with real users, a revoke demo, a Claude Code portability demo, an honest article, and filed SDK issues. Submit before **Oct 9, 2026 14:00 UTC**.

## Definition of done (submission level)

All of these are true and verifiable by a stranger:

1. `git clone` → `README.md` five commands → chat works with memory on mainnet.
2. Live web URL and Telegram handle answer within 5 seconds. Discord and Slack work if configured.
3. At least 3 real people, at least 10 memories each, on mainnet, with `pnpm evidence` output committed under `docs/evidence/`.
4. At least one real user in owned mode with their own MemWalAccount, plus a recorded revoke → forget → re-grant → remember sequence.
5. The same memory recalled in Claude Code through the official Walrus Memory MCP plugin, screenshot in the article.
6. Article (500–800 words) published on Medium and Inkray; X post under the session announcement tagging @WalrusProtocol with #WalrusMemory; one promo post outside Walrus/Sui.
7. At least 5 GitHub issues on MystenLabs/MemWal with repro, expected vs actual, environment.
8. Airtable form and DeepSurge submitted; feedback form completed; `docs/PLAN.md` submission checklist fully ticked.

## Operating rules for the executing agent

- **Do not ask; decide.** Every open choice is settled in this file or in `docs/ARCHITECTURE.md`. If something new comes up, pick the option that keeps owned mode, the revoke demo and Telegram intact, write the decision in `docs/DECISIONS.md` with one line of reasoning, and continue.
- **Human inputs are the only blockers.** They are listed in "Inputs from the human". When one is missing, do every task that does not need it, then append the exact ask to `docs/BLOCKERS.md` and move to the next milestone's non-blocked work. Never fabricate credentials, users or evidence.
- **Verify each task with a command** listed under its milestone. A task is done only when its command passes. Paste the command output into the commit message body or `docs/evidence/`.
- **Commit at the end of every task**, push at the end of every milestone. Keep `pnpm typecheck && pnpm lint && pnpm test` green on every commit.
- **Write frictions down as you hit them.** Any SDK, relayer, dashboard or docs friction goes into `docs/PLAN.md` under bug bounty candidates with a repro, the same day.
- **Keep docs true.** When code diverges from `docs/ARCHITECTURE.md`, update the doc in the same commit.
- **Never**: store memory text in Postgres, log a private key, route to an OpenAI or Anthropic model, edit `memwal/`, commit `.env`.
- **Cut order if time runs out**: Slack → Sui Stack Messaging → Discord → manual SEAL decrypt → Enoki zkLogin → SuiNS → Walrus Sites (Vercel stays). Never cut owned mode, revoke, Telegram, web, article, evidence.

## Inputs from the human

| Input | Where it goes | Needed from |
|---|---|---|
| Operator MemWalAccount ID + delegate private key (mainnet, from memory.walrus.xyz, Sessions wallet) | `.env` `MEMWAL_ACCOUNT_ID`, `MEMWAL_PRIVATE_KEY` | M1 |
| OpenRouter API key with credit | `.env` `OPENROUTER_API_KEY` | M1 |
| ~~Telegram bot token~~ **provided 2026-09-22**, `@walrussession8_bot` | `.env` `TELEGRAM_BOT_TOKEN` | M2 |
| Discord app token + client ID, bot invited to a test server | `.env` | M4 |
| Slack app tokens (socket mode) | `.env` | M4 |
| Neon `DATABASE_URL`, Railway project, Vercel project | deploy env | M5 |
| Enoki API key + Google OAuth client ID (optional, zkLogin) | `apps/web/.env` `VITE_ENOKI_API_KEY`, `VITE_GOOGLE_CLIENT_ID` | M3 |
| WAL + SUI in the Sessions wallet for Walrus Sites (optional) | wallet | M5 |
| A second Slush wallet for end-to-end owned-mode tests | tester | M3 |
| 3–5 real users willing to chat daily for a week | Telegram / web | M6 |
| Medium + Inkray + X accounts; DeepSurge registration; Discord joined; Airtable form | human submits, agent drafts everything | M7 |

## Milestones

### M0 — Scaffold (done Sep 22)

See `docs/PLAN.md` "Milestone 0". Verified: typecheck, lint, tests, web build, db push, server health, web page.

### M1 — Spikes and mainnet smoke — DONE except what needs a wallet

Results are in `docs/SPIKES.md`, thirteen entries. Outcomes that changed the design: sponsored calls work from any origin so no proxy is needed; the live package ID differs from the published docs; writes take about 24 s so they are asynchronous; recall silently drops matches so it retries; the metadata prefix costs nothing in recall quality; Security Delete does not apply to current memories; `restore()` does not see this account at all; Vietnamese and cross-language recall work; memories live about 210 days. Spikes 3, 4 and 9 wait on a wallet or an Enoki key.

Original task list:

Goal: remove every technical unknown before building features. Record each result in `docs/SPIKES.md` as `#n — result — evidence — decision`.

Tasks and verification:
1. `pnpm smoke --write` stores and recalls one memory on mainnet. Evidence: blob ID and Suiscan link in `docs/SPIKES.md`.
2. `/sponsor` from a non-Walrus origin: a throwaway page on `localhost:5174` builds `add_delegate_key` for a test wallet and posts to `relayer.memory.walrus.xyz/sponsor`. Pass = 200 with `{bytes, digest}`. Fail = CORS or 4xx → decision: proxy via `apps/server` `/api/sponsor/*`.
3. Full connect on mainnet with a fresh Slush wallet: `create_account` + `add_delegate_key` sponsored, then `remember` with the new key succeeds. Evidence: two tx digests.
4. `remove_delegate_key` sponsored, then the same key gets `401` on `recall`. Evidence: digest + error text. This is the revoke demo's technical proof.
5. Recall quality: 15 Vietnamese and English facts written through the `remember` tool; 10 queries; record precision at distance 0.6. Adjust `maxDistance` defaults if needed.
6. Streaming through Hono works in `curl -N` and in the web page with no buffering.
7. Manual SEAL path (2 h cap): download one blob from a Walrus aggregator and decrypt with the delegate key using `@mysten-incubation/memwal/manual` or `@mysten/seal`. Pass → `/proof` shows raw blobs. Fail → dual-read design, note the friction.
8. Security Delete API on the managed relayer: call the challenge endpoint; record enabled or not.
9. Enoki zkLogin in `apps/web` → sponsored `create_account` for a Google user. Skip if no Enoki key yet; keep Slush path.
10. `site-builder` deploy of the Vite build to Walrus Sites with SPA fallback; page loads and calls the API cross-origin. Skip if no WAL yet.
11. Suiscan and Walruscan links: confirm which URLs render a MemWalAccount object and a blob ID. Put the working patterns in `packages/memory/src/links.ts`.

Exit: `docs/SPIKES.md` has 11 entries; every "decision" is reflected in `docs/ARCHITECTURE.md`.

### M2 — Guest mode complete — DONE

`pnpm demo` asserts three things and passes: 4/4 cross-session recall, style adaptation, and cross-channel recall. Commands, throttle, `pnpm evidence`, `pnpm restore` and `pnpm diagnose` all exist and are verified. Telegram is live and polling as `@walrussession8_bot` with seven commands registered; it has simply never received a message, which needs a Telegram account.

Original task list:

Goal: a stranger can talk to hippo on web, CLI and Telegram and it visibly remembers.

Tasks:
1. Web guest identity via cookie (exists) + `GET /api/me` returning mode, person ID, memory count (`RelayerExtras.stats`), memory enabled flag.
2. Commands on every channel, implemented once (in `apps/server/src/commands.ts` rather than `packages/core`, since they need database access) and mapped by adapters: `/whoami`, `/memory` (list by type from `memory_index` + recall text), `/memory search <q>`, `/memory off|on`, `/memory forget`, `/proof`, `/connect` (placeholder link until M3), `/help`.
3. Style adaptation: `style` memories change the system prompt (exists in prompt builder; verify with an eval).
4. Per-person throttle: 10 turns/min, 200/day, in `apps/server/src/ratelimit.ts` backed by Postgres. Web `/api/chat` requires the cookie.
5. Evals: `pnpm demo` runs a scripted two-session conversation against mainnet with a fresh guest ID and asserts that session 2 recalls facts from session 1 (`packages/core/src/demo.ts`). Output saved to `docs/evidence/demo-<date>.txt`.
6. `pnpm evidence`: users, memories per user, blob counts per account, agents per account, turn counts with memory on/off, average injected memories, from Postgres + relayer.
7. Telegram polish: typing indicator, long replies split at 4000 chars, Markdown-safe output, `/start` explains ownership in two sentences.

Verification: `pnpm demo` passes; `/memory` on Telegram lists the entries from `pnpm demo`; `pnpm evidence` prints non-zero counts.

### M3 — Owned mode — WRITTEN AND SECURITY-REVIEWED, never run against a wallet

All nine tasks are implemented: connect and disconnect tokens, the wallet page with sponsored `create_account` and `add_delegate_key`, on-chain verification of the grant before switching mode, dual-read instead of migration, `/me` with blob links, storage expiry and wallet sign-in, `/whoami`, and the Claude Code instructions. The sign-in half is verified end to end with a throwaway keypair (`pnpm --filter @hippo/server probe:signin`): a valid signature opens a session, a replayed nonce is refused, a signature over another challenge is refused, and signing out closes it. Two corrections since: permanent deletion is impossible (`docs/issues/09`) so `/me` does not offer it, and the security review found an unauthenticated takeover in the connect callback which is fixed.

What is missing is proof, not code. Tasks 8 and 9, the recorded revoke demo and the Claude Code recall, need a wallet.

Original task list:

Goal: the wow. A user owns their memory, can revoke it, and sees the same memory in Claude Code.

Tasks:
1. `POST /api/connect/start` (from any channel or web): generate delegate key (`generateDelegateKey`), store encrypted, create `connect_tokens` row (10 min, single use), return `${WEB_BASE_URL}/connect/<token>`.
2. `apps/web` `/connect/:token`: dapp-kit providers (mainnet), Slush wallet connect, optional Enoki Google. Steps: fetch token info → connect wallet → `fetchAccountIdForOwner` (port from `memwal/apps/app/src/utils/suiClientCompat.ts`) → if none, sponsored `create_account` → sponsored `add_delegate_key(publicKey, label "hippo (<channel>:<handle>)")` → `POST /api/connect/<token>/done {accountId, walletAddress, digest}`. Sponsored flow ported from `useSponsoredTransaction.ts`, via proxy if spike #2 said so.
3. Server verification of `done`: read the `MemWalAccount` object on-chain (`@mysten/sui` gRPC or JSON-RPC per `/config`), confirm our public key is in `delegate_keys`, then set `people.mode = owned`, `account_id`, `wallet_address`, key `status = active`, attach `wallet:<address>` identity (merge persons if the wallet already has one).
4. Migration: per spike #7, either copy guest memories into the owned account or enable dual-read for 30 days (`portFor` recalls both scopes and merges by distance). Tell the user which happened.
5. `/disconnect`: token → `/disconnect/:token` → sponsored `remove_delegate_key` → server confirms on-chain that the key is gone → mode back to guest, key `revoked`. Bot replies "I can no longer read your memory. /connect to grant again."
6. `/me` page: session via wallet challenge (`signPersonalMessage` over server nonce) or the guest cookie; shows mode, account with explorer link, SuiNS name, delegate list (`agents`), memories by type/date with expiry, "Use in Claude Code" steps, permanent delete if spike #8 passed, `/proof` blobs.
7. `/whoami` on chat channels shows account, explorer link, delegate label, memory count.
8. Record the revoke demo end to end on a test wallet: screen recording + `docs/evidence/revoke-<date>.md` with digests.
9. Claude Code demo: install the MemWal plugin, `memwal_login` with the same Slush wallet, `--namespace hippo`, ask what hippo knows. Screenshot to `docs/evidence/`.

Verification: a fresh wallet goes guest → owned → revoked → owned again with only the UI; `pnpm evidence` shows 2 agents on that account; Claude Code recalls a hippo memory.

### M4 — More channels and identity linking — PARTLY DONE

Cross-channel identity linking is done and verified without a wallet, using a six-character code, and it is asserted in `pnpm demo`. Evidence in `docs/evidence/cross-channel-2026-09-21.md`. The CLI is a real channel over HTTP and is documented. Discord and Slack adapters are written and typechecked but need tokens; Discord's slash-command registration is a one-command script (`pnpm --filter @hippo/server discord:commands <guildId>`) so task 1 is ready to run the moment a token exists.

Original task list:

1. Discord adapter live in a test server (DM + mention). Slash commands registered via REST for `/whoami`, `/memory`, `/connect`.
2. Slack adapter live in a test workspace (DM + mention, slash commands).
3. Cross-channel linking: `/connect` from Telegram and a wallet sign-in on web resolve to the same person; a fact told on Telegram is recalled on web and Discord. Add this to `pnpm demo`.
4. CLI channel documented in README.

Verification: `pnpm demo --cross-channel` passes; a screenshot of the same fact on two channels in `docs/evidence/`.

### M5 — Deploy and reproducibility — DONE except the deploy itself

`Dockerfile`, `railway.toml`, `vercel.json` and `ws-resources.json` are in place, the README runs from a clean clone (`docs/evidence/clean-clone-2026-09-21.md`), and the evidence folder and scripts exist. Pushing to Railway and Walrus Sites needs accounts.

Original task list:

1. Railway: `apps/server` with `pnpm start`, all env, health check on `/api/health`, Neon `DATABASE_URL`, `pnpm db:push` in a release step.
2. Web: Walrus Sites deploy (spike #10) with Vercel as backup; `VITE_API_URL` and `CORS_ORIGIN` set to the real origins; cookies `secure`.
3. README: five commands, env table, architecture diagram, "own your memory" section, troubleshooting (401, staging vs mainnet, namespace), how to run the evals.
4. `docs/evidence/` folder structure and `pnpm evidence` cron note.
5. WalForm survey link in `/start` and on `/me`.

Verification: a clean clone on another machine (or a fresh directory) follows README and chats; live URLs answer; `curl <api>/api/health` from outside.

### M6 — Real use and evidence — READY TO START, waiting on people

The Telegram token arrived and the adapter is live: `@walrussession8_bot` polls, registers its commands, and runs the same turn handler verified through the web and CLI. What is left is genuinely human: somebody has to message it, and a few people have to use it for a week. `docs/RUNBOOK.md` has the invite text, consent rules and daily checklist ready to run. Everything else it depends on is ready: `pnpm evidence` counts only memories that landed and prints whether the three-people-ten-memories requirement is met, `docs/evidence/` exists, and ten bug reports are drafted and ready to file.

Original task list:

1. Sep 27–28 baseline: onboard 3–5 users with `/memory off`; save transcripts to `docs/evidence/baseline/` (with consent, names redacted).
2. Sep 29: memory on. Daily: run `pnpm evidence`, collect "the moment it mattered" screenshots, watch logs for frictions.
3. Get at least one real user into owned mode with their own wallet; record it.
4. File GitHub issues as frictions are confirmed: aim for 5 strong ones from `docs/PLAN.md`'s candidate list, each with a minimal repro script under `docs/issues/`.
5. Oct 3–4: freeze features; only fixes. Final `pnpm evidence` → `docs/evidence/final.md` with counts, blob totals, explorer links for the operator account and each owned account.

Verification: `docs/evidence/final.md` shows ≥3 users × ≥10 memories, ≥1 owned account, ≥5 issue links.

### M7 — Article, promo, submission — DRAFTED, needs M6's numbers

`docs/article.md`, `docs/promo.md`, `docs/video.md` and `docs/submission.md` are written, with `[M6]` and `[HUMAN]` marking what is still missing. The article's "what broke" section is the strongest part and is already sourced from measurements.

Original task list:

1. Draft the article from the outline in `docs/PLAN.md` using real transcripts and numbers from `docs/evidence/`; 500–800 words; honest "what broke" section with issue links; model and runtime stated (Gemini 2.5 Flash via OpenRouter, Vercel AI SDK, Node 20). Save as `docs/article.md`.
2. 2-minute video: memory off vs on, connect, revoke, re-grant, Claude Code recall. Script in `docs/video.md`.
3. Promo post drafts (Show HN, dev.to, one Vietnamese dev community) in `docs/promo.md`.
4. X post draft in `docs/promo.md`.
5. Fill every field of the Airtable form and DeepSurge into `docs/submission.md` (agent ID = operator delegate public key from `pnpm smoke`, account ID, explorer link, agent count, LLM, bug + improvement, article link, X link, promo link, tool used = TypeScript SDK).
6. Human publishes article, posts, submits forms. Agent ticks `docs/PLAN.md` checklist and tags the repo `v1.0-submission`.

Verification: every checklist item in `docs/PLAN.md` "Submission checklist" is ticked with a link.

## Rubric → artifact map

| Judges ask | Where the proof lives |
|---|---|
| Does it actually remember? | `pnpm demo` output, revoke demo recording, transcripts with recalled memories cited |
| Real-world use | `docs/evidence/final.md`, baseline vs memory-on transcripts, user survey (WalForm) |
| Build quality | README five commands, `pnpm typecheck/lint/test/demo`, docker-compose, `docs/ARCHITECTURE.md` |
| Article | `docs/article.md` → Medium + Inkray |
| Beyond the Big Two | `LLM_MODEL=google/gemini-2.5-flash`, friction notes in article |
| Bug bounty | `docs/issues/` + GitHub links |
| Promo | `docs/promo.md` + live link |

## Task-by-task status

`docs/AUDIT.md` checks every numbered task below against the codebase. Consult it
before concluding that unblocked work is exhausted; auditing it three times
turned up real gaps each time.

## Current blockers, in order of risk

1. **An owner-signed revocation test** on the Sessions wallet. The relayer honours a delegate key the chain does not list (`docs/issues/08`), so the central claim, revoke on chain and the bot forgets, is unproven. Remove one delegate key on the dashboard and immediately run `pnpm smoke` with it.
2. **One message to @walrussession8_bot**, then the invites from `docs/RUNBOOK.md`. The adapter has never received a message; that cannot be tested without a Telegram account.
3. **A second Slush wallet** with no MemWalAccount, for the owned-mode and revoke demos.

Also needed later: Neon, Railway and Vercel for M5's actual deploy; Medium, Inkray, X and the Airtable form for M7; optionally an Enoki key and some WAL.

## Files this plan creates over time

`docs/SPIKES.md`, `docs/DECISIONS.md`, `docs/BLOCKERS.md`, `docs/evidence/**`, `docs/issues/**`, `docs/article.md`, `docs/video.md`, `docs/promo.md`, `docs/submission.md`.
