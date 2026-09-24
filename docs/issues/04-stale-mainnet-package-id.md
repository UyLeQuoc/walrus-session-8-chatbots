# Published mainnet contract IDs are stale, and following them breaks sponsored transactions

> **Re-verified 2026-09-25** against relayer build `5b27683` (`/health` 0.1.0), SDK 0.1.7 and 0.1.8. **Still reproduces.**
> `docs/contract/overview.md:52` and `apps/app/.env.example:63` in MemWal `main`
> (`3182c16`) still name package `0xcee7a6fd…`, while `GET /config` serves
> `0xe7c16fbe…`.

## Summary

`docs/contract/overview.md` and `apps/app/.env.example` give the mainnet package as

```
MEMWAL_PACKAGE_ID=0xcee7a6fd8de52ce645c38332bde23d4a30fd9426bc4681409733dd50958a24c6
```

The live mainnet relayer reports a different one:

```bash
curl -s https://relayer.memory.walrus.xyz/config
{"packageId":"0xe7c16fbea0560e7057e2bf7422feaa4fb313749fc69c9e9092fac7a33b81d7f5","network":"mainnet",…}
```

Both package objects exist on chain. Existing objects still carry the original
package in their type (`0xcee7a6fd…::account::MemWalAccount`), which is normal
after a Move upgrade, so nothing looks wrong until you try to write.

## Why it matters

`services/server/src/routes/sponsor.rs` validates a sponsored transaction against
the relayer's configured package. A `create_account` or `add_delegate_key` call
built from the documented package ID is therefore rejected by the sponsorship
allowlist. Anyone following the published docs to build a wallet onboarding flow
hits this, and the failure gives no hint that the package is the problem.

## Expected

The published contract IDs match the deployment, or the docs say plainly that the
package is upgradeable and that `GET /config` is the source of truth.

## Asks

1. Update `docs/contract/overview.md` for mainnet and testnet.
2. State in the docs that `GET /config` is authoritative for `packageId`.
3. Consider having the SDK read it, so callers do not each have to.

## Our workaround

We fetch `GET /config` at runtime and treat `MEMWAL_PACKAGE_ID` as a fallback.

## Update, 2026-09-22

This is worse than a stale number. The documented package and the one `/config`
serves are two **separate deployments**, each with its own registry and its own
account objects, not one package upgraded in place. Taking the package from
`/config` and the registry from the docs therefore does not merely use an old
contract, it mixes two live systems: sponsorship fails with an opaque 502, and
an owner lookup returns a real, active, wrong account. See
[11-two-mainnet-deployments-and-a-masked-502.md](11-two-mainnet-deployments-and-a-masked-502.md).
