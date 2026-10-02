# [Bug] Decrypting your own mainnet memory without the relayer needs an Enoki Seal API key the docs never mention, and the SDK's default key servers fail first with "Not enough shares"

### Surface

TypeScript SDK (@mysten-incubation/memwal)

### Network

Mainnet (relayer.memory.walrus.xyz)

### Package version

`@mysten-incubation/memwal@0.1.8`, `@mysten/seal` 1.4.13, `@mysten/sui` 2.33; relayer `/health` `relayerVersion` 0.1.0. Docs and SDK at `main` `1e023585`.

### What happened?

We wanted an owner to read their own memory without the relayer: download the ciphertext from a public Walrus aggregator and decrypt it with the account's key, since `seal_approve` admits the owner and delegates. It works, but only after three misleading errors and an API key from a separate product. Memories the hosted mainnet relayer writes are sealed by a committee key server that the SDK's mainnet defaults do not include, and that server is reachable only through an aggregator that refuses requests without an Enoki "Seal Key Server" API key. Nothing in the Walrus Memory docs says so.

### Steps to reproduce

1. Take a blob id written by the hosted mainnet relayer and download it from `https://aggregator.walrus-mainnet.walrus.space/v1/blobs/<blobId>`. Parse it with `EncryptedObject.parse`: package `0xe7c16fbe…`, threshold 1, one key server `0x686098f1439237fff9f36b99c7329683c22979d2005c2465cb891acb012a7595`, weight 1.
2. Decrypt with the SDK's default mainnet servers (`DEFAULT_SEAL_SERVER_CONFIGS.mainnet` in `packages/sdk/src/manual.ts`: Overclock `0x145540d9…` and Studio Mirai `0xe0eb52eb…`).
3. Use the server from the ciphertext instead.
4. Add `aggregatorUrl: "https://seal-aggregator-mainnet.mystenlabs.com"`.
5. Add a Seal Key Server API key issued through Enoki, sent as `X-API-Key` (`apiKeyName: "X-API-Key"`, `apiKey`).

Script used: `packages/memory/scripts/spike-decrypt.ts <blobId>` in https://github.com/UyLeQuoc/walrus-session-8-chatbots. It takes the key servers and threshold from the ciphertext.

### Expected

The manual-mode and configuration docs say that mainnet memories are sealed by a committee key server, give its object id and aggregator, and say that the aggregator needs an API key and where to get one. The SDK's mainnet defaults match what the hosted relayer seals with, or the client takes the servers from the ciphertext, which already names them.

### Actual

| step | result |
|---|---|
| 2, SDK defaults | `Error: Not enough shares. Please fetch more keys.` It reads like a permission problem and is not one. |
| 3, server from the ciphertext | `InvalidClientOptionsError: Committee server 0x686098f1… requires aggregatorUrl in config` |
| 4, mainnet aggregator | `GeneralError: No API key found in request` |
| 5, with the Enoki key | plaintext, no relayer involved (2026-10-02) |

`docs/reference/configuration.md` (line 87) and `docs/reference/environment-variables.md` (lines 185–188) say committee configs need `aggregatorUrl`, and `apiKeyName`/`apiKey` appear in the config shape, but no page says mainnet needs a key or how to obtain one; the only aggregator they name is the testnet one. "Not enough shares" cost us a session: we read it as our delegate key not being registered.

### Logs or error text

```shell
Error: Not enough shares. Please fetch more keys.
InvalidClientOptionsError: Committee server 0x686098f1439237fff9f36b99c7329683c22979d2005c2465cb891acb012a7595 requires aggregatorUrl in config
GeneralError: No API key found in request   (Seal requestId 4eaeff6c-a925-41e1-aa24-7789560f36ce)
```

### Checks

- [X] I searched existing issues and this is not a duplicate.
- [X] This report contains no private keys, mnemonics, or other secrets.

<!-- hippo (walrus-session-8-chatbots): first measured 2026-09-22; still failing 2026-09-25 without a key; decrypted 2026-10-02 with an Enoki Seal Key Server API key, blob m7IqwAQS6mIO42v59pH4H3bqDrrmhndbaLA5bX7-dI8. Reworded 2026-10-03 from "an owner cannot decrypt". -->
