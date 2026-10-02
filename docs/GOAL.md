# GOAL — end-to-end execution plan for hippo

This is the master instruction for an agent (or a human) to take hippo from the current scaffold to a submitted, prize-competitive entry in Walrus Session 8 without asking for direction. Every decision that can be made in advance is made here. Read `AGENTS.md` first, then `CODE_RULES.md` before writing any code, then this file, then the milestone you are on.

## Mission

Ship a chatbot that remembers users across web, Telegram, Discord and Slack, where each user can own their memory in their own Walrus Memory account on Sui mainnet and revoke the bot in one transaction. Prove it with real users, a revoke demo, a Claude Code portability demo, an honest article, and filed SDK issues. Submit before **Oct 9, 2026 14:00 UTC**.

## Definition of done (submission level)

All of these are true and verifiable by a stranger:

1. `git clone` → follow the `README.md` quickstart → `bun run dev` starts the local stack and chats against mainnet with configured credentials.
2. Live web URL and Telegram handle answer within 5 seconds. Discord and Slack work if configured.
3. At least 3 real people, at least 10 memories each, on mainnet, with `bun run evidence` output committed under `docs/evidence/`.
4. At least one real user in owned mode with their own MemWalAccount, plus a recorded revoke → forget → re-grant → remember sequence.
5. The same memory recalled in Claude Code through the official Walrus Memory MCP plugin, screenshot in the article.
6. Article (500–800 words) published on Medium and Inkray; X post under the session announcement tagging @WalrusProtocol with #WalrusMemory; one promo post outside Walrus/Sui.
7. At least 5 GitHub issues on MystenLabs/MemWal with repro, expected vs actual, environment.
8. Airtable form and DeepSurge submitted; feedback form completed; `docs/PLAN.md` submission checklist fully ticked.

## Operating rules for the executing agent

- **Do not ask; decide.** Every open choice is settled in this file or in `docs/ARCHITECTURE.md`. If something new comes up, pick the option that keeps owned mode, the revoke demo and Telegram intact, write the decision in `docs/DECISIONS.md` with one line of reasoning, and continue.
- **Human inputs are the only blockers.** They are listed in "Inputs from the human". When one is missing, do every task that does not need it, then append the exact ask to `docs/BLOCKERS.md` and move to the next milestone's non-blocked work. Never fabricate credentials, users or evidence.
- **Verify each task with a command** listed under its milestone. A task is done only when its command passes. Paste the command output into the commit message body or `docs/evidence/`.
- **Commit at the end of every task**, push at the end of every milestone. Keep `bun run typecheck && bun run lint && bun run test` green on every commit.
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
1. `bun run smoke --write` stores and recalls one memory on mainnet. Evidence: blob ID and Suiscan link in `docs/SPIKES.md`.
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

`bun run demo` asserts three things and passes: 4/4 cross-session recall, style adaptation, and cross-channel recall. Commands, throttle, `bun run evidence`, `bun run restore` and `bun run diagnose` all exist and are verified. Telegram is live and polling as `@walrussession8_bot` with seven commands registered; it has simply never received a message, which needs a Telegram account.

Original task list:

Goal: a stranger can talk to hippo on web, CLI and Telegram and it visibly remembers.

Tasks:
1. Web guest identity via cookie (exists) + `GET /api/me` returning mode, person ID, memory count (`RelayerExtras.stats`), memory enabled flag.
2. Commands on every channel, implemented once (in `apps/server/src/chat/commands.ts` rather than `packages/core`, since they need database access) and mapped by adapters: `/whoami`, `/memory` (list by type from `memory_index` + recall text), `/memory search <q>`, `/memory off|on`, `/memory forget`, `/proof`, `/connect` (placeholder link until M3), `/help`.
3. Style adaptation: `style` memories change the system prompt (exists in prompt builder; verify with an eval).
4. Per-person throttle: 10 turns/min, 200/day, in `apps/server/src/chat/ratelimit.ts` backed by Postgres. Web `/api/chat` requires the cookie.
5. Evals: `bun run demo` runs a scripted two-session conversation against mainnet with a fresh guest ID and asserts that session 2 recalls facts from session 1 (`packages/core/src/demo.ts`). Output saved to `docs/evidence/demo-<date>.txt`.
6. `bun run evidence`: users, memories per user, blob counts per account, agents per account, turn counts with memory on/off, average injected memories, from Postgres + relayer.
7. Telegram polish: typing indicator, long replies split at 4000 chars, Markdown-safe output, `/start` explains ownership in two sentences.

