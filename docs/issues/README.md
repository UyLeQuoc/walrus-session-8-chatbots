# Bug reports for MystenLabs/MemWal

Drafts to file at https://github.com/MystenLabs/MemWal/issues during the session.
Every one was hit while building hippo on the managed mainnet relayer, and every
one has a repro that runs from this repo.

Environment shared by all of them:

```
SDK:      @mysten-incubation/memwal 0.1.7 (npm latest)
Relayer:  https://relayer.memory.walrus.xyz  (mainnet, /health reports 0.1.0)
Runtime:  Node 20+, TypeScript 5.9, macOS 15
Model:    google/gemini-2.5-flash via OpenRouter (Vercel AI SDK)
Date:     2026-09-21
```

| # | Title | Severity as we hit it |
|---|---|---|
| 1 | `recall()` returns an empty list while reporting it dropped the matches | Silent data loss to the caller: the agent forgets |
| 2 | `remember` jobs die from the relayer's own Sui RPC throttling | Silent write loss after the user was told it saved |
| 3 | The two documented `recall()` call forms are not equivalent | Wrong results from a documented API |
| 4 | Published mainnet contract IDs are stale | Following the docs breaks sponsored transactions |
| 5 | A wrong `x-account-id` is silently repaired on mainnet and fatal on testnet | Misconfiguration is invisible until you switch network |
| 6 | Write rate limit is 60/min, not the documented 30/min, and the weights are unpublished | Cannot budget a multi-tenant app |
| 7 | `GET /api/whoami` returns 404; `GET /v1/owners/:owner/agents` is flaky and miscounts | Documented endpoints unusable |
| 8 | The relayer authorizes a delegate key that is not in the on-chain `delegate_keys` | Ownership model does not hold as documented |
| 9 | No way to permanently delete a memory, even as the owner | Ownership model promises control it does not provide |
| 10 | `restore()` reports `total: 0` and `truncated: false` for a namespace that has memories | The documented recovery path does not work, silently |
