# Blockers (inputs only the human can provide)

Format: date — what — why — where it goes. Remove a line once resolved.

- 2026-09-22 — **One message to @walrussession8_bot from a real Telegram account.** The adapter is now live and polling, and its seven commands are registered, but nobody has ever sent it a message. It cannot be tested from here: sending requires a Telegram account, which the bot API does not provide. Open Telegram, message the bot, and the M6 baseline week can start the same day. `docs/RUNBOOK.md` has the invite text ready.
- 2026-09-22 — **A second Slush wallet with no MemWalAccount yet** — needed for spikes 3 and 4, the owned-mode flow and the revoke demo in M3 — used interactively in the browser.
  The Sessions wallet `0xf8a4da3a751fba566508deb5166196ec5530602a924b3b0c132963e98188fb04` cannot serve this: it already owns the operator account `0x4926f26b…`, and the contract allows one MemWalAccount per address. Running `/connect` with it would add a delegate key to the account hippo already writes to, so "the user owns their own account" would not be demonstrated. It is still useful for verifying the mechanics (create is skipped, add_delegate_key runs).
- 2026-09-22 — Enoki API key + Google OAuth client ID — optional, enables Google sign-in for non-crypto users in M3 — `apps/web/.env`.
- 2026-09-22 — **Point a SuiNS name at the Walrus Site.** The site is deployed and on chain at `0x65eec4835f094c4c3d642f76f60ac983e0ddd08f715842e349daa11edb2a2078`, but `wal.app` only serves sites that have a name, and the base36 subdomain 404s there. The Sessions wallet already owns `wal-0.sui`, `uydev.sui` and `walform.sui`, so nothing needs buying: on suins.io, point one (`wal-0.sui` is the obvious spare) at that object id. It is a transaction from that wallet, which lives in Slush. `CORS_ORIGIN` already allows all three `*.wal.app` origins, so it works immediately with no redeploy.


- 2026-09-22 — **Owner-signed revocation test, using the Sessions wallet.** This is now the highest-risk unknown in the project, not a nice-to-have. We found that the relayer honours a delegate key that is absent from the account's on-chain `delegate_keys` (see `docs/issues/08-…`), so "revoke on chain and the bot forgets" is unproven. Test: on memory.walrus.xyz, remove one delegate key from account `0x4926f26b…`, then immediately run `pnpm smoke` with that key and record whether the relayer still accepts it, and for how long. hippo's revoke demo depends on the answer.

## Resolved

- 2026-09-22 — Deploy. Neon database, Railway service and Vercel project are live and verified end to end: https://hippo-web-ten-nu.vercel.app and https://hippo-server-production.up.railway.app. See `docs/evidence/deploy-2026-09-22.md`.

- 2026-09-22 — `TELEGRAM_BOT_TOKEN`. Verified against `getMe`: `@walrussession8_bot`, id 8855774095, no webhook set so long polling is free. The adapter starts, registers its commands, and shares the turn handler already verified through the web and CLI channels.

- 2026-09-22 — Operator `MEMWAL_ACCOUNT_ID` + `MEMWAL_PRIVATE_KEY`. The account ID first supplied was the delegate public key; the real object ID was resolved on-chain (see `docs/SPIKES.md` §0).
- 2026-09-22 — `OPENROUTER_API_KEY`.