Verification: `bun run demo` passes; `/memory` on Telegram lists the entries from `bun run demo`; `bun run evidence` prints non-zero counts.

### M3 — Owned mode — WRITTEN AND SECURITY-REVIEWED, never run against a wallet

All nine tasks are implemented: connect and disconnect tokens, the wallet page with sponsored `create_account` and `add_delegate_key`, on-chain verification of the grant before switching mode, dual-read instead of migration, `/me` with blob links, storage expiry and wallet sign-in, `/whoami`, and the Claude Code instructions. The sign-in half is verified end to end with a throwaway keypair (`bun run --filter @hippo/server probe:signin`): a valid signature opens a session, a replayed nonce is refused, a signature over another challenge is refused, and signing out closes it. Two corrections since: permanent deletion is impossible (`docs/issues/09`) so `/me` does not offer it, and the security review found an unauthenticated takeover in the connect callback which is fixed.

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

Verification: a fresh wallet goes guest → owned → revoked → owned again with only the UI; `bun run evidence` shows 2 agents on that account; Claude Code recalls a hippo memory.

### M4 — More channels and identity linking — PARTLY DONE

Cross-channel identity linking is done and verified without a wallet, using a six-character code, and it is asserted in `bun run demo`. Evidence in `docs/evidence/cross-channel-2026-09-21.md`. The CLI is a real channel over HTTP and is documented. Discord and Slack adapters are written and typechecked but need tokens; Discord's slash-command registration is a one-command script (`bun run --filter @hippo/server discord:commands <guildId>`) so task 1 is ready to run the moment a token exists.

Original task list:

1. Discord adapter live in a test server (DM + mention). Slash commands registered via REST for `/whoami`, `/memory`, `/connect`.
2. Slack adapter live in a test workspace (DM + mention, slash commands).
3. Cross-channel linking: `/connect` from Telegram and a wallet sign-in on web resolve to the same person; a fact told on Telegram is recalled on web and Discord. Add this to `bun run demo`.
4. CLI channel documented in README.

Verification: `bun run demo --cross-channel` passes; a screenshot of the same fact on two channels in `docs/evidence/`.

### M5 — Deploy and reproducibility — DONE

`Dockerfile`, `railway.toml`, `vercel.json` and `ws-resources.json` are in place, the README runs from a clean clone (`docs/evidence/clean-clone-2026-09-21.md`), and the evidence folder and scripts exist. Pushing to Railway and Walrus Sites needs accounts.

Original task list:

