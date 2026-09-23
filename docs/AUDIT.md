# Task audit — 2026-09-23

Every numbered task in `docs/GOAL.md`, checked against the codebase rather than
against memory. Written because "all unblocked work is done" is a claim that
should be auditable, and because auditing it three times turned up real gaps each
time: the delete UI that could not exist, the restore tool that does not work,
`/start` dumping a command list, and the survey link that was never wired.

Legend: **done** verified by a command or a file; **blocked** needs something
only the account owner can provide; **n/a** superseded by a finding.

## M1 — Spikes

| # | Task | Status |
|---|---|---|
| 1 | Write and recall on mainnet | done, `pnpm smoke --write`, blob in `SPIKES.md` §1 |
| 2 | `/sponsor` from a non-Walrus origin | done for CORS, preflight 200, no proxy needed. The endpoint itself then failed every call for a week on our own registry mismatch (`issues/11`), and account setup now falls back to a user-paid transaction when sponsorship is refused |
| 3 | Full connect with a fresh wallet | **done 2026-09-22** by script, not by browser. A local keystore wallet owned no account, so `scripts/spike-revoke.ts` created one (`0xa5c9d961…`) and registered a delegate key, both sponsored |
| 4 | `remove_delegate_key` then 401 | **done 2026-09-22**. Refused after about 32s, still accepted at 15s. `docs/evidence/revocation-2026-09-22.md` |
| 5 | Recall quality A/B | done, `SPIKES.md` §5 |
| 6 | Streaming through Hono | done, `curl -N` and the web page |
| 7 | Manual SEAL decrypt | **attempted 2026-09-23 and blocked, for a real reason this time.** `seal_approve` passes with the corrected account. Mainnet ciphertext is sealed by a committee key server the SDK does not default to, reachable only through an aggregator that answers `No API key found in request`. `issues/12`; the spike now takes its key servers from the ciphertext |
| 8 | Security Delete API | **n/a**, it only covers pre-migration blobs (`issues/09`) |
| 9 | Enoki zkLogin | **blocked**, needs an Enoki key and a Google OAuth client |
| 10 | Walrus Sites deploy | done, site object on chain; **blocked** only on pointing a SuiNS name at it so `wal.app` serves it |
| 11 | Explorer links | done, four patterns in `packages/memory/src/links.ts` |

## M2 — Guest mode

| # | Task | Status |
|---|---|---|
| 1 | Web guest identity and `GET /api/me` | done, and now four siblings: `/api/me/memories`, `/api/me/account`, `/api/me/search`, `/api/me/{connect,disconnect}` |
| 2 | Commands shared by every channel | done, in `apps/server/src/commands.ts` rather than `packages/core` because they need the database |
| 3 | Style adaptation, verified by an eval | done, `pnpm demo` fails if the reply is not Vietnamese |
| 4 | Per-person throttle | done, and commands count against it |
| 5 | `pnpm demo` | done, asserts recall, style and cross-channel |
| 6 | `pnpm evidence` | done, counts only memories that landed, excludes commands from turn counts |
| 7 | Telegram polish | done: typing indicator, 3900-char chunking on newlines with tests, plain text, and `/start` explains ownership in three sentences instead of listing commands |

## M3 — Owned mode

| # | Task | Status |
|---|---|---|
| 1 | `POST /api/connect/start` | done |
| 2 | Wallet page with sponsored calls | done, untested against a wallet |
| 3 | Server verification of the grant | done, and the object's Move type is checked; five mainnet tests |
| 4 | Migration or dual-read | **done 2026-09-23**, dual-read. It was marked done here, in ARCHITECTURE and in IDEA while nothing implemented it: `portFor` returned an owned-only scope, so `/connect` silently orphaned every guest memory at the exact moment a person took ownership. Found by auditing the claims against the code rather than re-reading the claims |
| 5 | `/disconnect` | done, and it destroys hippo's copy of the key |
| 6 | `/me` page | done, and rebuilt 2026-09-22: an on-chain panel reading the `MemWalAccount` off Sui with every delegate key and a revoke button, type filter, search that reads text back from Walrus, memory list with storage expiry and blob and ciphertext links, wallet sign-in, Claude Code steps, survey link when configured. No permanent delete, because none exists (`issues/09`) |
| 7 | `/whoami` | done |
| 8 | Recorded revoke demo | measured and written up; the **screen recording** still needs a wallet and a spare address |
| 9 | Claude Code recall screenshot | **blocked**, needs a wallet |

## M4 — Channels and linking

| # | Task | Status |
|---|---|---|
| 1 | Discord adapter live, slash commands registered | code done, registration is one command; **blocked** on a token |
| 2 | Slack adapter live | code done, `docs/slack-manifest.yaml` removes the setup clicking; **blocked** on tokens |
| 3 | Cross-channel linking | done, verified web-to-CLI and asserted in `pnpm demo` |
| 4 | CLI documented | done |

## M5 — Deploy and reproducibility

| # | Task | Status |
|---|---|---|
| 1 | Railway config | done and **live**: https://hippo-server-production.up.railway.app |
| 2 | Web deploy config | done and **live**: https://hippo-web-ten-nu.vercel.app, plus a Walrus Site awaiting a SuiNS name |
| 3 | README with troubleshooting | done, and it now opens with the two-deployment trap, which is the failure most likely to cost a reader a week |
| 4 | Evidence folder and cadence | done, `docs/evidence/` plus the daily step in `RUNBOOK.md` |
| 5 | Survey link on `/start` and `/me` | done, shown when `SURVEY_URL` is set; **blocked** on creating the WalForm |

## M6 — Real use

Everything is ready and nothing can start. `RUNBOOK.md` holds the invite text,
consent rules and daily checklist. Telegram is live and has never received a
message, which needs a Telegram account. This is now the only unmet judging
criterion: `pnpm evidence` against production reads 5 people and 13 memories,
where the session asks for 3 people with 10 each.

## M7 — Article, promo, submission

Drafted and **corrected 2026-09-23**. Every one of them had been built around the
retracted finding, and `submission.md` named the account in the superseded
deployment, which a judge would have followed to six delegate keys that are not
ours. The article now leads its "what broke" section with the retraction and the
real bug, carries the revocation timings, and states the decryption limit.
`[M6]` and `[HUMAN]` still mark what is missing. Task 6 is the human publishing
and submitting; nothing outward-facing has been posted.

The one thing an editor should know: the draft body is about 1,950 words against
an original target of 500 to 800. The header names which sections to cut and
which two never to cut.

## Conclusion

Every task that does not require the account owner or real people is done. The
revocation test, which sat at the top of this list since the first day and was
believed to need a human, turned out to need neither a human nor a wallet: a
local keystore address with no account plus sponsored transactions ran the whole
flow in a minute. Checking a thing yourself is cheaper than it looks, and twice
now this audit has found something filed as blocked that was not.

What is left, in order of value:

1. One message to `@walrussession8_bot`, then the invites in `RUNBOOK.md`. The
   only unmet judging criterion, and the only one that needs calendar time.
2. A spare Slush wallet, to **film** connect and disconnect through a real wallet
   popup. The mechanics are proven; this is for the video.
3. A SuiNS name pointed at the Walrus Site object, so `wal.app` serves it.
4. Filing the eleven issue drafts and publishing the article. Both are
   outward-facing and wait on the owner's word.
