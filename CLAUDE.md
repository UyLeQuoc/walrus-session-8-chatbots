# hippo — Walrus Session 8 "Chatbots That Remember"

Multi-channel chatbot (web, Telegram, Discord, Slack) where each user owns their memory on their own Walrus Memory account and the bot is only a revocable delegate. Hackathon deadline **Oct 9, 2026 14:00 UTC**.

## Read first

- `docs/GOAL.md` — **the master execution plan.** Milestones M0–M7 with tasks, verification commands, pre-made decisions, cut order, and the list of inputs only the human can provide. If you are asked to "continue" or "do the next thing", start here.
- `docs/BRIEF.md` — hackathon rules, judging, prizes, submission checklist. Source of truth for what must ship.
- `docs/IDEA.md` — the pitch and why it wins.
- `docs/ARCHITECTURE.md` — components, identity model (guest vs owned), onboarding and revoke flows, memory layer, stack, spikes.
- `docs/PLAN.md` — timeline, real-user plan, bug bounty list, article outline.
- `docs/MEMWAL-NOTES.md` — SDK, relayer API, on-chain model, sponsorship, MCP notes.
- `docs/SPIKES.md` — everything measured on mainnet and what it changed, including one hypothesis that had to be retracted.
- `docs/BLOCKERS.md` — what only the user can provide. Read it before assuming something is blocked.
- `docs/DECISIONS.md` — the running decision log.
- `docs/RUNBOOK.md` — how to run the real-use week: invite text, consent rules, daily checklist.
- `docs/issues/` — thirteen bug reports drafted against Walrus Memory, re-verified 2026-09-25: nine still stand, four are marked (02 on hold, 03 not reproduced, 07 resolved before filing, 08 retracted). None filed yet; `scripts/file-issues.sh` files the nine.
- `docs/AUDIT.md` — every task in GOAL.md checked against the codebase, with what is blocked and why. Read this before concluding there is nothing left to do.

## Commands worth knowing

| | |
|---|---|
| `bun run dev` | Starts Postgres, applies the schema, then runs the API and web app in the Turbo TUI. |
| `bun run diagnose` | What is configured, what works, and where the chain and the relayer disagree. Run this first when anything looks wrong. |
| `bun run demo` | The memory eval: teaches five facts and one correction, drops the conversation, then asserts cross-session recall, that the newer of two conflicting memories wins, style adaptation and cross-channel recall, then a memory-off control on the same questions and the recall cost per turn. |
| `bun run evidence` | The numbers the submission form asks for, counting only memories that landed on Walrus. |
| `bun run smoke` | Health, identity and (with `--write`) one round trip on mainnet. |
| `bun run restore` | Compares the relayer's index against what we wrote, and warns when restore sees nothing. |
| `bun run hippo` | The CLI channel, talking to a running server. |

## Reference clone: `memwal/`

`memwal/` is a **read-only clone of https://github.com/MystenLabs/MemWal** kept for reference. It is gitignored. If it is missing, restore it with:

```bash
git clone --depth 1 https://github.com/MystenLabs/MemWal.git memwal
```

Never edit files inside `memwal/`. Never import from it; depend on the published `@mysten-incubation/memwal` package. When unsure how the SDK or relayer behaves, read the source there before guessing: `memwal/SKILL.md`, `memwal/packages/sdk/src/`, `memwal/apps/app/src/` (dashboard flows), `memwal/services/server/src/routes/` (relayer).

## Hard constraints

- Mainnet only. Relayer `https://relayer.memory.walrus.xyz`. Package and registry IDs are in `docs/ARCHITECTURE.md` §8.
- Delegate private keys never leave the server and never appear in logs, chat messages, or the browser. Users' keys are stored encrypted (AES-256-GCM with `KEY_ENCRYPTION_KEY`).
- Namespace names are public on-chain. Only `hippo` (owned), `hippo-guest:<personId>` (guest), `hippo-team:<id>` (shared, one per person, written only by `/team remember`) are allowed.
- Do not use `withMemWal` autoSave. Memory writes go through the `remember` tool with dedupe.
- Memory text is never stored in Postgres. `memory_index` holds blob IDs, types, hashes and dates only. Text comes from Walrus.
- Strip credentials (API keys, private keys, tokens) from any text before `remember`.
- No custom MCP server. Portability is demonstrated with the official Walrus Memory MCP plugin on the same account.
- LLM goes through OpenRouter (`@openrouter/ai-sdk-provider`). Primary model `google/gemini-2.5-flash`. Never route to an OpenAI or Anthropic model; it disqualifies the "Beyond the Big Two" track.
- Every SDK or relayer friction you hit gets a note in `docs/PLAN.md` under bug bounty candidates, with a repro.
- Blocked on something only the human has (keys, tokens, accounts)? Do all other work, append the exact ask to `docs/BLOCKERS.md`, and continue with the next milestone. Do not stop and do not fabricate.

## Repo layout (target)

```
apps/web         Vite + React + Tailwind v4 + shadcn/ui: chat, /connect/:token, /disconnect/:token, /me
apps/server      Hono API (/api/chat streaming, /api/connect/*, /api/me/*) + channel adapters
  src/channels/  telegram (grammY), discord (discord.js), slack (Bolt socket mode), web
packages/core    agent loop, prompts, tools (remember / recall), channel-agnostic
packages/memory  MemWal client factory (guest / owned), text format, dedupe, recall policy
packages/db      Drizzle schema (people, channel_identities, delegate_keys, connect_tokens, turn_log, memory_index)
.claude/skills/  hippo-memory skill so external agents understand the memory format
docs/            see above
memwal/          reference clone (gitignored)
```

## Checks

`bun run lint` fails on warnings, not just errors, so unused imports and other drift
do not accumulate. The web pages have jsdom render tests (`apps/web/src/app/pages.test.tsx`)
that mount each page with the network stubbed and assert what a reader sees, because
typecheck and build both pass happily on a component that throws on first paint. `.github/workflows/ci.yml` runs lint, typecheck, test, the web
build and `bun pm scan` on every push, plus a guard that `.env`, `memwal/` and
`.turbo/` are never tracked. CI uses Bun for package management and Node 20 for
the application checks. `jsdom` is pinned to 26 because 30 needs Node 22. There is one
`overrides` entry, for esbuild,
because `drizzle-kit` still pulls a version with a dev-server advisory it never
uses; the reasoning is in `package.json`. Tests that read the real mainnet account skip themselves when
credentials are absent, so a fork gets a green run without secrets.

## Conventions

- TypeScript strict, Bun workspaces, Turbo, Node 20 runtime.
- Channel adapters contain no memory or LLM logic; they only translate messages to and from `packages/core`.
- Memory text format: `[type] [by:@user] [#channel]? [YYYY-MM-DD] fact` (see `docs/ARCHITECTURE.md` §5).
- Secrets only in `.env` files, which are gitignored. Keep `.env.example` current.
- Commit messages: imperative, one line, no scope prefixes.
