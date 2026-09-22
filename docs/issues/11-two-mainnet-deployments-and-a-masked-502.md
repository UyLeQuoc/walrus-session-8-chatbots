# `/config` names a package but not its registry, and the mismatch surfaces as "Sponsor service error"

## What we observed

There are two Walrus Memory deployments live on Sui mainnet, and they are
separate packages rather than an upgrade of one another:

| | package | registry object | registry's Move type |
|---|---|---|---|
| documented | `0xcee7a6fd…958a24c6` | `0x0da982ce…c75a7edd` | `0xcee7a6fd…::account::AccountRegistry` |
| served by `GET /config` | `0xe7c16fbe…a33b81d7f5` | `0x8bf82c9e…e9cf199f` | `0xe7c16fbe…::account::AccountRegistry` |

A published upgrade keeps its original type address, so an `AccountRegistry`
belonging to the newer package would still be typed `0xcee7a6fd…` if it were an
upgrade. It is not. These are two independent deployments, each with its own
registry and its own account objects.

`GET /config` returns `packageId` and never returns a registry id, so a client
that takes the package from `/config` — as the documentation tells you to, since
the documented package is stale (see `04-stale-mainnet-package-id.md`) — and the
registry from the documentation ends up calling the new package with the old
package's registry.

The result is a type mismatch on argument 0 of `create_account`. What the
relayer reports is this:

```
POST /sponsor
502 {"code":"sponsor_upstream_error","error":"Sponsor service error","traceId":"…"}
```

Four probes, all with the same sender and the same signature scheme, isolate it:

| request | response |
|---|---|
| `create_account`, new package + **old** registry | `502 sponsor_upstream_error` |
| `create_account`, new package + **new** registry | `200`, sponsored bytes returned |
| a call that is not on the sponsorship allowlist | `400 Transaction kind is not permitted` |
| allowlisted call, deliberately invalid authorization | `401 Invalid sponsor authorization` |

So the request was authenticated, the transaction kind was permitted, and the
bytes were well formed. The only defect was one wrong object argument, and the
error says nothing about it.

Simulating the same transaction ourselves names the fault immediately:

```
CommandArgumentError { arg_idx: 0, kind: TypeMismatch } in command 0
```

`scripts/probe-sponsor.ts` in this repository reproduces the whole table.

## Why this matters

Sponsored transactions are the entire onboarding path: they are what lets a user
own their memory without ever holding SUI. When that path fails, it fails at the
first thing a new user ever does.

The 502 is indistinguishable from an outage. `useSponsoredTransaction.ts` in the
reference app reads it as "the transaction was rejected by the sponsor (it may
be invalid or already applied)" and deliberately does not retry it, which is
correct behaviour for a genuinely rejected transaction and useless for
diagnosis. We spent a working session treating it as a Walrus-side outage,
measured against mainnet to show the sponsor was healthy for other clients, and
only found the cause by executing the transaction ourselves and reading the
simulation error the relayer had swallowed.

The same mismatch has a second and worse effect, which we hit before we noticed
this one. A client pointed at the old registry resolves an owner to that
deployment's account object. The account object is real, it is active, and it
carries delegate keys, so nothing looks wrong. It is simply the wrong account.
That produced a finding we drafted and have now retracted
(`08-relayer-honours-a-delegate-the-chain-does-not.md`): our delegate key was
absent from the account we were reading, and we concluded the relayer was
authorizing a key the chain did not list. It was listed, on the account in the
deployment the relayer actually uses.

## What would fix it

1. Return `registryId` from `GET /config` beside `packageId`. A client that
   reads both from one place cannot mix deployments. This is the whole fix.
2. Pass the upstream simulation error through, or at least its
   `CommandArgumentError`, instead of collapsing every upstream failure into
   `sponsor_upstream_error`. A wrong argument and a sponsor outage should not be
   the same response.
3. Update the mainnet package and registry ids in the documentation, or say
   plainly which deployment is current.

## Reproducing

```bash
pnpm --filter @hippo/memory exec tsx scripts/probe-sponsor.ts <your-address>
```

With `MEMWAL_REGISTRY_ID` set to `0x0da982ce…` the first probe returns 502. With
it set to `0x8bf82c9e…` the same probe returns 200 and sponsored bytes.

Measured 2026-09-22 against `https://relayer.memory.walrus.xyz`, relayer version
0.1.0, mainnet.
