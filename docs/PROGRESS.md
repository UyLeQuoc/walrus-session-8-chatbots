# Progress — 2026-09-27

Handoff for the next agent. This is where the code actually is. It is not a plan.

`docs/GOAL.md` is still the master plan. `docs/AUDIT.md` checks M0–M11 against the tree through 2026-09-25. `docs/BLOCKERS.md` is what only the human can provide. When those disagree with this file, this file is newer.

Do not invent a number, a user, a quote, or a result. Do not file, post, publish, submit, or message anyone unless the owner says so.

## How to update this file

When a task lands, add a dated bullet under **Since last snapshot**. Do not rewrite older sections. A task is done only when its verify command passes.

## Snapshot

- Written: 2026-09-27.
- Code described: `0343083` (`feat(chat): persist encrypted conversation history`). That commit is `HEAD` and matches `origin/main`.
- Working tree at write time: `apps/web/src/features/chat/chat-page.tsx` had an uncommitted diff, formatting plus `className="p-4"` on the composer. `taught={false}` was unchanged. That diff is committed with this file.
- Deadline: **Oct 9, 2026 14:00 UTC**. Feature freeze in `docs/GOAL.md` is **Oct 3**.
- Package manager: Bun 1.3.14. Commands are `bun run`, not `pnpm`.
- SDK on `main`: `@mysten-incubation/memwal` `^0.1.7`. 0.1.8 was measured and not merged (`docs/evidence/sdk-0.1.8-2026-09-25.md`, branch `sdk-0.1.8`).
- Model default: `google/gemini-2.5-flash` (`apps/server/src/env/schema.ts`). README names `qwen/qwen3.7-flash` as the fallback. Fallback runs only on `completeTurn` (Telegram, Discord, Slack). Web streams and does not fall back. The CLI talks to `POST /api/chat`, so it does not fall back either. The comment in `packages/core/src/agent.ts` that includes the CLI is wrong.
- This snapshot did not re-run lint, tests, `bun run demo`, or a production deploy check. It did not count tests.

Live URLs, as recorded in `docs/AUDIT.md` and `README.md`. Not re-checked today:

- Web: https://hippo-web-ten-nu.vercel.app
- API: https://hippo-server-production.up.railway.app
- Telegram: `@walrussession8_bot`
- Operator account: `0x5a257802…` (Suiscan link in the README)
- Walrus Site object: `0x65eec4835f094c4c3d642f76f60ac983e0ddd08f715842e349daa11edb2a2078`. `wal.app` does not serve it until a SuiNS name points at that object.

## Milestone board

| Milestone | Status |
|---|---|
| M0 Scaffold | Done |
| M1 Spikes | Done, except Enoki (blocked on a key) and pointing a SuiNS name at the site |
| M2 Guest mode | Done |
| M3 Owned mode | Code done and revoke measured by script. Screen recording and Claude Code recall not done |
| M4 Channels | Linking done. Discord and Slack adapters written, not live (no tokens). Native slash clicks are not handled; see below |
| M5 Deploy | Config done and recorded live. Walrus Site is on chain, not on `wal.app` |
| M6 Real use | Not started. Last production count is below. This is the unmet judging criterion that needs people |
| M7 Article, promo, submission | Drafted. Nothing published or submitted |
| M8 Claims vs product | Shipped 2026-09-24 |
| M9 Measure | Shipped 2026-09-24 |
| M10 Harden | Shipped 2026-09-25 |
| M11 Judge path and issue re-verify | Shipped 2026-09-25, except filing and merging SDK 0.1.8 |

`docs/AUDIT.md` is the task-by-task check through M11. Its tables still say `pnpm`. Use `bun run`.

## What landed after the audit (2026-09-26)

Not in `docs/AUDIT.md` or `docs/NEXT-PROMPT.md`.

