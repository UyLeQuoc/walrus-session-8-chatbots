# Browser pass: phone width and desktop, light and dark

2026-09-25, Chrome, local server against the mainnet relayer, as a guest with
four stored memories and a team. Phone width was tested by loading the app in a
same-origin iframe exactly 375px wide, since Chrome will not shrink a window
that far; media queries and storage behave as on a phone-sized viewport.

## Measured, not eyeballed

For every page and theme, every element's right edge was compared with the
viewport width.

| width | theme | `/` | `/me` | `/connect/:token` | `/disconnect/:token` |
|---|---|---|---|---|---|
| 375 | light | no overflow | no overflow | no overflow | no overflow |
| 375 | dark | no overflow | no overflow | no overflow | no overflow |
| 1240 | light | no overflow | no overflow | no overflow | — |
| 1240 | dark | no overflow | no overflow | no overflow | — |

The dark class was confirmed applied in each dark run.

## Exercised

- `/me` at 375: the memory list, **hide** (the row dims, says "hidden", offers
  "use again"), **search** (the hidden memory did not come back), **use again**
  (restored; the data was left as found), the export panel and the team panel.
- Chat at 375, dark: `/help` renders as hippo's reply, in monospace, with no
  overflow. Descriptions wrap under the command rather than in a column at this
  width; readable, left as is.
- Connect page with a real token, and disconnect with a dead one, both themes.

## Found and fixed

1. **Search mixed team memory in with the person's own, and offered to hide
   it.** Recall reads the team's namespace, so "Staging deploys freeze every
   Friday" came back unlabelled with a "stop using this" button that could only
   fail with a 404. The search route now marks each result `mine`, and the page
   labels team results and does not offer to hide them. Render test added.
2. **A dead disconnect link said "Run /connect again"**, because the server
   cannot tell what an unknown token was for, **and still offered "Connect your
   Sui wallet"** for a transaction that could not happen. The page now names
   the right command from its own route and shows no wallet action for a dead
   link, while a failed signature still offers a retry. Render test added.
   Before: `screenshots/2026-09-25-disconnect-dead-link-375-dark-before.png`.
3. **The Claude Code steps on `/me` broke mid-word** at phone width
   ("MystenLab s/MemWal"), from `break-all`. Now `overflow-wrap: anywhere`,
   which breaks only a token too long for the line.

## Screenshots

`screenshots/2026-09-25-me-375-light-list.png`,
`2026-09-25-me-375-light-export-team.png`, `2026-09-25-chat-375-dark-help.png`,
`2026-09-25-me-desktop-dark.jpg`, and the "before" above.

## Not covered

Signing with a real wallet on the connect page: there is no spare wallet
(`docs/BLOCKERS.md`). The page was checked up to the wallet button.
