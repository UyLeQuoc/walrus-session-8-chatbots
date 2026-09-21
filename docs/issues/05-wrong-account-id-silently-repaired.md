# A wrong `x-account-id` is silently repaired on mainnet and fatal on testnet

## Summary

We spent the first hour of a build with `MEMWAL_ACCOUNT_ID` set to the delegate
*public key* instead of the `MemWalAccount` object ID. Every call succeeded:
`health`, `remember`, `recall`, `stats`, `agents`. Nothing warned us.

The account id is part of the canonical signing string, so the server sees it,
but a mismatched value is not rejected. Per `docs/api/memory-read-api.md` the
resolution order is cache → the `x-account-id` hint → a bounded on-chain registry
scan, and the scan silently repairs a wrong hint.

That scan runs over Sui JSON-RPC, which testnet no longer serves, so the *same*
configuration fails with a bare `401` there.

## Expected

Either the account id is verified against the delegate key and a mismatch is
rejected, or the response carries a warning header saying the hint was wrong and
the account was resolved by scan.

## Actual

Silent success on mainnet, `401` with no explanation on testnet, and no way for a
developer to discover the misconfiguration until they switch network.

## Contributing factor

The three values a developer copies are all `0x`-prefixed 64-hex strings and the
dashboard presents them close together:

- wallet address (owner)
- `MemWalAccount` object id
- delegate public key, which the session submission form calls `MEMWAL_AGENT_ID`

Naming the account id `MEMWAL_ACCOUNT_ID` and the delegate public key
`MEMWAL_AGENT_ID` makes them sound like the same kind of thing.

## Asks

1. Reject or warn on a mismatched `x-account-id`.
2. Label the three values distinctly in the dashboard, ideally with a one-line
   "this is the object id, not your wallet" hint.
3. Ship a `whoami`-style helper in the SDK so a developer can print what their
   credentials actually resolve to. (See the separate issue: `GET /api/whoami`
   currently 404s on the managed mainnet relayer.)