Chat transcripts live in Postgres, AES-256-GCM with `KEY_ENCRYPTION_KEY`, not on Walrus. Memory text is still not a Postgres column. The in-memory conversation Map is gone. A normal web reload restores the open chat. Do not open the latest chat on `/`. Decision: `docs/DECISIONS.md`, 2026-09-26.

`reloadAndAsk` in `apps/web/src/features/chat/chat-page.tsx` clears the active chat id, stores a pending question, and reloads. The empty state always passes `taught={false}`, so that function is never reached from the UI. `apps/web/src/app/pages.test.tsx` asserts the "Reload, then ask" button is absent.

The 2026-09-23 decision that the conversation buffer is an in-memory Map is superseded by the 2026-09-26 decision.

## What the code does

Web routes in `apps/web/src/main.tsx`: `/` chat, `/connect/:token`, `/disconnect/:token`, `/me`, 404. No Enoki on the connect page. No SuiNS name on `/me`. No `/proof` page; `/proof` is a chat command.

Namespaces in `packages/memory/src/client.ts`: owned `hippo`, guest `hippo-guest:<personId>`, team `hippo-team:<id>`. Connect does not migrate guest blobs. Owned recall also reads the person's guest namespace and the team namespace. Writes go to the primary scope. `DEFAULT_MAX_DISTANCE` is `0.8`. Empty-but-dropped recalls retry `4` times (`packages/memory/src/policy.ts`).

Hide is `memory_index.hidden_at`, not a Walrus delete. Export recovers text by recall and checks sha256. Corrections are a memory type; the prompt treats the newer of two conflicting memories as current.

Channel adapters start only when their tokens are set. Telegram polls. Discord handles `MessageCreate` only, not `InteractionCreate`, so a slash-menu click is not handled. Slack handles DMs and `app_mention` only. `/export` files are attached on Telegram, Discord, and the CLI (`ATTACHES` in `apps/server/src/chat/commands.ts`). Slack is told to use the web.

Published command names: `memory`, `whoami`, `proof`, `export`, `link`, `team`, `connect`, `disconnect`, `privacy`, `help`. `/start` is handled but not in that list. `/memory` subcommands: list, `search`, `on`, `off`, `forget <blob>`, `forget all`, `unhide`. `/team`: status, `new`, `invite`, `join`, `remember`, `leave`.

Postgres tables that exist and are easy to miss in `docs/ARCHITECTURE.md` §1: `web_sessions`, `turn_log`, `memory_index`, `teams`, `team_members`, `team_invites`, `conversations`, `messages`. There is no `users` table. The turn function is `handleIncoming`, not `handleTurn`.

## Known drift — do not trust these claims

- `README.md` "See it work in three clicks" tells a judge to click **Reload, then ask what it knows**. That button is not rendered. A normal reload restores the open chat, which is the opposite of "the conversation is gone". Do not "fix" this by opening the latest chat on `/`. Rendering the ask chips would fail the current page test. That is a product choice, not a drive-by.
- `docs/WEB-DATA-FLOWS.md` §2 still says opening `/` calls `GET /api/config` and that `Landing` / `LiveStats` call `GET /api/stats`. Those components are not in the web app. §3 is closer to the current chat path, but it also describes the demo button as if it is shown.
- `docs/ARCHITECTURE.md` §1 still says `handleTurn` and omits the tables listed above. Recall policy in code is distance `0.8` and `4` attempts, not whatever older section still says `0.6` or three retries. Connect dual-reads; it does not copy guest memories with `rememberBulk`.
- `docs/NEXT-PROMPT.md` stops at 2026-09-23. Its "attack our defences" prompt is not recorded as done in `docs/DECISIONS.md` or `docs/AUDIT.md`. Do not treat it as the current assignment. Redact is tested in `packages/memory/src/format.test.ts`. The memory limiter has `limiter.test.ts`. This snapshot did not find a test file for `apps/server/src/chat/ratelimit.ts`.
- `docs/PLAN.md` still says "Today: Sep 22". Its submission checklist is entirely unchecked, including items the rest of the repo treats as done. Do not tick it from this file. It is the outward submission list, not the engineering status.
- `docs/GOAL.md` still says Neon, Railway, and Vercel are needed later. `docs/BLOCKERS.md` marks that deploy resolved on 2026-09-22. It also says Discord and Slack need no code once tokens exist. Message handling is written. Native slash clicks are not.
- `docs/DECISIONS.md` 2026-09-23 still describes an in-memory conversation Map. Superseded 2026-09-26.
- `register-discord-commands.ts` says handlers live in `commands.ts`. That file publishes names. The running Discord client does not listen for interactions.

