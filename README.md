# hippo

A chatbot that remembers you across web, Telegram, Discord and Slack, where **you own the memory**: it lives in your own Walrus Memory account on Sui mainnet and the bot is a delegate you can revoke in one transaction.

Built for Walrus Session 8 "Chatbots That Remember". Primary model: `google/gemini-2.5-flash` via OpenRouter (Vercel AI SDK).

## Run it

```bash
cp .env.example .env         # fill MEMWAL_*, OPENROUTER_API_KEY, secrets
docker compose up -d         # local Postgres on :5433
pnpm install
pnpm db:push                 # create schema
pnpm smoke                   # health-check relayer, write + recall one memory on mainnet
```

Then in separate terminals:

```bash
pnpm hippo        # CLI chat (fastest way to see memory working)
pnpm dev:server   # Hono API on :8787 + channel adapters that have tokens
pnpm dev:web      # Vite app on :5173
```

## Layout

```
apps/web         Vite + React + Tailwind v4 + shadcn/ui
apps/server      Hono API + Telegram / Discord / Slack adapters (one process)
packages/core    agent loop, prompts, remember / recall tools
packages/memory  Walrus Memory client factory, memory format, dedupe, recall policy, relayer extras
packages/db      Drizzle schema
docs/            brief, idea, architecture, plan, MemWal notes
```

See `docs/ARCHITECTURE.md` for how guest and owned modes work, and `CLAUDE.md` for project rules.
