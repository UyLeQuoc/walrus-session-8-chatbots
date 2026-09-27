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
