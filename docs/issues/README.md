# Bug reports for MystenLabs/MemWal

Drafts to file at https://github.com/MystenLabs/MemWal/issues during the session.

File them with:

```bash
scripts/file-issues.sh --dry-run    # see exactly what would be posted
scripts/file-issues.sh              # file all of them
scripts/file-issues.sh 01 02 11     # or a subset, in that order
```

**Re-checked on 2026-10-03** against the issues other builders filed since,
and against MemWal `main` `1e023585`. Six are written in MemWal's bug template
(`.github/ISSUE_TEMPLATE/bug.yml`; the maintainers close issues that are not)
and ready to file. The script skips any draft whose title starts `RETRACTED`,
`NOT REPRODUCED`, `RESOLVED BEFORE FILING`, `ON HOLD`, `DUPLICATE`, `FIXED
UPSTREAM` or `COMMENT ON #n`. Each file's first heading becomes the issue title
and the rest the body; notes for us sit in an HTML comment at the end, which
GitHub does not render. The script writes the resulting URL back into the draft.

| # | Status, 2026-10-03 |
|---|---|
| 1 | **Comment on #1036**, filed upstream 2026-09-27. Re-run: 18 recalls, no drops; none in five days of production logs; consistent with upstream `25ba0fb5` (2026-09-28) |
| 2 | **On hold.** Not seen since 2026-09-21; #1071 and #999 report it |
| 3 | **Do not file.** Not reproduced; it was an instance of 1 |
| 4 | **Duplicate** of #1032 (2026-09-26). Its sponsorship row moved into 11 |
| 5 | **Fixed upstream** by PR #983 (2026-09-25); #1069 describes the old behaviour |
| 6 | **File.** Docs vs code vs hosted value; #1073 says the weights are undocumented, which they are not |
| 7 | **Do not file.** Resolved upstream, and the miscount was ours |
| 8 | **Retracted, do not file.** Wrong deployment's account |
| 9 | **File, reframed** as a docs contradiction: the delete guides promise what Security Delete cannot do. #1030 and #1043 ask for the feature |
| 10 | **File.** Re-run 2026-10-02 18:51 UTC: recall 2, restore `total: 0`; 457 blobs owned, 384 listed by the read API |
| 11 | **File, refocused** on the masked 502. Re-run 2026-10-02 18:53 UTC: unchanged |
| 12 | **File, reworded**: decrypting needs an undocumented Enoki Seal API key; it works with one |
| 13 | **File.** `SKILL.md` lines unchanged on `main` |
