# Blockers (inputs only the human can provide)

Format: date — what — why — where it goes. Remove a line once resolved.

- 2026-09-22 — `TELEGRAM_BOT_TOKEN` — the adapter is written and typechecked but has never run. Everything it depends on is verified through the web and CLI channels, so this is the last thing standing between hippo and real users — `.env`. Get it from @BotFather: `/newbot`, or `/mybots` → the bot → API Token.
- 2026-09-22 — **A second Slush wallet with no MemWalAccount yet** — needed for spikes 3 and 4, the owned-mode flow and the revoke demo in M3 — used interactively in the browser.
  The Sessions wallet `0xf8a4da3a751fba566508deb5166196ec5530602a924b3b0c132963e98188fb04` cannot serve this: it already owns the operator account `0x4926f26b…`, and the contract allows one MemWalAccount per address. Running `/connect` with it would add a delegate key to the account hippo already writes to, so "the user owns their own account" would not be demonstrated. It is still useful for verifying the mechanics (create is skipped, add_delegate_key runs).
- 2026-09-22 — Enoki API key + Google OAuth client ID — optional, enables Google sign-in for non-crypto users in M3 — `apps/web/.env`.
- 2026-09-22 — A little WAL and SUI in the Sessions wallet — optional, for deploying the web app to Walrus Sites in M5 — wallet.
- 2026-09-22 — Neon `DATABASE_URL`, Railway project, Vercel project — needed for M5 deploy — deploy env.

- 2026-09-22 — **Owner-signed revocation test, using the Sessions wallet.** This is now the highest-risk unknown in the project, not a nice-to-have. We found that the relayer honours a delegate key that is absent from the account's on-chain `delegate_keys` (see `docs/issues/08-…`), so "revoke on chain and the bot forgets" is unproven. Test: on memory.walrus.xyz, remove one delegate key from account `0x4926f26b…`, then immediately run `pnpm smoke` with that key and record whether the relayer still accepts it, and for how long. hippo's revoke demo depends on the answer.

## Resolved

- 2026-09-22 — Operator `MEMWAL_ACCOUNT_ID` + `MEMWAL_PRIVATE_KEY`. The account ID first supplied was the delegate public key; the real object ID was resolved on-chain (see `docs/SPIKES.md` §0).
- 2026-09-22 — `OPENROUTER_API_KEY`.
