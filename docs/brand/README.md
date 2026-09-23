# Brand

Five logo candidates, one chosen, and the banner the social card is cut from.
Everything here is plain SVG and HTML with no build step, so it can be changed
without a toolchain.

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

## Changing the mark

Three places, all hand-edited:

1. `apps/web/src/components/logo.tsx` — the header, in `currentColor`
2. `apps/web/public/favicon.svg` — carries both themes itself, since a favicon
   cannot inherit one
3. `docs/brand/banner.html` — the social card, then regenerate `og.png`
4. The two 512×512 pngs, regenerated the same way as the card

## Regenerating the social card

`apps/web/public/og.png` is a screenshot of `banner.html`, cropped to 1.91:1 and
resized to 1200×630:

```bash
cd docs/brand && python3 -m http.server 8777 --bind 127.0.0.1
# open http://127.0.0.1:8777/banner.html, screenshot it, then crop:
python3 - <<'PY'
from PIL import Image
src = Image.open("screenshot.jpg").convert("RGB")
bg = src.getpixel((5, 5))
differs = lambda px: sum(abs(a - b) for a, b in zip(px, bg)) > 40
w, h = src.size
cols = [x for x in range(0, w, 3) if any(differs(src.getpixel((x, y))) for y in range(0, h, 3))]
rows = [y for y in range(0, h, 3) if any(differs(src.getpixel((x, y))) for x in range(0, w, 3))]
left, right, top, bottom = min(cols), max(cols), min(rows), max(rows)
fw = min(w, right + left)
fh = int(round(fw / 1.91))
y0 = max(0, min(h - fh, (top + bottom) // 2 - fh // 2))
src.crop((0, y0, fw, y0 + fh)).resize((1200, 630), Image.LANCZOS).save("og.png", optimize=True)
PY
```

The crop is derived from where the ink actually is rather than from a fixed box,
so the framing survives an edit to the copy.
