# Blockers (inputs only the human can provide)

Format: date — what — why — where it goes. Remove a line once resolved.

- 2026-09-22 — **One message to @walrussession8_bot from a real Telegram account.** The adapter is now live and polling, and its seven commands are registered, but nobody has ever sent it a message. It cannot be tested from here: sending requires a Telegram account, which the bot API does not provide. Open Telegram, message the bot, and the M6 baseline week can start the same day. `docs/RUNBOOK.md` has the invite text ready.
- 2026-09-22 — **A second Slush wallet with no MemWalAccount, for filming the demo.** The mechanics are proven by script (see Resolved), so this is no longer blocking; it is needed to film `/connect` and `/disconnect` driven by a real wallet popup. The Sessions wallet cannot serve: it already owns an account in each deployment (`0x4926f26b…` and `0x5a257802…`) and the contract allows one per address.
- 2026-09-22 — Enoki API key + Google OAuth client ID — optional, enables Google sign-in for non-crypto users in M3 — `apps/web/.env`.
- 2026-09-22 — **Point a SuiNS name at the Walrus Site.** The site is deployed and on chain at `0x65eec4835f094c4c3d642f76f60ac983e0ddd08f715842e349daa11edb2a2078`, but `wal.app` only serves sites that have a name, and the base36 subdomain 404s there. The Sessions wallet already owns `wal-0.sui`, `uydev.sui` and `walform.sui`, so nothing needs buying: on suins.io, point one (`wal-0.sui` is the obvious spare) at that object id. It is a transaction from that wallet, which lives in Slush. `CORS_ORIGIN` already allows all three `*.wal.app` origins, so it works immediately with no redeploy.

## Resolved

- 2026-09-22 — **Owner-signed revocation test.** No longer needs a human or the Sessions wallet. A local keystore wallet held no MemWalAccount, and every account transaction is sponsored, so `scripts/spike-revoke.ts` ran the whole flow end to end at no cost: create account, add key, write and recall, remove key, then poll. **The relayer refused the removed key after about 32 seconds.** The central claim holds. See `docs/evidence/revocation-2026-09-22.md` and `docs/SPIKES.md` §J.

- 2026-09-22 — **A second wallet with no MemWalAccount.** Also resolved by the keystore wallet above, `0x86fcc7fd…`, which now owns account `0xa5c9d961…` created through hippo's own code path. The owned-mode mechanics are demonstrated; only the browser wallet-popup version of the flow is still unexercised, and that is part of the demo film rather than a blocker.

- 2026-09-22 — Deploy. Neon database, Railway service and Vercel project are live and verified end to end: https://hippo-web-ten-nu.vercel.app and https://hippo-server-production.up.railway.app. See `docs/evidence/deploy-2026-09-22.md`.

- 2026-09-22 — `TELEGRAM_BOT_TOKEN`. Verified against `getMe`: `@walrussession8_bot`, id 8855774095, no webhook set so long polling is free. The adapter starts, registers its commands, and shares the turn handler already verified through the web and CLI channels.

- 2026-09-22 — Operator `MEMWAL_ACCOUNT_ID` + `MEMWAL_PRIVATE_KEY`. The account ID first supplied was the delegate public key, so it was resolved on-chain (`docs/SPIKES.md` §0). That resolution then found the account in the **wrong deployment** and stood for a week, which is what produced the retracted issue 08; the correct id is `0x5a257802…`, in the deployment `GET /config` reports. See `docs/SPIKES.md` §I.
- 2026-09-22 — `OPENROUTER_API_KEY`.
