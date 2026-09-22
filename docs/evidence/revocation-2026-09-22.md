# Revoking a delegate key on chain does end the bot's access

Measured on Sui mainnet, 2026-09-22, against `https://relayer.memory.walrus.xyz`
(relayer 0.1.0), package `0xe7c16fbe…a33b81d7f5`.

This is the claim the whole project rests on: your memory is yours, and you can
take hippo's access away. Until today it was an assumption. It is now measured.

## Method

`packages/memory/scripts/spike-revoke.ts`, run against a wallet that held no
MemWalAccount, so nothing of value was revoked:

1. create a `MemWalAccount` for that wallet
2. add a fresh delegate key, and wait for the chain to list it
3. write a memory with that key and recall it, proving the key works
4. remove the delegate key on chain, and wait for the chain to stop listing it
5. keep calling `recall` with the removed key every 15s until the relayer refuses

## Result

```
1. account 0xa5c9d9610a107a9c916cda16e5af90d45f74c348180339194b2a8bd505f2b388

2. registering a delegate key: 638f4495bcf36528…
   tx FrFF5AupnGM2XQktFxiQGabPBySTRzFBQmHxdzJdG6SB  (gas paid by sponsor)
   on chain after 3s  (2 delegate(s) total)

3. using the key before revocation
   wrote blob bLB7fq3HJVo4ihmoE3PTb5AurRSHRzzeAKUZsnGb_0k
   recall returned 1

4. removing the delegate key on chain
   tx 24FD8mD956Ny1q2k4Kr1H9uzjiJiqcz3NtAkwZ4utQon
   gone from chain after 3s  (1 delegate(s) total)

5. does the relayer still honour the removed key?
   +0s   ACCEPTED, 0 result(s)
   +15s  ACCEPTED, 0 result(s)
   +32s  refused (401 AUTH_REJECTED)
```

**Revocation works, and it is not instant.** The key kept authenticating for at
least 15 seconds after it left the chain and was refused by 32 seconds. Both
recalls inside that window returned nothing, so the key authenticated but read
no memories; we did not establish whether that is the eviction already taking
effect on the search index or the unrelated dropped-results behaviour in
`docs/issues/01`.

## What this changes

- The central demo holds. Remove hippo's key on chain and hippo stops being able
  to read or write, without anyone at Walrus being asked and without trusting
  hippo to behave.
- Say "within about a minute", not "instantly", when describing it. A viewer
  watching the demo will see a pause.
- hippo still destroys its own encrypted copy of the delegate private key on
  `/disconnect`. That is now belt and braces rather than a necessity, and it
  closes the eviction window on our side immediately.

## Gas

Every transaction here was sponsored by the relayer. The wallet paid nothing and
never needed to hold SUI, which is what makes one-click onboarding possible.

## Note on an earlier wrong conclusion

This spike was blocked for a working session by `POST /sponsor` answering 502
`sponsor_upstream_error`. That was our own misconfiguration, not an outage: we
were passing a superseded deployment's registry object to the current package.
See `docs/issues/11-two-mainnet-deployments-and-a-masked-502.md`, which also
explains why `docs/issues/08` has been retracted.
