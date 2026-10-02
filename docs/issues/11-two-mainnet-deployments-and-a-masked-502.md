# [Bug] /sponsor answers every failed simulation with the same 502 "Sponsor service error", so a wrong argument looks like an outage

### Surface

Relayer / hosted API

### Network

Mainnet (relayer.memory.walrus.xyz)

### Package version

`@mysten-incubation/memwal@0.1.8`, `@mysten/sui` 2.33; relayer `/health` `relayerVersion` 0.1.0. Re-run 2026-10-02 18:53 UTC. Code reference: `services/server/src/routes/sponsor.rs` at `main` `1e023585`.

### What happened?

Our sponsored `create_account` failed with `502 {"code":"sponsor_upstream_error","error":"Sponsor service error"}`. We treated it as an outage for a working session. The cause was one wrong object argument: the registry id from the docs, which belongs to the superseded deployment (#1032), passed to the package `GET /config` serves. Simulating the transaction ourselves named it at once. The relayer had the same information and returned a message that is identical for a genuine sponsor outage. We later hit a second, unrelated simulation abort (`EAccountAlreadyExists`, a sender that already owns an account) and got the very same 502.

### Steps to reproduce

1. Take `packageId` from `GET https://relayer.memory.walrus.xyz/config` (`0xe7c16fbe…a33b81d7f5`).
2. Build `create_account(registry, clock)` with the registry the docs list, `0x0da982cefa26864ae834a8a0504b904233d49e20fcc17c373c8bed99c75a7edd`. `GET /config` names no registry, so a client following the docs does exactly this.
3. Request sponsorship with a valid sponsor authorization: `POST /sponsor`.
4. Repeat with the current registry `0x8bf82c9e…`, with a call that is not on the allowlist, with the documented package `0xcee7a6fd…`, and with a deliberately bad authorization.

Script used: `packages/memory/scripts/probe-sponsor.ts <address>` in https://github.com/UyLeQuoc/walrus-session-8-chatbots. It requests sponsorship only; it never signs or executes a transaction.

### Expected

A failed simulation says why, or at least that the transaction itself was rejected, with the Move abort or `CommandArgumentError`. A response that means "the sponsor is down" is kept for when the sponsor is down.

### Actual

| request | response |
|---|---|
| `create_account`, `/config` package + current registry | `200`, sponsored bytes |
| `create_account`, `/config` package + documented registry | **`502 sponsor_upstream_error` "Sponsor service error"** |
| `create_account` on the documented (stale) package | `400` "Transaction kind is not permitted for sponsorship" |
| a call that is not on the allowlist | `400` "Transaction kind is not permitted for sponsorship" |
| allowlisted call, bad authorization | `401` "Invalid sponsor authorization" |

The request in row 2 is authenticated, its kind is allowed and its bytes are well formed. Simulated directly on Sui it fails with `CommandArgumentError { arg_idx: 0, kind: TypeMismatch } in command 0`. On 2026-09-25, a sender that already owned an account got the same 502 for `create_account` with the correct registry; that simulation aborts with `EAccountAlreadyExists` (abort code 3). Two different faults in the caller's transaction, one response that blames the service.

`sponsor.rs` lines 73–77 map every upstream `500..=599` to `BAD_GATEWAY`, `sponsor_upstream_error`, "Sponsor service error". The reference app's `useSponsoredTransaction.ts` then treats it as a rejected transaction and does not retry, which is right, but nothing tells the developer which argument was wrong. Row 3 has the related problem that the stale package is reported as a disallowed transaction kind rather than as an unknown or superseded package.

Returning `registryId` from `GET /config` (asked in #1032) removes the cause we hit. Passing the simulation error through fixes the class.

### Logs or error text

```shell
1b. create_account, current package, the documented registry
    502  {"code":"sponsor_upstream_error","error":"Sponsor service error","traceId":"ca81f38b-459b-4c84-b482-ed01b27dd210"}

local simulation of the same transaction:
    CommandArgumentError { arg_idx: 0, kind: TypeMismatch } in command 0
```

### Checks

- [X] I searched existing issues and this is not a duplicate.
- [X] This report contains no private keys, mnemonics, or other secrets.

<!-- hippo (walrus-session-8-chatbots): first hit 2026-09-22; re-verified 2026-09-25 and 2026-10-02 18:53 UTC. Draft 04 (stale ids in docs) dropped as a duplicate of #1032; its sponsorship row moved here. The EAccountAlreadyExists row was measured 2026-09-25 and not re-run, because it needs a sender that already owns an account. -->
