# [Bug] Rate-limit docs disagree with the code and the hosted relayer: 30/min per delegate key documented, 60 enforced; analyze documented at 10 points, weighed at 5

### Surface

Docs

### Network

Mainnet (relayer.memory.walrus.xyz)

### Package version

Docs and code at `main` `1e023585` (2026-10-02). Relayer `/health`: `relayerVersion` 0.1.0. SDK `@mysten-incubation/memwal@0.1.8`.

### What happened?

We paced a multi-tenant backend (one operator delegate key for every user, as in `docs/sdk/cookbook-multi-tenant.md`) from the documented limits. The hosted relayer enforces a different per-key limit than the docs state, and the documented endpoint weights disagree with `endpoint_weight()`, which applies them. #1073 reports the weights as undocumented; they are documented, and the documented numbers are wrong.

### Steps to reproduce

1. Read `docs/relayer/overview.md` lines 101–113: delegate key "independently limited to **30 points / minute**"; `/api/analyze` = 10 points; `/api/remember` = 5; `/api/restore` and `/api/remember/manual` = 3; `/api/ask` = 2.
2. Read `endpoint_weight()` in `services/server/src/rate_limit.rs` (line 142) and the default `max_requests_per_delegate_key: 30` (line 70).
3. Send weighted requests from one delegate key to `https://relayer.memory.walrus.xyz` until it answers 429, and read the error.

### Expected

One set of numbers. The per-key limit in the docs matches what the hosted relayer enforces, and the weight list matches `endpoint_weight()`.

### Actual

| | `docs/relayer/overview.md` | `endpoint_weight()` |
|---|---|---|
| `/api/analyze` | 10 | **5** |
| `/api/remember` | 5 | 5 |
| `/api/remember/bulk` | not listed | **10** |
| `/api/restore`, `/api/remember/manual` | 3 | 3 |
| `/api/ask` | 2 | 2 |
| `/api/embed` | not listed | **2** |
| `/v1/owners/:owner/agents` | not listed | **2** |
| everything else, including recall | 1 | 1 |

The per-key limit is 30 in the docs and in the code default, and the hosted relayer answers with 60 (step 3). #1073 got the same 60/min error. #686 quotes a 30/min error in August and 60 in a later comment, so the hosted value has changed at least once while the docs stayed at 30; the deployment appears to set `RATE_LIMIT_DELEGATE_KEY_PER_MINUTE=60`.

A client that paces from the docs runs at half the real ceiling. One that paces from the error message trusts a number the docs contradict. And `analyze`, the heaviest call, costs half what the docs say.

### Logs or error text

```shell
{"error":"Rate limit exceeded","layer":"delegate_key","limit":"60 weighted-requests/min","retry_after_seconds":60}
```

### Checks

- [X] I searched existing issues and this is not a duplicate.
- [X] This report contains no private keys, mnemonics, or other secrets.

<!-- hippo (walrus-session-8-chatbots): first observed 2026-09-22; re-checked 2026-10-03 against main 1e023585. Related: #1073 (says undocumented), #686 (60/min measured), #1002 (different bug), #1114 and #1116 (2026-10-05, account burst cap and remember bursts; a different layer). The 60/min was not re-measured on 2026-10-03 because tripping it throttles a key live users share. -->