## Left, in order

Needs the human. Do not fabricate it. Source: `docs/BLOCKERS.md` and `docs/AUDIT.md`.

1. One message to `@walrussession8_bot`, then the invites in `docs/RUNBOOK.md`. Last recorded production evidence (`docs/evidence/daily/2026-09-24.md`, 2026-09-24T18:38:40Z): 8 people with memories, 0 with 10 or more, 19 stored memories, 0 owned-mode people, 33 web turns, no other channel. Session rule is 3 people × 10 memories. Not met. No `docs/evidence/final.md`. No daily file after 2026-09-24. Same file: OpenRouter spent `$0.3232` of a `$1.0000` limit, `$0.6768` remaining. That balance is three days old.
2. A spare Slush wallet, to film `/connect` and `/disconnect` through a real wallet popup. Mechanics are proven by script (`docs/evidence/revocation-2026-09-22.md`).
3. Point a SuiNS name at the Walrus Site object above. `wal-0.sui` is the spare named in `docs/BLOCKERS.md`.
4. File the nine issue drafts and publish the article. Outward-facing. Wait for the owner. Drafts re-verified 2026-09-25. File: 01, 04, 05, 06, 09, 10, 11, 12, 13. Do not file: 02 on hold, 03 not reproduced, 07 resolved, 08 retracted. `scripts/file-issues.sh` skips those four. None contain a filed URL.
5. Merge SDK 0.1.8 only after a bench on a healthy relayer shows it is no slower.

Optional and blocked: Enoki API key and Google OAuth client, for Google sign-in. Not in the web app.

Article to publish, if the owner asks: `docs/article-final.md`. `docs/AUDIT.md` says 794 words. `docs/article.md` is the long source. Promo, video, and submission drafts exist. Nothing has been posted.

## Definition of done, against this snapshot

From `docs/GOAL.md`. Not a new audit.

1. Clone and quickstart: clean clone passed 2026-09-25 (`docs/evidence/clean-clone-2026-09-25.md`). The README three-click path no longer matches the page.
2. Live web and Telegram answer within 5 seconds: URLs are recorded live. Telegram has no recorded inbound message.
3. 3 people × 10 memories: not met. Last count above.
4. One real owned user and a filmed revoke: not done. Scripted revoke is done.
5. Claude Code recall screenshot: not run.
6. Article published, X post, promo post: drafted, not published.
7. At least 5 GitHub issues filed: nine drafts ready, none filed.
8. Airtable and DeepSurge submitted: not done. `docs/PLAN.md` checklist is unchecked.

## Since last snapshot

