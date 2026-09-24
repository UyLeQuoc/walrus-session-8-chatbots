# A judge's path from a fresh clone, on Node 20 — 2026-09-25

Two fresh clones, each following `README.md` literally from the top: env,
database, smoke, the server, the web app, the CLI and `pnpm demo`. The first
found four things that failed or needed knowledge the README did not give; all
were fixed in `bfaa59d`. The second, from that commit, ran clean.

## Setup

| | |
|---|---|
| Node | v20.20.2, via `npx node@20` put first on `PATH` |
| pnpm | 10.28.2 (the version `packageManager` pins) |
| Docker | Postgres from the repo's `docker-compose.yml` on :5433; the dev container was stopped first |
| Credentials | hippo's operator delegate key and OpenRouter key, copied into `.env` without printing; `SESSION_SECRET` and `KEY_ENCRYPTION_KEY` from `openssl rand -hex 32` |
| Channels | no Telegram, Discord or Slack tokens, as `.env.example` ships |
| Machine | :5173 already taken by an unrelated process, as it may be for a judge |

Run 1 cloned the public repository at `a9eb882`. Run 2 cloned `bfaa59d` locally,
the commit that was then pushed, into a new directory with a new database volume
and a new `HOME` for the CLI.

## Run 1, at `a9eb882`: what went wrong

| Step | Result | What was wrong | Fix |
|---|---|---|---|
| `cp .env.example .env` and fill | ok | The README said "fill MEMWAL_\*, OPENROUTER_API_KEY, the two secrets". It did not name the four blanks or how to make the secrets, and did not say `MEMWAL_ACCOUNT_ID` ships set to hippo's account, which someone with their own key must replace. | README names the four blanks, `openssl rand -hex 32`, and the account id; `.env.example` says so at the line. |
| `docker compose up -d`, `pnpm install`, `pnpm db:push` | ok, ok, ok | Nothing. | — |
| `pnpm smoke --write` | exit 0, **wrote nothing** | The README said it "writes and recalls one memory". Every run writes the same fact, so dedupe found the one an earlier run stored (distance 0.001) and printed an unexplained `→ duplicate of …`. | The output now says `nothing written: an earlier run already stored this fact`, and labels recall's number as a distance. The README explains it. |
| `pnpm dev:server` | **exit 1**: `Invalid environment: SURVEY_URL: Invalid URL` | `.env.example` ships `SURVEY_URL=`, which sets the variable to `""`, and the schema's optional URL rejected it. Every fresh clone since the line was added on 2026-09-22 failed here. The 2026-09-21 clean clone ran before it, and never started the server. | Every env reader drops blank values first (`withoutBlanks`), so blank means "off". `env-schema.test.ts` parses the real `.env.example` with the four secrets filled, so this cannot come back unseen. |
| `pnpm dev:web`, then a message | the page loaded; the reply **failed** with "Failed to fetch the chat response" | With no `VITE_API_URL` the page calls `/api` on its own origin, and Vite had no proxy, so `/api/chat` answered 404. The `VITE_API_URL` line in the root `.env` is never read by Vite. | `vite.config.ts` proxies `/api` to :8787, as Vercel's rewrite does in production (`HIPPO_API_URL` overrides it). `.env.example` no longer suggests `VITE_API_URL` for dev. |
| `pnpm hippo` | worked; **exit 13** at end of input | Ctrl+D or a closed stdin left a readline question that never settled, so Node exited 13 and pnpm printed a failure block. | The CLI exits 0 when its input closes. |
| `pnpm demo` | exit 0, all PASS, 5 min 23 s, 0 dropped recalls | Nothing. | — |

Also stale in the README: "ten bug reports" (there are thirteen drafts, nine
still standing after the re-run of 2026-09-25), no prerequisites, and the
clean-clone reference pointing at 2026-09-21. All corrected.

## Run 2, at `bfaa59d`: clean

| Step | Result |
|---|---|
| `cp .env.example .env`, fill the four blanks, `SURVEY_URL=` left blank | ok |
| `docker compose up -d` | `judge2-postgres-1 Started` |
| `pnpm install` | exit 0, 3.8 s (warm pnpm store; a cold machine downloads) |
| `pnpm db:push` | exit 0 |
| `pnpm smoke --write` | exit 0; `nothing written: an earlier run already stored this fact …`, recall returned it at distance 0.745 |
| `pnpm dev:server` | `no channel tokens set; only the web API is running`, `/api/health` ok |
| `pnpm dev:web` | moved to :5174; `/api/health` through the proxy ok |
| Web, the README's three clicks | Starter "I only use pnpm, and I want short answers in Vietnamese." → two writes, `stored` after 35 s and 38 s → **Reload, then ask what it knows** → Send → "Bạn thích câu trả lời ngắn gọn bằng tiếng Việt và chỉ dùng pnpm.", recalled 2 memories (`clean-clone-2026-09-25-web.jpg`) |
| `pnpm hippo` with a new `HOME` | `/whoami` answered as a new guest; a question answered "I have not been told", correctly, since the CLI is a new person until `/link`. The README now says so. Exit 0 at end of input. |
| `pnpm diagnose` | exit 0, `Nothing broken.`, 6 delegates agreeing on chain and relayer |
| `pnpm demo` | exit 0 in 4 min 38 s. 4/4 recalled across sessions, newest fact wins, style adaptation, cross-channel, memory-off control: all PASS. 0 dropped recalls, 0 give-ups, 0 failed writes |

## Not covered

- A judge's own Walrus Memory account. Both runs used hippo's operator key; an
  own key means replacing `MEMWAL_ACCOUNT_ID`, which the README now says.
- A cold pnpm store, and Linux or Windows hosts.
- Telegram, Discord and Slack, which need tokens and start only when one is set.
- In the browser automation, the first click or keystroke after a reload was
  sometimes lost and had to be repeated. It was seen in earlier browser passes
  too and looks like the automation, but it was not checked by hand.
