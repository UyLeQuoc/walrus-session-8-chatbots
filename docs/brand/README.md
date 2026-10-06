# Brand

The mark in use since 2026-09-25 (`2291934`) is the hippo silhouette in
`apps/web/public/logo-black.svg`, `logo-white.svg` and `favicon.svg`.
`mark-white.png` is that silhouette rendered and cropped to its ink, for the
social card and the Telegram avatar.

The accent is one teal, `--brand` in `apps/web/src/index.css`, used only for
what is about memory on Walrus: icon tiles, progress bars, "stored" labels.

## Files

| file | what it is |
|---|---|
| `banner.html` | the 1200×630 social card, rendered into `apps/web/public/og.png` |
| `avatar.html` | the 640×640 Telegram avatar, rendered into `telegram-avatar.png` |
| `mark-white.png` | the mark on transparent, used by both pages above |
| `telegram-avatar.png` | the bot's profile photo |

The earlier round of five logo candidates (waterline, resolve, revoke, blob,
link), their contact sheet and the 512×512 rasters of the waterline mark were
removed on 2026-10-06 as unused. They are in git at `eb1ba0d`
(`git show eb1ba0d:docs/brand/contact-sheet.html`).

`telegram-avatar.png` has been the bot's profile photo since 2026-10-06. It was
set through the Bot API (`setMyProfilePhoto` with an `InputProfilePhotoStatic`),
together with the name `hippo` and the short and long descriptions
(`setMyName`, `setMyShortDescription`, `setMyDescription`). BotFather's
`/setuserpic` does the same by hand.

## Changing the mark

1. `apps/web/src/components/logo.tsx`: the header, in `currentColor`
2. `apps/web/public/favicon.svg`: carries both themes itself, since a favicon
   cannot inherit one
3. `mark-white.png`, then regenerate `og.png` and `telegram-avatar.png`

## Regenerating the social card and the avatar

Each page is rendered at twice the size and scaled down, so the edges stay sharp
in a link card and at the top of the README:

```bash
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
"$CHROME" --headless=new --hide-scrollbars --force-device-scale-factor=2 --virtual-time-budget=5000 \
  --window-size=1200,630 --screenshot=/tmp/banner-2x.png "file://$PWD/docs/brand/banner.html"
python3 -c "from PIL import Image; Image.open('/tmp/banner-2x.png').convert('RGB').resize((1200, 630), Image.LANCZOS).save('apps/web/public/og.png', optimize=True)"

"$CHROME" --headless=new --hide-scrollbars --force-device-scale-factor=2 --virtual-time-budget=3000 \
  --window-size=640,640 --screenshot=/tmp/avatar-2x.png "file://$PWD/docs/brand/avatar.html"
python3 -c "from PIL import Image; Image.open('/tmp/avatar-2x.png').convert('RGB').resize((640, 640), Image.LANCZOS).save('docs/brand/telegram-avatar.png', optimize=True)"
```

`--virtual-time-budget` gives the Google Font in `banner.html` time to load.

The icons in `apps/web/public` (`favicon-32.png`, `apple-touch-icon.png`,
`icon-192.png`, `icon-512.png`) are `favicon.svg` rendered the same way at
1024×1024 and scaled down.