1. Railway: `apps/server` with `bun run --filter @hippo/server start`, all env, health check on `/api/health`, Neon `DATABASE_URL`, `bun run db:push` in a release step.
2. Web: Walrus Sites deploy (spike #10) with Vercel as backup; `VITE_API_URL` and `CORS_ORIGIN` set to the real origins; cookies `secure`.
3. README: Bun quickstart, env table, architecture diagram, "own your memory" section, troubleshooting (401, staging vs mainnet, namespace), how to run the evals.
4. `docs/evidence/` folder structure and `bun run evidence` cron note.
5. WalForm survey link in `/start` and on `/me`.

Verification: a clean clone on another machine (or a fresh directory) follows README and chats; live URLs answer; `curl <api>/api/health` from outside.

### M6 — Real use and evidence — READY TO START, waiting on people

The Telegram token arrived and the adapter is live: `@walrussession8_bot` polls, registers its commands, and runs the same turn handler verified through the web and CLI. What is left is genuinely human: somebody has to message it, and a few people have to use it for a week. `docs/RUNBOOK.md` has the invite text, consent rules and daily checklist ready to run. Everything else it depends on is ready: `bun run evidence` counts only memories that landed and prints whether the three-people-ten-memories requirement is met, `docs/evidence/` exists, and ten bug reports are drafted and ready to file.

Original task list:

1. Sep 27–28 baseline: onboard 3–5 users with `/memory off`; save transcripts to `docs/evidence/baseline/` (with consent, names redacted).
2. Sep 29: memory on. Daily: run `bun run evidence`, collect "the moment it mattered" screenshots, watch logs for frictions.
3. Get at least one real user into owned mode with their own wallet; record it.
4. File GitHub issues as frictions are confirmed: aim for 5 strong ones from `docs/PLAN.md`'s candidate list, each with a minimal repro script under `docs/issues/`.
5. Oct 3–4: freeze features; only fixes. Final `bun run evidence` → `docs/evidence/final.md` with counts, blob totals, explorer links for the operator account and each owned account.

Verification: `docs/evidence/final.md` shows ≥3 users × ≥10 memories, ≥1 owned account, ≥5 issue links.

### M7 — Article, promo, submission — DRAFTED, needs M6's numbers

`docs/article.md`, `docs/promo.md`, `docs/video.md` and `docs/submission.md` are written, with `[M6]` and `[HUMAN]` marking what is still missing. The article's "what broke" section is the strongest part and is already sourced from measurements.

Original task list:

1. Draft the article from the outline in `docs/PLAN.md` using real transcripts and numbers from `docs/evidence/`; 500–800 words; honest "what broke" section with issue links; model and runtime stated (Gemini 2.5 Flash via OpenRouter, Vercel AI SDK, Node 20). Save as `docs/article.md`.
2. 2-minute video: memory off vs on, connect, revoke, re-grant, Claude Code recall. Script in `docs/video.md`.
3. Promo post drafts (Show HN, dev.to, one Vietnamese dev community) in `docs/promo.md`.
4. X post draft in `docs/promo.md`.
5. Fill every field of the Airtable form and DeepSurge into `docs/submission.md` (agent ID = operator delegate public key from `bun run smoke`, account ID, explorer link, agent count, LLM, bug + improvement, article link, X link, promo link, tool used = TypeScript SDK).
6. Human publishes article, posts, submits forms. Agent ticks `docs/PLAN.md` checklist and tags the repo `v1.0-submission`.

Verification: every checklist item in `docs/PLAN.md` "Submission checklist" is ticked with a link.

### M8 — Close the gap between what hippo claims and what it does — SHIPPED

Added 2026-09-24 from `docs/SCOPE-RESEARCH.md`, in its order. Every item makes a
claim the project already makes true, rather than adding a new one. **Feature
freeze stays Oct 3 (M6 task 5):** anything unfinished by then is cut, not rushed.

1. **Conflicts — DONE 2026-09-24.** A change of mind is stored, recalled beside
   the fact it replaces, and believed. `bun run demo` fails if any answer states
   the old value. `docs/evidence/conflicts-2026-09-24.md`.
2. **Export — DONE 2026-09-24**, 4/4 verified end to end on mainnet, `docs/evidence/export-2026-09-24.md`. "Your memory is yours" with no way to take it is the gap a
   sceptical judge finds first. `GET /api/me/export?format=json|md`, an Export
   button on `/me`, and `/export` in chat (Telegram receives the file itself).
   Text comes back through recall and is **verified against the sha256 recorded
   when hippo wrote it**, is never stored, and every memory whose text cannot be
   recovered is still listed with its blob id, ciphertext link and expiry. The
   file says plainly what it cannot contain and why (`docs/issues/12`).
   Verification: unit tests for coverage and verification with a fake port; an
   export of a real mainnet namespace whose text is 100% verified; the button
   exercised in the browser.
3. **Team on `/me` — DONE 2026-09-24**, `docs/evidence/team-tracking-2026-09-24.md`. Team memory exists in chat and is invisible on the page
   that is supposed to show everything hippo holds. Show the team, its members
   and the shared memories, with a leave control. **First, track team writes:**
   `/team remember` records nothing in `memory_index`, so a failed team write is
   never noticed after the person was told "Added", and nobody has a list of what
   they gave a team. Recording them changes `bun run evidence` (team rows must not
   count toward the 3 × 10 requirement), `/memory forget` and the `/me` list, so
   all three move together. Verification: a render test, and a team write whose
   status settles to stored.
4. **Hide one memory — DONE 2026-09-24**, shipped after the owner approved the production column (`docs/evidence/hide-one-memory-2026-09-24.md`). `/memory forget` is all or nothing. Mark one memory so it
   is never recalled again, from chat (`/memory forget <n>` against the `/memory`
   list) and from `/me`. The blob stays on Walrus and the copy says so.
   Verification: a unit test that a hidden blob never reaches the model, and a
   mainnet check that it stops being recalled.
5. **Keep the story true.** README, `docs/article.md`, `docs/submission.md` and
   `docs/AUDIT.md` mention what shipped, with its limits.

6. **Article to the word limit — DONE 2026-09-24.** `docs/article-final.md`, 794
   words; the session asks for 500 to 800 and the long draft was about 2,350.
7. **Web chat commands — FIXED 2026-09-24.** They answered with JSON the chat
   could not render, so every slash command on the web showed nothing.
   `docs/evidence/web-commands-2026-09-24.md`.

**M8 status:** every task is shipped to production and matches `main`. Task 4's
column went in through `bun run --filter @hippo/db plan-push`, which showed one
additive statement before applying it.

Not in M8: Discord and Slack go live the moment tokens exist (M4), and needs no
code. Node 20 is end-of-life; moving to 24 is a one-line Dockerfile change but a
production runtime change, so it waits for the owner's word.

### M9 — Measure what the pitch rests on — SHIPPED

Added 2026-09-24. Everything left in M6 and M7 needs the owner or real people,
so this is what can still move the judging criteria without them. Feature
freeze stays Oct 3.

1. **A measured before/after — DONE 2026-09-24**, passed in every run since. `docs/evidence/latency-2026-09-24.md`. Criterion one asks for a convincing before and
   after, and the only "before" so far was asserted, never run. `bun run demo`
   asks the same session-two questions with memory off, on the same model, and
   fails if a memory-off answer knows a taught fact. Then the article states
   the measured result instead of nothing.
2. **What memory costs per turn — DONE**: a session's first recall 3.76s → 1.97s median over ten alternating rounds, later turns 2.0s → 1.0s for people with no corrections. Parallel recalls were tried and measured to gain nothing, so reverted. Each turn now makes up to six sequential
   recalls (message, three session-start pulls, the corrections pull). Time
   memory-on against memory-off turns in the eval. If the cost is large, cut it
   where it does not change the answers, and prove that with the eval.
3. **Command replies that read as lists — DONE.** `/help` and `/memory` render in a
   proportional font on the web, so their columns do not line up.
4. **Keep the story true — DONE.** Article (794 words), README, AGENTS.md and AUDIT carry the new numbers,
   with their sample sizes.

### M10 — Harden what judges and real users touch first — SHIPPED

Added 2026-09-25. M8 and M9 added a day's worth of routes that read and change a
person's memory, and the channel real users will arrive on has never delivered
a message. Feature freeze stays Oct 3.

1. **Review every change since M8 — DONE**, four findings fixed with tests (`docs/evidence/review-2026-09-25.md`). Correctness and security: auth on every
   `/api/me` route, rate limits, anything that could leak memory text or another
   person's rows, blob-prefix matching, export content. Each confirmed finding
   fixed with a test; `docs/evidence/review-2026-09-25.md` records what was
   checked, including what was found fine.
2. **Channel adapter tests — DONE**, 15 tests; they found Slack's shared "unknown" person and Discord's missing export files. Telegram chunking, `/export` files sent as
   documents, failure replies; Discord and Slack translating to `handleIncoming`
   and back, with mocked clients.
3. **A real-browser pass — DONE**, no overflow anywhere, three fixes (`docs/evidence/browser-pass-2026-09-25.md`): at 375px and desktop, light and dark, over chat,
   `/me` (export, team, hide, search) and the connect pages.
4. **A followable article — DONE**, 794 words, snippet run as printed (`docs/evidence/article-snippet-2026-09-25.md`). A minimal remember/recall snippet with the SDK calls
   hippo really makes, inside 800 words.
5. **Re-measure — DONE**: all passes; session-start recall 4.34s → 2.30s median on a second day, first memory-on turn 4.9s (was 7.1s before M9).

### M11 — Ready to be judged and to file — SHIPPED

Added 2026-09-25. Nothing is filed or published, and that stays the owner's
call; this makes sure what they file and what a judge clones hold up.

1. **Re-verify every issue draft — DONE.** All thirteen re-run against relayer
   `5b27683` and SDK 0.1.7 and 0.1.8, each dated at the top. Nine still stand;
   02 on hold, 03 not reproduced, 07 resolved before filing, 08 retracted. Two
   claims in our own drafts were wrong and are corrected. The dry run posts
   exactly the nine. File nothing.
2. **The judge's path — DONE.** The first fresh clone on Node 20 could not start
   the server (a blank `SURVEY_URL=` in `.env.example`, broken for every clone
   since 2026-09-22), the dev web app could not reach the API, and the CLI exited
   13. All fixed; the second fresh clone ran clean end to end, `bun run demo` in
   4 min 38 s (`docs/evidence/clean-clone-2026-09-25.md`).
3. **SDK 0.1.8 — measured, not merged.** Everything passes and it dropped no more
   recalls than 0.1.7, but the relayer was degraded for the whole measurement and
   the two 0.1.8 benches landed either side of 0.1.7's, so "no slower" is not
   shown. It waits on the `sdk-0.1.8` branch for a healthy hour
   (`docs/evidence/sdk-0.1.8-2026-09-25.md`).
4. **Real-use readiness — DONE.** `bun run evidence:daily` opens with `bun run ops`:
   failed and stuck writes, dropped and given-up recalls, failed turns and
   commands and crashes, from `memory_index` and Railway's logs, with no memory
   text. Its first run found 22 production crashes in a day, a Telegram 409 on
   every deploy; fixed and deployed.
5. **Keep the story true — DONE.** README, submission, RUNBOOK, PLAN, AUDIT and
   this file. Also found: four `.turbo` logs tracked since the scaffold, because
   the CI guard only looked at the root; untracked, and the guard now checks
   every directory for `.turbo` and `.env` files.

### M12 — The last eight days: real people, ship `main`, submit — ACTIVE

Added 2026-10-01. Deadline **Oct 9 14:00 UTC**. Feature freeze stays **Oct 3**;
after it, only fixes.

Where things stand, from the production report
(`docs/evidence/daily/2026-10-01.md`): 9 people with memories, **0 with 10 or
more**, 20 stored memories, 0 owned-mode people, 35 turns (33 web, 2 Telegram),
no failure anyone could feel in 24 hours, $0.60 of OpenRouter budget left. The
3 × 10 rule is the one eligibility requirement not met, and the only one that
needs calendar time, so it starts today and everything else fits around it.

Production runs a build started 2026-09-25 on `google/gemini-2.5-flash`. `main`
is 36 commits ahead: Phase 1 and 2 of `docs/CHAT-UPGRADE.md` and encrypted
conversation history, which adds tables. Nothing a real user touches has those
yet. Every pull request is merged (#1 to #4), and `sdk-0.1.8` was merged on
2026-10-01 at the owner's word (`f0b15d4`): no branch holds work that `main`
lacks. That merge skipped the healthy-relayer bench M11 asked for, so task 4
runs it before anything deploys.

Decisions for this milestone, also in `docs/DECISIONS.md`:

- **Private files ship as a thin slice only if the Enoki key arrives on Oct 1**
  (owner's choice). Text and Markdown, owned mode only, one chat, citations.
  Merged only if its checks pass by the freeze; otherwise the article and the
  submission do not mention it. Task 11.
- **No separate memory-off baseline days.** There is no week left for two
  phases. `bun run demo`'s memory-off control is the measured before and after.
- **The judge's path is "New chat, then ask what it knows".** Since 2026-09-26 a
  reload restores the transcript, so it proves nothing; a new chat does. The
  README changes, not the page.

Owner means only the account owner can do it. Agent means it can be done from
this repo.

1. **Invite people today. (Owner)** Send the invite in `docs/RUNBOOK.md` to three
   to five developers; the owner may be one of the three. Each needs 10 stored
   memories by **Oct 7**, which is about two real conversations about their
   stack, preferences and decisions. Ask one of them to connect a wallet
   (task 5). Verify: `bun run evidence:daily` every morning; done when it prints
   `Session requirement (3 people x 10 memories on mainnet): MET`.
2. **Settle the model. (Agent, then owner)** The code default and README say
   `deepseek/deepseek-v4.1-flash` (owner's choice, 2026-09-29). Production,
   `.env`, `docs/article-final.md` and `docs/submission.md` say Gemini 2.5
   Flash. V4.1 has never run the eval, and V4 dropped style adaptation in the
   2026-09-23 bakeoff. Run `LLM_MODEL=deepseek/deepseek-v4.1-flash bun run demo`
   twice and save both to `docs/evidence/`. Both pass: ship V4.1 in task 4 and
   change every model line. Either fails style: production stays on Gemini, the
   result goes to `docs/BLOCKERS.md` for the owner, and the README matches
   production. Verify: one model named in README, article, submission and
   `GET /api/health`. **Done 2026-10-02: V4.1 failed style in run 2 of 2, so
   Gemini everywhere; the owner's choice is in `docs/BLOCKERS.md`.**
3. **Fix what a first-time user hits. (Agent, by Oct 2)** **Done 2026-10-02**
   (`b67c1a5`, `fc8866f`, `fe26797`; `docs/evidence/identity-2026-10-02.md`).
   Following the README in a browser found three more, also fixed: the phone
   memory sheet covering the chat, the on-Walrus line never updating, and the
   phone sidebar staying open (`3a48c16`, `5398c0a`;
   `docs/evidence/first-run-2026-10-02.md`).
   - The memory panel shows "Could not load what this chat remembered." beside
     "Nothing remembered in this chat yet." on the first message of every new
     chat. `apps/web/src/features/chat/use-chat-memories.ts` asks for
     `/api/conversations/:id/memories` before the server has the conversation,
     gets 404, and never asks again. Seen 2026-09-30 on the local stack; a
     reload clears it. Verify: a render test of a new chat's first turn shows no
     error.
   - Asked "xin chào, bạn là ai?", the bot answered "Tôi là Gemini … Google" on
     2026-09-30. The prompt opens with "You are hippo" and the model ignored it.
     Make the identity hold on the model chosen in task 2, in Vietnamese and
     English. Verify: one turn in each language, and `bun run demo` still passes.
   - README "See it work in three clicks" tells a judge to click **Reload, then
     ask what it knows**, which is not rendered. Rewrite it to the new-chat path.
     Verify: follow it on the local stack in a browser.
4. **Ship `main` to production.** **Deployed 2026-10-02** at the owner's word
   (`docs/evidence/deploy-2026-10-02.md`). Before that, ready: the eval
   passed on Gemini, SDK 0.1.8 kept after a bench
   (`docs/evidence/sdk-0.1.8-bench-2026-10-02.md`), `plan-push` fixed to accept
   this plan (`ee8b54b`). The owner's steps are `docs/evidence/handoff-2026-10-02.md`.
   Original: **(Agent runs it, owner approves the schema; by
   Oct 2)** `bun run typecheck && bun run lint && bun run test` and
   `bun run demo` pass first. `ROUNDS=10 bun run --filter @hippo/core
   bench:recall <namespace>` on SDK 0.1.8 against the 0.1.7 numbers in
   `docs/evidence/sdk-0.1.8-2026-09-25.md`, while `/health` says the relayer is
   healthy; if 0.1.8 is slower, revert `f0b15d4` before deploying. Then `bun run --filter @hippo/db plan-push` against
   production, show the owner every statement, and apply only on a yes and only
   if every statement is additive. Deploy Railway and Vercel. Verify:
   `/api/health` reports the task 2 model and a new `startedAt`; on the live URL
   a new chat remembers a fact, a reload keeps the transcript, and the memory
   panel shows the fact; Telegram answers; `bun run ops --hours 2` is clean.
5. **One real owned user, filmed. (Owner)** A spare wallet costs nothing: add an
   account inside Slush, and account creation and key grants are sponsored. Use
   it or an invited developer's wallet: `/connect`, tell hippo something,
   `/disconnect`, see it can no longer read, `/connect` again, see it recalled.
   Screen-record it. The agent writes `docs/evidence/revoke-<date>.md` with the
   digests. Verify: `bun run evidence:daily` shows owned-mode people ≥ 1.
6. **Claude Code recall. (Owner, after task 5)** Same wallet: install the
   official Walrus Memory MCP plugin, `memwal_login`, namespace `hippo`, ask what
   hippo knows. Screenshot to `docs/evidence/`. Nothing claims this until the
   screenshot exists.
7. **File the issues. (Owner's word, then agent; by Oct 3)** If the relayer has
   redeployed since 2026-09-25, re-run each draft's repro first. Then
   `scripts/file-issues.sh --dry-run`, then for real: 01, 04, 05, 06, 09, 10,
   11, 12, 13. Bug Bounty is judged separately, and early filing gives the
   maintainers time to answer. Verify: nine URLs written back into the drafts
   and into `docs/submission.md`.
8. **Keep the story true. (Agent, Oct 6)** The article's `[M6]` paragraph gets
   the Oct 6 numbers and nothing before they exist; the model line from task 2;
   every `submission.md` field the agent can fill; `docs/ARCHITECTURE.md` §1
   (`handleIncoming`, the tables listed in `docs/PROGRESS.md`, distance 0.8,
   four attempts, dual-read); `docs/WEB-DATA-FLOWS.md` §2 and §3; `docs/PLAN.md`
   "Today: Sep 22". Verify: `grep -rn 'handleTurn\|Reload, then ask' README.md
   docs/ARCHITECTURE.md docs/WEB-DATA-FLOWS.md` prints nothing, and the article
   is 500 to 800 words.
9. **Final evidence. (Agent, Oct 7)** `bun run evidence:daily`, saved as
   `docs/evidence/final.md` with explorer links for the operator account and
   every owned account.
10. **Publish and submit. (Owner, Oct 7–8)** Article on Medium and Inkray; X post
    under the session announcement with `@WalrusProtocol` and `#WalrusMemory`;
    one promo post outside Walrus and Sui (Show HN or Viblo); Airtable, DeepSurge,
    Discord, feedback form. The agent ticks `docs/PLAN.md`'s submission
    checklist with links and tags `v1.0-submission`.
11. **Private files, thin slice.** **Built and merged 2026-10-02 (PR #5) after
    the Seal key arrived; not deployed; the mainnet round trip (check 3) has not
    run.** Earlier the same day: not shipped, no key. Original: **(Owner's key, then agent; by Oct 3)** Scope and
    checks are "Thin slice for the submission" in `docs/CHAT-UPGRADE.md`. Phase
    0 step 3 (`writeFilesFlow` from the test wallet) starts without the key. If
    the Enoki key is not in `apps/web/.env` by the end of Oct 1, stop and leave
    it out. Never at the cost of tasks 1 to 4. Verify: the four checks in that
    section, with `docs/evidence/files-<date>.md`; the branch is merged, or it
    is named as not shipped in `docs/PROGRESS.md`.

| By the end of | True |
|---|---|
| Oct 1 | Invites sent. V4.1 eval run. Enoki key in hand, or files out. |
| Oct 2 | Task 3 fixes merged. `main` live in production. Owned user filmed. |
| Oct 3 | **Freeze.** Claude Code screenshot. Issues filed. Files merged or out. |
| Oct 4–6 | `evidence:daily` each morning. Fixes only. Article text updated Oct 6. |
| Oct 7 | 3 × 10 met. `final.md`. Article published. |
| Oct 8 | Forms submitted. |
| Oct 9 | Buffer. Deadline 14:00 UTC. |

Not in M12 unless it fits before the freeze without displacing a task above:
Discord and Slack (only if
tokens arrive), pointing a SuiNS name at the Walrus Site (an owner transaction,
five minutes). `docs/video/hippo-reel.mp4` exists untracked (11 MB, 2026-09-27);
whether it is the submission video is the owner's call, and it is hosted
outside git rather than committed.

## Rubric → artifact map

| Judges ask | Where the proof lives |
|---|---|
| Does it actually remember? | `bun run demo` output, revoke demo recording, transcripts with recalled memories cited |
| Real-world use | `docs/evidence/final.md`, baseline vs memory-on transcripts, user survey (WalForm) |
| Build quality | README quickstart, `bun run typecheck/lint/test/demo`, docker-compose, `docs/ARCHITECTURE.md` |
| Article | `docs/article.md` → Medium + Inkray |
| Beyond the Big Two | `LLM_MODEL=google/gemini-2.5-flash`, friction notes in article |
| Bug bounty | `docs/issues/` + GitHub links |
| Promo | `docs/promo.md` + live link |

## Task-by-task status

`docs/AUDIT.md` checks every numbered task below against the codebase. Consult it
before concluding that unblocked work is exhausted; auditing it three times
turned up real gaps each time.

## Current blockers, in order of risk

Updated 2026-10-01. M12 has the dates.

1. **Three people who each reach ten memories by Oct 7.** Production has 0 of 3. Telegram is no longer a blocker: it logged two turns by 2026-10-01.
2. **A yes on the production schema** for `main`'s conversation tables, at deploy time (M12 task 4).
3. **A spare wallet** to film `/connect` and `/disconnect` and to run the Claude Code recall. A new account inside Slush is enough.
4. **The owner's word** to file the nine issues and to publish.
5. **The Enoki key for the Seal aggregator, today**, or private files stay out (M12 task 11).
6. **A SuiNS name pointed at the Walrus Site**, so `wal.app` serves it. Optional.

Resolved 2026-09-22, and it was number one on this list since the first day: the
**revocation test**. A local keystore wallet with no account plus sponsored
transactions meant it needed no human at all. Removing a delegate key on chain
made the relayer refuse it within about 32 seconds. Getting there also refuted
`docs/issues/08`: our account id had been pointing at a second, superseded
mainnet deployment. See `docs/SPIKES.md` §I and §J.

Also needed later: Medium, Inkray, X and the Airtable form for M7. Neon, Railway and Vercel have been live since 2026-09-22. The Enoki key decides whether private files ship (M12 task 11).

## Files this plan creates over time

`docs/SPIKES.md`, `docs/DECISIONS.md`, `docs/BLOCKERS.md`, `docs/evidence/**`, `docs/issues/**`, `docs/article.md`, `docs/video.md`, `docs/promo.md`, `docs/submission.md`.
