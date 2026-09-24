# Bug reports for MystenLabs/MemWal

Drafts to file at https://github.com/MystenLabs/MemWal/issues during the session.

File them with:

```bash
scripts/file-issues.sh --dry-run    # see exactly what would be posted
scripts/file-issues.sh              # file all of them
scripts/file-issues.sh 01 02 11     # or a subset, in that order
```

**Every draft was re-run on 2026-09-25** against the redeployed relayer (build
`5b27683`) and SDK 0.1.8, and carries the result at its top. Nine are worth
filing. The script skips any draft whose title starts `RETRACTED`, `NOT
REPRODUCED`, `RESOLVED BEFORE FILING` or `ON HOLD` (08, 03, 07, 02). Two drafts
contained claims that were wrong from the start and have been corrected: 01 said
the SDK does not type `dropped_count`, and 06 said the weights were unpublished.

Each file's first heading becomes the issue title and the rest becomes the body.
The script writes the resulting URL back into the draft as an HTML comment, so
`docs/submission.md` can be filled from the files afterwards.
Every one was hit while building hippo on the managed mainnet relayer, and every
one has a repro that runs from this repo.

Environment shared by all of them:

```
SDK:      @mysten-incubation/memwal 0.1.7 (npm latest)
Relayer:  https://relayer.memory.walrus.xyz  (mainnet, /health reports 0.1.0)
Runtime:  Node 20+, TypeScript 5.9, macOS 15
Model:    google/gemini-2.5-flash via OpenRouter (Vercel AI SDK)
Date:     2026-09-21 to 2026-09-22
```

| # | Title | Status, re-verified 2026-09-25 |
|---|---|---|
| 1 | `recall()` returns an empty list while reporting it dropped the matches | **File.** Intermittent; last seen 2026-09-24. Corrected: the SDK does type `dropped_count` |
| 2 | `remember` jobs die from the relayer's own Sui RPC throttling | **On hold.** Not seen since 2026-09-21; upstream added retries that day |
| 3 | The two documented `recall()` call forms are not equivalent | **Do not file.** Not reproduced; it was an instance of 1 |
| 4 | Published mainnet contract IDs are stale | **File.** Still reproduces |
| 5 | A wrong `x-account-id` is silently repaired on mainnet | **File.** Still reproduces on mainnet |
| 6 | Documented delegate-key limit and weights disagree with the relayer | **File, rewritten.** The weights were published after all; the mismatches are real |
| 7 | `whoami` 404; `agents` flaky and miscounts | **Do not file.** Resolved upstream, and the miscount was ours |
| 8 | ~~The relayer authorizes a delegate key the chain does not list~~ | **Retracted, do not file.** Wrong deployment's account |
| 9 | No way to permanently delete a memory, even as the owner | **File.** Still applies |
| 10 | `restore()` misses memories and reports `truncated: false` | **File.** Still reproduces, now measured on the correct account |
| 11 | `/config` names no registry, and every sponsor simulation failure is a masked 502 | **File.** Still reproduces, and broader |
| 12 | An owner cannot decrypt their own memory | **File.** Still reproduces |
| 13 | Distance dedupe, as SKILL.md suggests, discards corrections | **File.** Still applies |
