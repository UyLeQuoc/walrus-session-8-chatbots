# Decisions log

- 2026-09-22 — Use `ai` v7 across the repo instead of v6. `@openrouter/ai-sdk-provider` 3.x requires v7 and we do not use `withMemWal`, so nothing pins us to v6.
- 2026-09-22 — Web app is a Vite SPA, so all bots and the API live in one Hono process (`apps/server`). Long-lived gateways need a persistent process anyway.
- 2026-09-22 — CORS default allows `localhost:5173` and `5174`; the developer's machine has another app on 5173.
- 2026-09-21 — Memory writes no longer block the reply. `rememberAndWait` measured 23.7 s on mainnet; the tool now accepts the job and records the blob ID in the background (`policy.ts`, `port.ts`).
- 2026-09-21 — The package ID is read from the relayer's `GET /config` at runtime, not from the docs. The live mainnet package is an upgrade the docs do not mention, and the sponsorship allowlist compares against it.
- 2026-09-21 — Every relayer call is paced by a per-delegate-key limiter with `retry_after` handling. The observed limit is 60 weighted requests per minute, shared by all guest users on one key.
- 2026-09-21 — Default recall `maxDistance` is 0.75, not 0.6. Measured distances for clearly relevant matches ran to 0.745 once the metadata prefix was embedded with the fact.
- 2026-09-21 — Keep the `[type] [by:@user] [date]` prefix on stored memories. A/B on mainnet showed it costs 0.006 mean distance and no ranking, while buying type filtering, provenance and dates.
- 2026-09-21 — `DEFAULT_MAX_DISTANCE` is 0.8. Measured true positives reached 0.777; a 0.6 cutoff, which is what `withMemWal`'s default `minRelevance` works out to, would have dropped half of them.
- 2026-09-21 — Only the object form of `recall()` is used. The positional overload dropped every match in testing.
- 2026-09-22 — On `/disconnect`, hippo deletes its own encrypted copy of the delegate private key, not just its `revoked` flag. We cannot yet prove the relayer stops honouring a key the moment it leaves the chain (`docs/issues/08`), so hippo makes the revoke true on its own side by destroying the credential. The demo then holds regardless of what the relayer does.
- 2026-09-22 — Keep the metadata prefix and the relayer-mediated read path; client-side SEAL decryption for `/proof` is shelved. `seal_approve` refuses our delegate because it is not on chain, so manual decrypt cannot work until issue 08 is resolved. `/proof` links the public ciphertext instead, which still shows the memory is a real Walrus blob.
- 2026-09-22 — Recalls are issued one at a time, not with `Promise.all`. Measured: nine dropped recalls in one eval run with concurrent queries, zero across two runs with sequential ones. Latency is the right thing to trade for a bot that does not randomly forget.
- 2026-09-22 — The connect callback derives the user's wallet from the on-chain account owner and ignores any wallet in the request body. Trusting the body allowed an attacker who completed the flow honestly to merge a victim's person into their own session. See `docs/evidence/security-review-2026-09-21.md`.
- 2026-09-22 — Relayer metadata calls are signed with the same credential as the memory port. Signing with the operator key while naming a user's account silently redirected `/memory forget` to the operator's namespace, so the bot claimed to have forgotten things it had not.