- 2026-09-27 — This file written against `0343083`. The same commit adds composer padding (`className="p-4"`) and reformats `chat-page.tsx`. No other product change.
- 2026-09-27 — Chat workspace plan written in `docs/CHAT-UPGRADE.md` (`6d9a4f5`). It does not replace `docs/GOAL.md`.
- 2026-09-27 — Stop a streaming reply without a second user row (`141e5c4`). Slash menu opens on `/` (`07d9471`, fade `b93b9e5`). Greeting, composer meter, user-message tint, animated text, command tables (`e6375a0`, `325438f`, `18a2d08`, `58b3f3d`). `/me` is a dashboard and `/guide` is a route (`6b7d0bd`). The 2026-09-27 snapshot's route list omitted `/guide`.
- 2026-09-28 — Choosing a slash command fills the composer and opens the usage guide. It sends on Send or Enter (`d577976`). That replaced the earlier "choosing one sends it immediately" behavior.
- 2026-09-29 — Retry, edit, copy, sidebar chat search, and follow-up suggestions (`0c845eb` on `plan/chat-workspace`, matching `origin/plan/chat-workspace`). `docs/CHAT-UPGRADE.md` marks Phase 1 items 1–8 done. Phase 0 has no written result in `docs/SPIKES.md`. Phase 2 has not started. Next coding step in that plan is Phase 2. Do not start Phase 3 until Phase 0 is written. `origin/main` is still `f4ef993`. This update did not re-run lint, tests, or `bun run demo`.
- 2026-09-29 — Phase 2 committed on `plan/chat-workspace`, not merged to `main`: `209a93f`, `bd1ab01`, `f752f79`, `dddd4d3`, `d54307e`. Panel is an aside on desktop and a sheet under 768px. There is no Memory tab. Live card, correct, hide, selection remember, composer memory toggle, and sealed citation ids are in those commits. The same UI commit scrolls long threads and copies the user message. Reopen is not wired: the page never calls `POST /api/conversations/:id/citations`, and `GET /api/conversations/:id/memories` returns index rows with null text. Phase 0 is still unwritten in `docs/SPIKES.md`. Do not start Phase 3. `bun run typecheck` and `bun run lint` passed. `@hippo/web` 101 tests passed. `@hippo/server` 127 tests passed. `@hippo/core` 12 tests passed. `@hippo/memory` `registry.test.ts` failed 2 mainnet checks (`isDelegateRegistered` returned false). That file is not in this diff. Did not run `bun run demo`.
- 2026-09-30 — Reopen citations are wired on `plan/chat-workspace`, not merged and not deployed. The page calls the citations route, keeps a partial read, and drops a late result after a chat switch. Panel text is recalled when the index row has a blob. Evidence counts a person once across guest and owned accounts. The registry test now checks the configured delegate, not a hardcoded key; 6/6 passed. `bun run typecheck`, `bun run lint`, and `bun run test` passed (web 111, server 134, memory 47, core 12). Did not run `bun run demo`. Did not apply a schema change. Phase 0 is still unwritten.
- 2026-09-30 — That work, plus the panel UI, is commit `c61996f` on `plan/chat-workspace`. Not merged to `main`. Not deployed. Desktop memory opens and closes like the sidebar: the gap width and the chat resize together while the panel slides, 200ms. Under 768px it is still the Sheet, with that component's open and close animation. Open memory is a ghost button with a brain icon. View, Correct, and Hide on a memory card are `size="sm"`, with Eye, Pencil, and EyeOff, and a gap between them. `apps/web/src/app/pages.test.tsx` passed after the panel animation (56). The card-button page test passed after the size change. The full suite was not re-run after those two UI edits. Did not run `bun run demo`. Phase 0 is still unwritten.
- 2026-09-30 — Phase 0 steps 1 and 2 ran. `account::seal_approve` accepts a `hippo-doc` prefix on `owner || counter` for the delegate, and aborts `ENoAccess` (100) for a wrong suffix or a stranger. Local encrypt of 15 bytes succeeded (316-byte ciphertext, committee server `0x686098f1…`, threshold 1). Decrypt did not: aggregator `GET /v1/service` is 401 `No API key found in request`. Written up as `docs/SPIKES.md` §14 and `docs/BLOCKERS.md`. `writeFilesFlow` was not run. Phase 3 was not started. The attach control stays disabled. Did not run `bun run typecheck`, `bun run lint`, or `bun run test`. Did not apply a schema change.
- 2026-10-01 — `main` is `dd2fdc0`, with `plan/chat-workspace` merged. Production still runs the 2026-09-25 build on `google/gemini-2.5-flash` (`/api/health`). `bun run evidence:daily` against production: 9 people with memories, 0 with 10 or more, 20 stored, 0 owned, 35 turns (33 web, 2 Telegram), verdict "nobody hit a failure they could feel", $0.5993 OpenRouter left (`docs/evidence/daily/2026-10-01.md`). `docs/GOAL.md` M12 is the plan to the deadline. Private files ship as a thin slice only if the Enoki key arrives today (M12 task 11, `docs/CHAT-UPGRADE.md` "Thin slice for the submission"); no file code exists yet. Did not run lint, tests, or `bun run demo`.
- 2026-10-01 — `sdk-0.1.8` merged into `main` at the owner's word (`f0b15d4`), pushed. The branch predated the Bun move: its `pnpm-lock.yaml` edit was dropped and `bun.lock` now pins `@mysten-incubation/memwal@0.1.8`. CI on `dd2fdc0` was already red: `packages/memory/scripts/spike-file-seal.ts` read `simulated.transaction`, which `@mysten/sui` 2.31.3 does not have; fixed in `ae0ef45`. `bun run typecheck` and `bun run lint` passed. `bun run test`: memory 47, core 12, server 141, web 140. One web test ("reconnects the last wallet") failed once under the full parallel run and passed alone and in two full web runs. `bun run smoke` (read-only) passed on 0.1.8. The healthy-relayer bench M11 asked for was not run, and neither was `bun run demo`; M12 task 4 runs the bench before deploying.
- 2026-10-02 — files not shipped: no key. `apps/web/.env` does not exist and neither it nor `.env` has `VITE_SEAL_API_KEY`, so M12 task 11 (the private-files thin slice) was skipped: no `files-thin-slice` branch, no spike re-run, no file code. Seal decrypt is still blocked as in `docs/SPIKES.md` §14. Files are out of the submission unless the owner reopens them (`docs/BLOCKERS.md`).
- 2026-10-02 — M12 agent run, nothing deployed. Model: `deepseek/deepseek-v4.1-flash` ran `bun run demo` twice, run 1 all PASS, run 2 failed style (1 of 4 in Vietnamese), so Gemini is the default in code and docs again (`921d481`); V4.1 also spoke to users about the recalled-memory block. Fixed: the first-turn "Could not load" panel (`b67c1a5`), hippo's identity and the block mentions in the prompt, checked on both models (`fc8866f`, `docs/evidence/identity-2026-10-02.md`), the README and video script prove recall with New chat (`fe26797`), ARCHITECTURE, WEB-DATA-FLOWS and PLAN drift (`0c17d08`). Following the README in a browser found and fixed three more: the phone memory sheet covering the chat, the on-Walrus line never updating, the phone sidebar staying open (`3a48c16`, `5398c0a`, `docs/evidence/first-run-2026-10-02.md`). Pre-deploy: `bun run demo` on Gemini all PASS (`demo-2026-10-02-gemini-predeploy.txt`); SDK 0.1.8 kept after an A/B/A/B/A recall bench on a healthy relayer, build `f581043` (`docs/evidence/sdk-0.1.8-bench-2026-10-02.md`); `plan-push` would have refused production's 9-statement plan, fixed and rehearsed on a local copy of the 2026-09-25 schema: applied, re-plan 0 (`ee8b54b`). Not run: `plan-push` or anything against production except the read-only `evidence:daily`, no deploy, no mainnet transaction; private files skipped, no key. `bun run evidence:daily`: unchanged, 9 people, 0 with 10, 20 stored, 0 owned, $0.5766 OpenRouter left. Last full run: `bun run typecheck` and `bun run lint` passed; `bun run test` core 14, db 4, memory 47, server 141, web 146. What the owner runs next, in order: `docs/evidence/handoff-2026-10-02.md`.
