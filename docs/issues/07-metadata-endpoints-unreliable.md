# `GET /api/whoami` returns 404 and `GET /v1/owners/:owner/agents` is flaky and miscounts

Two separate problems with the account-metadata routes, filed together because
both were hit while building the same screen.

## 1. `GET /api/whoami` returns 404 on the managed mainnet relayer

`docs/relayer/api-reference.md` documents it as a protected route whose whole
purpose is rebuilding credentials when a client has a working delegate key but
lost the surrounding metadata. That is exactly our case: it is the natural way to
answer "which account does this key belong to?".

```
GET https://relayer.memory.walrus.xyz/api/whoami   → 404
```

Signed with valid credentials that work on every other protected route.

## 2. `GET /v1/owners/:owner/agents` returns 500 intermittently

Same owner, same credentials, minutes apart, no pattern we could find:

```
500 {"error":"Internal server error (traceId: 9657f4b7-dc8d-4449-b918-6e28cd92ed4b)"}
500 {"error":"Internal server error (traceId: 7ef15cde-c149-4b1f-a52a-eb16e72d9920)"}
500 {"error":"Internal server error (traceId: a53e95d6-a231-4dde-a46d-bb2e8f2bcb67)"}
200 {"agents":[…6 entries…],"snapshot_version":2}
```

The docs note this route makes a live on-chain `sui_getObject` call. Public Sui
fullnodes have retired JSON-RPC, which would explain a systematic failure; the
intermittency suggests a fallback that sometimes works.

## 3. The same route reports more delegate keys than the account holds

For account `0x4926f26b7a166e146161c517723c50762988f2772024cc5de7504f7350d9b7a5`:

- `GET /v1/owners/:owner/agents` → **6** delegate keys
- Reading the `MemWalAccount` object directly over gRPC → **4** entries in
  `delegate_keys`

We use this route to show a user which agents can read their memory, so an
inflated list is a privacy-relevant inaccuracy, not a cosmetic one. If the route
is deliberately returning historical keys, that needs saying, because a user
looking at that list is deciding whether to revoke something.

## Asks

1. Mount `whoami` on the managed relayer, or remove it from the docs.
2. Fix or document the `agents` 500s.
3. Reconcile the count with the on-chain object, or document what else is included.

## Our workaround

`scripts/smoke.ts` retries and degrades rather than failing, and `/whoami` in our
bot shows delegate labels best-effort with the on-chain read as the authority.
