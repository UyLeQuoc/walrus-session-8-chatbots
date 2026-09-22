# The web app on Walrus Sites — 2026-09-22

The chatbot's own interface now lives on Walrus, not only its memories.

| | |
|---|---|
| Site object | `0x65eec4835f094c4c3d642f76f60ac983e0ddd08f715842e349daa11edb2a2078` |
| Explorer | https://suiscan.xyz/mainnet/object/0x65eec4835f094c4c3d642f76f60ac983e0ddd08f715842e349daa11edb2a2078 |
| Stored for | 30 epochs |
| Base36 subdomain | `2jgkh5g0tgvbdl4xmpziv1hkcf6rnne5llqkiz6j58fxvnmgl4` |

Six resources, each a quilt patch on Walrus: `index.html`, the JS and CSS
bundles, two icons and `ws-resources.json`.

## The thing that had to be solved first

Walrus Sites serves static files and cannot proxy, so a page there must call the
API cross-origin. That is exactly the shape that broke production earlier today:
a `SameSite=Lax` cookie is not sent cross-site, so every message arrives as a new
person and the bot forgets everyone.

Deploying without fixing that would have produced a site that looks right and
silently does not work, which is worse than not deploying.

The fix keeps the CSRF protection rather than trading it away. A cross-origin
page carries its opaque id in `x-hippo-guest` (and `x-hippo-session` once signed
in) instead of a cookie. A browser never attaches a header on its own, so this
cannot be driven by another site, which `SameSite=None` would have allowed. The
cost is that the id sits in `localStorage` rather than an `HttpOnly` cookie, and
that is stated in `apps/web/src/lib/api.ts` where the decision lives.

Verified against production with no cookie anywhere:

```
guest id in a header only
1. teach                        → "Okay, I've remembered that your favorite number is 4173."
2. same header sees itself      → namespace hippo-guest:173b8df3…
3. a different header does not  → different namespace
4. a malformed header           → {"mode":"anonymous"}, ignored rather than trusted
```

## What is left, and it needs a wallet

`wal.app` only serves a site that has a SuiNS name; the base36 subdomain returns
404 there. The Sessions wallet already owns three names, so nothing needs buying:

| Name | Note |
|---|---|
| `wal-0.sui` | spare, the obvious candidate |
| `uydev.sui` | personal, probably wanted elsewhere |
| `walform.sui` | in use by the Session 2 project |

Pointing one at the site object is a transaction from that wallet, in Slush, so
it is the one step that cannot happen here. `CORS_ORIGIN` on the server already
allows all three `*.wal.app` origins, so the site will work the moment a name is
pointed, with no redeploy.

Vercel stays the working public URL until then, and stays afterwards as the
same-origin deployment where the session rides on an `HttpOnly` cookie.
