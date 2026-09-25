# The mainnet relayer seals with a committee key server, so an owner cannot decrypt their own memory

> **Re-verified 2026-09-25** against relayer build `5b27683` (`/health` 0.1.0), SDK 0.1.7 and 0.1.8. **Still reproduces.** Decrypting
> blob `m7IqwAQS6mIO42v59pH4H3bqDrrmhndbaLA5bX7-dI8` with the account's own key
> fails with `No API key found in request` (Seal requestId
> `4eaeff6c-a925-41e1-aa24-7789560f36ce`).

## What we observed

Walrus Memory's pitch is that the memory belongs to the account, not to the
application. We wanted to show that literally: download the ciphertext from a
public Walrus aggregator, decrypt it locally with the account's own delegate
key, and put the plaintext next to the ciphertext link. Anyone can fetch the
bytes; only the account can read them.

The bytes download fine. The decryption does not, and the reason is not access
control.

A memory written by the hosted mainnet relayer parses as:

```
sealed under package 0xe7c16fbe…a33b81d7f5
seal identity        f8a4da3a751fba566508deb5166196ec5530602a924b3b0c…
seal threshold       1
seal key server      0x686098f1439237fff9f36b99c7329683c22979d2005c2465cb891acb012a7595 (weight 1)
```

That key server is a **committee (decentralized) server**. The SDK's own default
mainnet configuration is two different, independent servers:

```
mainnet: [
  "0x145540d931f182fef76467dd8074c9839aea126852d90d18e1556fcbbd1208b6",  // Overclock (Open)
  "0xe0eb52eba9261b96e895bbb4deca10dcd64fbc626a1133017adcd5131353fd10",  // Studio Mirai (Open)
]
```
(`packages/sdk/src/manual.ts`, `DEFAULT_SEAL_SERVER_CONFIGS`)

Neither of them holds a share for this identity. Asking them fails as:

```
Error: Not enough shares. Please fetch more keys.
```

which reads like a permission problem and is not one. Taking the servers from
the ciphertext instead, as any correct client should, gets further:

```
InvalidClientOptionsError: Committee server 0x686098f1… requires aggregatorUrl in config
```

and supplying the mainnet aggregator ends at the real answer:

```
GeneralError: No API key found in request
```

`https://seal-aggregator-mainnet.mystenlabs.com/v1/service` returns `401`
unauthenticated, so this is the aggregator's policy rather than a client bug.

## Why this matters

As things stand, an account owner cannot read their own memory without the
relayer. Access control is genuinely on chain, and we measured that revoking a
delegate key on chain does cut the relayer off
(`docs/evidence/revocation-2026-09-22.md`). But *readability* still depends on a
service that requires an API key we were never issued and that a user has no
obvious way to obtain. "Your memory is yours" is true about permission and not
yet true about possession.

It also misleads on the way down. The first failure most people will hit is
"Not enough shares", because the SDK's defaults do not match what the hosted
mainnet relayer seals with. That error names neither the key server mismatch nor
the API key. We spent a session reading it as evidence that our delegate key was
not registered on chain, and filed a bug report saying so, which we then had to
retract (`docs/issues/08`).

## What would fix it

1. Make `DEFAULT_SEAL_SERVER_CONFIGS.mainnet` match what the hosted mainnet
   relayer actually seals with, or derive the servers from the ciphertext, which
   already names them and their threshold. A client should never have to guess
   this.
2. Say in the manual-mode documentation that mainnet memories are sealed by a
   committee server and what obtaining an aggregator API key involves. Right now
   `apiKeyName`/`apiKey` exist in the config type with no indication that
   mainnet decryption needs them.
3. Consider an unauthenticated path for an owner fetching key shares for their
   own identity, with the `seal_approve` check doing the authorising. That check
   is the real access control and it already passes for us.

## Reproducing

```bash
# a blob id this account owns
bun run packages/memory/scripts/probe-blobid.ts
bun run packages/memory/scripts/spike-decrypt.ts <blob-id>
```

The script takes the key servers and threshold from the ciphertext rather than
from a hardcoded list, which is how it got past the misleading first error.

Measured 2026-09-22 against `https://relayer.memory.walrus.xyz`, relayer 0.1.0,
`@mysten/seal` 1.4.13, mainnet.
