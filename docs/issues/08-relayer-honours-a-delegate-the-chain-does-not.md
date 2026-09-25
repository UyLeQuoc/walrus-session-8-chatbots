# RETRACTED — the relayer was right and we were reading the wrong account

> **Retracted 2026-09-22.** This report was wrong. Our delegate key *is*
> registered on chain. We were reading a `MemWalAccount` belonging to a
> superseded mainnet deployment, because our registry id came from the
> documentation while our package id came from `GET /config`, and those are two
> different deployments rather than one upgraded package.
>
> The owner has an account in each:
>
> | deployment | account | delegates | our key present |
> |---|---|---|---|
> | `0xcee7a6fd…` (documented) | `0x4926f26b…` | 4 | no |
> | `0xe7c16fbe…` (served by `/config`, used by the relayer) | `0x5a257802…` | 6 | **yes**, labelled `WalrusSession8` |
>
> With the registry corrected, the chain and the relayer agree exactly: six
> delegates, ours among them. Nothing was bypassing on-chain access control.
>
> The SEAL decryption failure described under "Second, related symptom" has the
> same cause: `seal_approve` was evaluated against the wrong account, and it was
> correct to refuse.
>
> The real defect is that `GET /config` publishes a package id but no registry
> id, which is filed as
> [11-two-mainnet-deployments-and-a-masked-502.md](11-two-mainnet-deployments-and-a-masked-502.md).
> Ask 3 below still stands on its own and is now measured in `docs/SPIKES.md`.
>
> The original text is kept below, unedited, because the mistake is instructive:
> every individual observation in it was accurate, and the conclusion was still
> wrong.

---

## Original report (wrong)

### The relayer authorizes a delegate key that is not in the account's on-chain `delegate_keys`

## What we observed

Account `0x4926f26b7a166e146161c517723c50762988f2772024cc5de7504f7350d9b7a5`
on mainnet, read directly from the chain over gRPC, holds exactly **four**
delegate keys:

```
Web App        pub b1e00adbdf21ca48…  addr 0x9622df1c…
MCP Client     pub 61dff38788ffe8ea…  addr 0xd59aeefa…
WalrusSession5 pub 583c6eae09acc441…  addr 0x7ff307a2…
MCP Client     pub 636809f6d342bbfc…  addr 0xf2d94483…
```

The delegate key we have been building with is **not one of them**:

```
pub  f07169b63a377f86902696bf295997e3b2183043edd6024b4fc86907dfb85fa2
addr 0x45b4c24cceb05e74d4037ebcbb617adaedd4a447cbc0b189293387a823dd9449
```

It nonetheless works against the relayer for every authenticated route we have
used: `remember`, `recall` (so the relayer decrypts SEAL ciphertext for it),
`analyze`, `stats`, `restore`. And `GET /v1/owners/:owner/agents` reports **six**
delegates, including this one under the label `WalrusSession8`.

`access_counter_version` on the account is `0`, so no delegate has ever been
removed from it. This is not a stale entry left behind by a revocation.

## Why this matters

`docs/fundamentals/concepts/ownership-and-access.md` states:

> Delegate keys are registered onchain and verified on every request … The
> relayer verifies every request against the onchain contract before executing
> any operation. This means access control is tamper-proof and verifiable — no
> one can bypass it without the owner's explicit onchain approval.

For this key that is not what is happening. An owner auditing their account on
chain sees four delegates and would conclude four clients can read their
memories. Six can.

The practical worry for anyone building on this: if authorization does not come
from the on-chain vector, it is not obvious that `remove_delegate_key` promptly
ends relayer access either. We could not test that leg without the owner wallet,
and we are not asserting it fails. It needs an answer, because "revoke on chain
and access stops" is the central promise of the ownership model.

## What we ruled out

A **freshly generated keypair, never registered anywhere**, is correctly rejected:

```
recall with a random delegate key → 401
```

So this is not an open authentication bypass. The relayer knows this specific key
and considers it authorized for this account. The question is what source told it
so, and why that source disagrees with the chain.

## Likely explanations, for triage

1. The key was minted through the dashboard's delegate-key flow and recorded
   server-side while the on-chain `add_delegate_key` transaction never landed,
   with no error surfaced to the user.
2. An off-chain delegate table is consulted before, or instead of, the on-chain
   vector.
3. Something migration-related from the July 2026 cutover.

## Repro

```bash
# with MEMWAL_ACCOUNT_ID and MEMWAL_PRIVATE_KEY set
bun run packages/memory/scripts/probe-raw-account.ts   # on-chain: 4 keys, ours absent
bun run packages/memory/scripts/probe-auth.ts          # a random key is rejected: 401
bun run smoke                                                          # our key works; /agents reports 6
```

## Second, related symptom

Because the key is not on chain, SEAL's own `seal_approve` policy correctly
refuses it, so client-side decryption of our own memories fails:

```
NoAccessError: User does not have access to one or more of the requested keys
```

The relayer decrypts the same blob for the same key without complaint. Two
enforcement points, two different answers, for one credential.

## Asks

1. Explain which source authorizes a delegate, and make the docs match it.
2. Surface a failed `add_delegate_key` to the user instead of handing out a key
   that only half works.
3. Confirm that `remove_delegate_key` ends relayer access immediately, and if
   there is a cache in front of it, document the eviction window.
4. Reconcile `GET /v1/owners/:owner/agents` with the on-chain vector, or label
   which entries are not on chain. A user reads that list to decide what to revoke.
