# Deploy

**Live as of 2026-09-22.** Web https://hippo-web-ten-nu.vercel.app, API
https://hippo-server-production.up.railway.app, database on Neon, Telegram
polling from production. What was verified rather than assumed is in
`docs/evidence/deploy-2026-09-22.md`.

The server is a long-running process, not serverless: the chat adapters hold
gateway connections and memory writes finish in the background, both of which a
function that freezes between requests would break. The web app is a static
build and goes anywhere.

Verified on 2026-09-22 by building the image and running it: it boots, serves
`/api/health`, and answers a real chat turn against mainnet. `.env` and the
`memwal/` reference clone are confirmed absent from the image.

## 1. Database, about two minutes

[neon.tech](https://neon.tech) → new project → copy the connection string. That
is `DATABASE_URL`. The schema is created on first deploy by the release command
in `railway.toml`.

## 2. Server on Railway

New Project → Deploy from GitHub repo → this repository. `railway.toml` is
picked up automatically: it builds `Dockerfile`, starts the server, health-checks
`/api/health`, and pins one replica.

**Schema changes are not automatic.** `drizzle-kit push` can drop a column to
reach the target schema, and this database holds real users' encrypted delegate
keys. Push deliberately, having looked at the diff:

```bash
DATABASE_URL=<prod> pnpm --filter @hippo/db exec drizzle-kit push
```

Paste these variables. Everything except the last two comes straight from your
local `.env`.

| Variable | Where it comes from |
|---|---|
| `MEMWAL_ACCOUNT_ID` | local `.env` (`pnpm diagnose` prints it) |
| `MEMWAL_PRIVATE_KEY` | local `.env` |
| `MEMWAL_SERVER_URL` | `https://relayer.memory.walrus.xyz` |
| `MEMWAL_PACKAGE_ID` | local `.env` |
| `MEMWAL_REGISTRY_ID` | local `.env` |
| `SUI_NETWORK` | `mainnet` |
| `OPENROUTER_API_KEY` | local `.env` |
| `LLM_MODEL` | `google/gemini-2.5-flash` |
| `SESSION_SECRET` | local `.env` |
| `KEY_ENCRYPTION_KEY` | local `.env`, and **never rotate it after users exist**: it decrypts their delegate keys |
| `TELEGRAM_BOT_TOKEN` | local `.env` |
| `DATABASE_URL` | Neon, from step 1 |
| `WEB_BASE_URL` | the Vercel URL from step 3 |
| `CORS_ORIGIN` | the Vercel URL from step 3 |

`WEB_BASE_URL` and `CORS_ORIGIN` are a chicken and egg with step 3. Deploy with
placeholders, then come back and set them. Everything else works meanwhile.

Railway gives the service a public domain under Settings → Networking. That URL
is `VITE_API_URL` in the next step.

**One replica** is pinned in `railway.toml`. Telegram long polling from two
processes fights over the same updates.

## 3. Web on Vercel

New Project → this repository → **Root Directory `apps/web`**. Vercel detects
Vite. `apps/web/vercel.json` handles SPA routing.

One environment variable: `VITE_API_URL`, the Railway URL from step 2. It is
baked in at build time, so changing it later needs a redeploy.

Then go back to Railway and set `WEB_BASE_URL` and `CORS_ORIGIN` to the Vercel
URL. Without that, the browser's cookies never reach the API and every visitor
looks like a stranger on each request.

## 4. Check it

```bash
curl https://<railway-url>/api/health          # cheap, what the platform checks
curl https://<railway-url>/api/health/deep     # database and relayer, named
```

`/api/health/deep` returns 200 even when a dependency is down, so the platform
does not restart a container that is working; `status` carries the real answer.

Then open the Vercel URL, say something, reload, and ask what it knows. If the
reply forgets you, `CORS_ORIGIN` is wrong: the cookie is not surviving.

Message `@walrussession8_bot` on Telegram. Its first ever message will arrive
here, so watch the Railway logs while you send it.

## 5. Optional: Walrus Sites instead of Vercel

`apps/web/ws-resources.json` is ready. Needs WAL and SUI in the Sessions wallet.

```bash
pnpm --filter @hippo/web build
site-builder deploy apps/web/dist
```

Worth doing for the submission, since the chatbot's own interface then lives on
Walrus too, but Vercel is the one to get working first.

## Things that will bite

- **`CORS_ORIGIN` must be the exact origin**, scheme included, no trailing slash.
  It is an exact-match allowlist on purpose.
- **Cookies need HTTPS in production.** They are marked `secure` whenever
  `WEB_BASE_URL` starts with `https`, so an http Vercel preview will not hold a
  session.
- **One replica**, as above.
- **Schema changes are manual on purpose.** See above.
