# Brand

The mark in use since 2026-09-25 (`2291934`) is the hippo silhouette in
`apps/web/public/logo-black.svg`, `logo-white.svg` and `favicon.svg`. The five
SVG candidates below are the earlier round and are kept for the record.
`mark-white.png` and `mark-black.png` are that silhouette rendered and cropped
to its ink, for the social card.

## The candidates

| file | idea |
|---|---|
| `logo-1-waterline.svg` | **In use.** A hippo shows its eyes and keeps the rest below the waterline, which is what the memory does too: held elsewhere, surfaced on ask |
| `logo-2-resolve.svg` | Ciphertext turning back into a letter |
| `logo-3-revoke.svg` | A key leaving the ring |
| `logo-4-blob.svg` | A blob with a keyhole: public bytes, one reader |
| `logo-5-link.svg` | Two rings joined only while you allow it |

`contact-sheet.html` shows all five at 88px, 36px and 20px on both backgrounds.
The 20px row is the one that decides it, since that is a favicon and a header.

Why 1 and not 4: the blob scales best and says the least. It reads as generic
security, where the waterline is specific to this project and to its name. If a
sharper mark is ever wanted at very small sizes, 4 is the fallback.

## Raster versions

`logo-512-dark.png` and `logo-512-light.png` are 512×512 for the places that
take no SVG: a Telegram bot avatar set through BotFather, a GitHub organisation
picture, a submission form. Both are cropped around the ink rather than around
the viewBox, because the waterline sits below the middle of the drawing and a
circle crop would otherwise cut the ripples and leave dead space above.

`apps/web/public/og.png` is the 1200×630 social card.

`telegram-avatar.png` is the bot's profile photo since 2026-10-06: 640×640, the
white mark on the dark background with a teal glow, drawn from `avatar.html`
and rendered like the card below. It was set through the Bot API
(`setMyProfilePhoto` with an `InputProfilePhotoStatic`), together with the
name `hippo` and the short and long descriptions (`setMyName`,
`setMyShortDescription`, `setMyDescription`). BotFather's `/setuserpic` does
the same by hand.

## Changing the mark

Three places, all hand-edited:

1. `apps/web/src/components/logo.tsx` — the header, in `currentColor`
2. `apps/web/public/favicon.svg` — carries both themes itself, since a favicon
   cannot inherit one
3. `docs/brand/banner.html` — the social card, then regenerate `og.png`
4. The two 512×512 pngs, regenerated the same way as the card

## Regenerating the social card

`apps/web/public/og.png` is `banner.html`, a 1200×630 page, rendered at twice
the size and scaled down, so the edges stay sharp in a link card and at the top
of the README:

```bash
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
"$CHROME" --headless=new --hide-scrollbars --force-device-scale-factor=2 \
  --window-size=1200,630 --screenshot=/tmp/banner-2x.png "file://$PWD/docs/brand/banner.html"
python3 -c "from PIL import Image; Image.open('/tmp/banner-2x.png').convert('RGB').resize((1200, 630), Image.LANCZOS).save('apps/web/public/og.png', optimize=True)"
```

The icons in `apps/web/public` (`favicon-32.png`, `apple-touch-icon.png`,
`icon-192.png`, `icon-512.png`) are `favicon.svg` rendered the same way at
1024×1024 and scaled down.
