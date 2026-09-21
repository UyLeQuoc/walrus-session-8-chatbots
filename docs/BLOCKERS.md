# Blockers (inputs only the human can provide)

Format: date — what — why — where it goes. Remove a line once resolved.

- 2026-09-22 — `TELEGRAM_BOT_TOKEN` — Telegram adapter cannot start, blocks M2 verification on that channel — `.env`. Get it from @BotFather: `/newbot`, or `/mybots` → the bot → API Token.
- 2026-09-22 — A second Slush wallet (not the Sessions wallet) with no MemWalAccount yet — needed for spikes 3 and 4, the whole owned-mode flow and the revoke demo in M3 — used interactively in the browser.
- 2026-09-22 — Enoki API key + Google OAuth client ID — optional, enables Google sign-in for non-crypto users in M3 — `apps/web/.env`.
- 2026-09-22 — A little WAL and SUI in the Sessions wallet — optional, for deploying the web app to Walrus Sites in M5 — wallet.
- 2026-09-22 — Neon `DATABASE_URL`, Railway project, Vercel project — needed for M5 deploy — deploy env.

## Resolved

- 2026-09-22 — Operator `MEMWAL_ACCOUNT_ID` + `MEMWAL_PRIVATE_KEY`. The account ID first supplied was the delegate public key; the real object ID was resolved on-chain (see `docs/SPIKES.md` §0).
- 2026-09-22 — `OPENROUTER_API_KEY`.
