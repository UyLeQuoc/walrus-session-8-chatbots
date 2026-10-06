# COMMENT ON #1036 — what we measured, and no drops since 25ba0fb5

We hit this on the hosted mainnet relayer while building a chatbot on Walrus Memory, and measured it before seeing this issue. Adding our numbers in case they help confirm the fix.

**What we saw, 2026-09-22 to 2026-09-25** (`@mysten-incubation/memwal` 0.1.7 and 0.1.8, relayer `relayerVersion` 0.1.0):

- `200 {"results": [], "total": 0, "dropped_count": 5}` for a namespace that had just returned the same matches. In one run of ten queries, the last five in a row came back all-dropped; a minute later all ten answered.
- Four runs of the same eval gave 4, 9, 0 and 15 drop events, with no pattern by query or concurrency.
- On 2026-09-25, while recall was slow (medians of 9–60 s against a usual 2 s), 7 all-dropped attempts on 0.1.8 across two eval runs and 120 bench recalls, and 3 on 0.1.7 across 60. On 0.1.8, which sends the relayer its deadline, the recalls that stalled outright came back as `504 {"code":"RECALL_TIMEOUT","stage":"seal_decrypt"}`, so the slow step was Seal key fetching, the step the relayer logs for the drops.

#1102 measured the same `RECALL_TIMEOUT` at `seal_decrypt` on 2026-09-25, also before the fix. That matches the cause described in `25ba0fb5` (2026-09-28, "fix(server): run seal off the upload sidecar process": a full Walrus upload queue stalls `fetchKeys` on the shared event loop, so recall misses its deadline).

**Since then we have not seen it.** On 2026-10-02 18:51 UTC, 18 recalls over two namespaces (3 queries × 3 rounds each) returned their results with `dropped_count: 0` every time, and five days of our production logs (832 lines across 6 deployments) contain no all-dropped recall. So from our side this looks fixed by `25ba0fb5`. Even so, an empty page with `dropped_count > 0` is still indistinguishable from "no memories" for a caller that reads `results`, which is the part this issue asks about.

<!-- hippo (walrus-session-8-chatbots): post with `gh issue comment 1036 --repo MystenLabs/MemWal --body-file <this file minus the first line>`. Not filed as a new issue: #1036 (2026-09-27) and #1070 (2026-10-01) cover it, and #622 (closed) covered the SDK typing. Our first observation was 2026-09-22. -->
