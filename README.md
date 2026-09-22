# hippo

A chatbot that remembers you across the web, Telegram, Discord, Slack and a CLI,
where **you own the memory**: it lives in your own Walrus Memory account on Sui
mainnet and hippo is a delegate you can revoke in one transaction.

Built for Walrus Session 8, "Chatbots That Remember".
Primary model: `google/gemini-2.5-flash` through OpenRouter on the Vercel AI SDK.

## Why this is different

Most memory bots keep your memory in the vendor's account. hippo starts that way
too, in guest mode, because asking for a wallet before the first message is a bad
trade. Then `/connect` moves it: one sponsored transaction registers hippo's
delegate key on a Walrus Memory account that belongs to your wallet. From then on

- `/disconnect` removes that key on chain and hippo immediately cannot read or
  write anything of yours,
- the same memory is readable from Claude Code, Cursor or any other Walrus Memory
  client you sign in with the same wallet,
- `/proof` shows the Walrus blobs behind any answer.

## Run it

```bash
cp .env.example .env         # fill MEMWAL_*, OPENROUTER_API_KEY, the two secrets
docker compose up -d         # local Postgres on :5433
pnpm install
pnpm db:push                 # create the schema
pnpm smoke --write           # writes and recalls one memory on mainnet
```

Then, in separate terminals:

```bash
pnpm dev:server              # Hono API on :8787 plus any channel whose token is set
pnpm dev:web                 # the Vite app on :5173
pnpm hippo                   # the CLI, talking to the same server
```

`pnpm diagnose` is the first thing to run when something looks wrong: it prints
what is configured, what works, and where the chain and the relayer disagree.

`pnpm demo` is the proof. It teaches hippo five things, throws the conversation
away, and in a fresh session asserts three things: that it recalls the facts,
that a `style` memory changed the reply language without being asked again, and
that a second channel recalls the same facts.

`pnpm evidence` prints the numbers the session's submission form asks for,
counting only memories that actually landed on Walrus. `pnpm restore` checks the
relayer's index against what we wrote.

`pnpm smoke`, `pnpm db:push`, `pnpm typecheck` and `pnpm test` need only the
Walrus Memory credentials. `pnpm demo`, `pnpm hippo` and the chat itself also
need `OPENROUTER_API_KEY`. The whole sequence above was run from a fresh clone on
2026-09-21; the transcript is in `docs/evidence/clean-clone-2026-09-21.md`.

### Credentials

Create an account and a delegate key at [memory.walrus.xyz](https://memory.walrus.xyz)
with the wallet you want to own the operator account.

`MEMWAL_ACCOUNT_ID` is the **MemWalAccount object id**, not your wallet address
and not the delegate public key. All three are `0x` plus 64 hex and they are easy
to confuse. If you have the delegate key and nothing else:

```bash
pnpm --filter @hippo/memory exec tsx scripts/find-account.ts
```

It prints the owner address, the account id and the delegate public key, which is
what the submission form calls `MEMWAL_AGENT_ID`.

### Channels

Each adapter starts only when its token is present, so you can run with none of
them. `docs/PLAN.md` has the setup for each one; Slack is a single paste of
`docs/slack-manifest.yaml`, and Discord's slash commands are one command
(`pnpm --filter @hippo/server discord:commands <guildId>`).

## Layout

```
apps/web         Vite + React + Tailwind v4 + shadcn/ui, dapp-kit wallet flow
apps/server      Hono API + Telegram / Discord / Slack adapters, one process
packages/core    agent loop, prompts, remember and recall tools, the eval
packages/memory  Walrus Memory client, memory format, dedupe, recall policy, limiter
packages/db      Drizzle schema
docs/            brief, idea, architecture, plan, spikes, evidence, bug reports
```

`docs/ARCHITECTURE.md` explains guest and owned mode and lists every limitation
we measured, `docs/SPIKES.md` records what we measured on mainnet and what it
changed (including a hypothesis we had to retract), `docs/issues/` holds the ten
bug reports we are filing against Walrus Memory, and
`docs/evidence/security-review-2026-09-21.md` is an adversarial review of this
repo with its findings fixed.

Two limits worth knowing before you rely on this: a memory can be made
unrecallable but not deleted, and the relayer's `restore()` does not currently
re-index this account, so treat the search index as the fragile part and Walrus
as the durable one. Both are written up in `docs/issues/`.

## Deploy

The server is a long-running process, not serverless, because the chat adapters
hold gateway connections and memory writes finish in the background. `Dockerfile`
and `railway.toml` are set up for Railway. The web app is a static build: deploy
it to Walrus Sites with `site-builder` (`apps/web/ws-resources.json` handles SPA
routing) or to Vercel (`apps/web/vercel.json`).
