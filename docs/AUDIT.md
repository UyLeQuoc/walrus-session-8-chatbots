# Task audit — 2026-09-22

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
| 2 | `/sponsor` from a non-Walrus origin | done, CORS preflight 200, no proxy needed |
| 3 | Full connect with a fresh wallet | **blocked**, needs a second Slush wallet |
| 4 | `remove_delegate_key` then 401 | **blocked**, needs the owner wallet |
| 5 | Recall quality A/B | done, `SPIKES.md` §5 |
| 6 | Streaming through Hono | done, `curl -N` and the web page |
| 7 | Manual SEAL decrypt | **n/a**, `seal_approve` refuses our key because it is not on chain (`issues/08`) |
| 8 | Security Delete API | **n/a**, it only covers pre-migration blobs (`issues/09`) |
| 9 | Enoki zkLogin | **blocked**, needs an Enoki key and a Google OAuth client |
| 10 | Walrus Sites deploy | **blocked**, needs WAL in the Sessions wallet |
| 11 | Explorer links | done, four patterns in `packages/memory/src/links.ts` |

## M2 — Guest mode

| # | Task | Status |
|---|---|---|
| 1 | Web guest identity and `GET /api/me` | done |
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
| 4 | Migration or dual-read | done, dual-read |
| 5 | `/disconnect` | done, and it destroys hippo's copy of the key |
| 6 | `/me` page | done: memory list, storage expiry, blob and ciphertext links, wallet sign-in, Claude Code steps, survey link when configured. No permanent delete, because none exists (`issues/09`) |
| 7 | `/whoami` | done |
| 8 | Recorded revoke demo | **blocked**, needs a wallet |
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
| 1 | Railway config | done, `Dockerfile` and `railway.toml`; **blocked** on the account |
| 2 | Web deploy config | done, `vercel.json` and `ws-resources.json`; **blocked** on accounts |
| 3 | README with troubleshooting | done, including the 401 causes, staging versus mainnet, and namespaces |
| 4 | Evidence folder and cadence | done, `docs/evidence/` plus the daily step in `RUNBOOK.md` |
| 5 | Survey link on `/start` and `/me` | done, shown when `SURVEY_URL` is set; **blocked** on creating the WalForm |

## M6 — Real use

Everything is ready and nothing can start. `RUNBOOK.md` holds the invite text,
consent rules and daily checklist. Telegram is live and has never received a
message, which needs a Telegram account.

## M7 — Article, promo, submission

Tasks 1 to 5 are drafted: `article.md`, `video.md`, `promo.md`, `submission.md`,
with `[M6]` and `[HUMAN]` marking what is missing. Task 6 is the human
publishing and submitting.

## Conclusion

Every task that does not require the account owner, a second wallet, a deploy
account or real people is done. The three things that would unblock the most, in
order of risk:

1. An owner-signed revocation test. It decides whether the central demo stands.
2. One message to `@walrussession8_bot`, then the invites.
3. A second Slush wallet with no MemWalAccount.
