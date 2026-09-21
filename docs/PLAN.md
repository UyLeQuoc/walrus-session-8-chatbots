# Plan

Deadline: **Oct 9, 2026 14:00 UTC**. Today: Sep 22. Real users need about a week, so the bot must be live by **Sep 27**.

## Milestone 0 — Setup (Sep 22)

Goal: a monorepo anyone can clone and run in five commands, with every layer present as a real, typed, running stub, so that from Sep 23 the work is features and spikes, not plumbing.

Done when:
- [x] `pnpm install && pnpm typecheck && pnpm build` pass on a clean clone.
- [x] `docker compose up -d` starts Postgres; `pnpm db:push` creates the schema (people, channel_identities, delegate_keys, connect_tokens, web_sessions, turn_log, memory_index).
- [ ] (needs real operator credentials) `pnpm smoke` (packages/memory) health-checks the mainnet relayer and, when `.env` has operator credentials, writes one memory and recalls it.
- [ ] (needs OPENROUTER_API_KEY + operator credentials) `pnpm hippo` (packages/core CLI) holds a conversation through OpenRouter with the `remember` / `recall` tools wired to the guest namespace.
- [x] `pnpm dev:server` serves `GET /api/health` and a streaming `POST /api/chat`; channel adapters start only when their tokens are present.
- [x] `pnpm dev:web` serves the Vite + Tailwind v4 + shadcn app with a chat page that streams from the server.
- [x] `.env.example` lists every variable; `README.md` has the five commands; `.claude/skills/hippo-memory/SKILL.md` exists.

## Timeline

| Dates | Milestone | Done when |
|---|---|---|
| Sep 22 | Docs, repo scaffold, operator account on memory.walrus.xyz, dedicated Sessions wallet, DeepSurge + Discord registration | `pnpm dev` runs an empty bot; operator `remember`/`recall` works on mainnet |
| Sep 23 | Spikes 1–10 from `ARCHITECTURE.md` §10 (time-box the manual decrypt to 2 h) | Sponsored `add_delegate_key` from localhost succeeds; revoke gives 401; zkLogin path decided |
| Sep 23–24 | Core + CLI + web chat + Telegram, guest mode end to end: `remember`/`recall` tools, `style` adaptation, dedupe, recall policy, `/memory`, `/whoami`, `/memory off`, `turn_log` | 3 test users each have 10+ memories written by the bot on mainnet |
| Sep 25–26 | Owned mode: connect page (Slush + zkLogin), token flow, on-chain verification, key encryption, dual-read or migration, `/disconnect`, `/me` with SuiNS + expiry + Claude Code steps | Revoke demo recorded on video |
| Sep 26 | Discord adapter, identity linking across channels, `/proof` | Same fact recalled on Telegram, web and Discord |
| Sep 27 | Deploy (Railway + Walrus Sites, Vercel backup), README + docker-compose, `pnpm demo`, `pnpm evidence`, WalForm survey, invite users. Slack and Sui Stack Messaging only if everything else is green. | Bot reachable via web link and Telegram handle |
| Sep 27–28 | **Baseline phase**: users chat with `/memory off`. Save logs. | Baseline transcripts for 3+ users |
| Sep 29–Oct 4 | Memory on. Daily use. File GitHub issues as frictions appear. Claude Code portability demo. | 3+ users × 10+ memories each, screenshots of "the moment it mattered" |
| Oct 5–6 | Article draft (500–800 words), video, promo posts | Published on Medium + Inkray |
| Oct 7 | X post under the session announcement, feedback form, Airtable + DeepSurge submission | Submitted |
| Oct 8–9 | Buffer | |

## Real users

Target 5, minimum 3, developers preferred so the Claude Code portability demo lands:

- 2–3 developer friends on Telegram (daily use).
- At least one who also uses the web chat and one who connects a wallet (owned mode).
- Ask each to do the baseline day first. Keep the invite link public so judges can try it.

Evidence to collect per user: baseline transcript, first "it remembered" moment, `/whoami` screenshot with explorer link, memory count.

## Bug bounty candidates (verify each on mainnet before filing)

Each becomes a GitHub issue with repro, expected vs actual, environment (Gemini 2.5 Flash via OpenRouter, Node 20, macOS, SDK 0.1.7).

1. `remember()` is append-only with no idempotency key or dedupe option; repeated facts pollute recall.
2. TS SDK has no `forget()`, `ask()`, or list-memories wrapper although the relayer exposes `/api/forget`, `/api/ask`, `/v1/owners/:owner/memories`.
3. No endpoint returns a memory's text by ID; "list what you remember" is impossible without recall guesses.
4. `recall()` has no default relevance cutoff; small namespaces return filler (documented, still friction).
5. npm `latest` is 0.1.7 while docs and `SKILL.md` describe 0.1.8 APIs (check which methods differ).
6. `MEMWAL_PRIVATE_KEY` vs `MEMWAL_KEY` naming split across docs.
7. Sponsorship allowlist (create/add/remove only) is not in public docs, only in `sponsor.rs`.
8. `restore()` has no cursor.
9. Write rate limit 30/min per delegate key is undocumented in the public relayer page; multi-tenant guest pattern hits it.
10. Whatever breaks in the connect flow (CORS, Enoki origins, gRPC vs JSON-RPC client differences).
11. Vietnamese fact extraction / embedding quality if `analyze` mangles diacritics.
12. zkLogin address split between apps (documented for Console, not for third-party builders); ask for Enoki Connect or a guide.
13. Blob epochs purchased by the managed relayer, if `expires_at` is short.
14. Security Delete API off on the managed relayer, if it is.

Aim for 5 high-quality issues, not 11 thin ones.

## Article outline (Medium + Inkray)

Title candidates, written for search intent:
- "I gave my chatbot memory, then gave the memory back to the users"
- "How to build a chatbot whose users own their memory on-chain (Walrus Memory + Gemini)"

Sections:
1. The problem: bots forget, and when they remember, the vendor owns it.
2. What hippo does (30 seconds, one screenshot).
3. Wiring Walrus Memory: what gets stored, when it is recalled, how it shapes replies. Code snippets for the tools and the recall policy.
4. Before/after #1: memory off vs on, real transcripts.
5. Before/after #2: bot-owned vs user-owned. The revoke demo. The Claude Code recall.
6. What broke: the issues list, honestly.
7. Run it yourself: repo, env, 5 commands.

500–800 words, honest over polished, tag @WalrusProtocol, #WalrusMemory.

## Promo (outside Walrus/Sui)

- Show HN: "Chatbot where users own their memory on-chain, same memory on Telegram, web and Claude Code" (link to article).
- dev.to cross-post.
- r/LocalLLaMA or r/discordapp only if it fits their rules; otherwise a Vietnamese dev community (Viblo, J2Team) which counts as outside the ecosystem.

## Submission checklist (maps to `BRIEF.md` §2)

- [ ] DeepSurge project created
- [ ] Discord joined
- [ ] Operator MemWalAccount on mainnet; agent (delegate) public key noted for the form
- [ ] ≥3 users × ≥10 memories; explorer link to the operator account and to at least one user-owned account
- [ ] Public repo with README that runs
- [ ] LLM + runtime stated (Gemini 2.5 Flash via OpenRouter, Vercel AI SDK, Node 20)
- [ ] Article published (Medium + Inkray)
- [ ] X post under session announcement
- [ ] ≥1 bug + ≥1 improvement idea filed on GitHub, listed in form
- [ ] Promo post link
- [ ] Dedicated Sui wallet address for rewards
- [ ] Airtable form submitted

## Setup checklist (accounts, keys, tooling)

Do these before writing code. Everything here is free.

**Walrus / Sui**
- [ ] Slush wallet, one dedicated address for Sessions (rewards + operator account owner). https://slush.app/get-started
- [ ] Operator MemWalAccount on https://memory.walrus.xyz (mainnet), one delegate key labelled `hippo-server`. Save `MEMWAL_ACCOUNT_ID`, `MEMWAL_PRIVATE_KEY`, and the delegate public key (the form's `MEMWAL_AGENT_ID`).
- [ ] A second throwaway wallet for testing owned mode end to end.
- [ ] Join Walrus Discord, register on DeepSurge.

**LLM**
- [ ] OpenRouter API key. Set `LLM_MODEL=google/gemini-2.5-flash`. Add a few dollars of credit.

**Channels**
- [ ] Telegram: `@BotFather` → `/newbot` → `TELEGRAM_BOT_TOKEN`. Enable inline privacy off if group use is wanted.
- [ ] Discord: Developer Portal → New Application → Bot → copy token, enable **Message Content Intent**; OAuth2 URL with `bot` + `applications.commands` scopes to invite it to a test server. `DISCORD_TOKEN`, `DISCORD_CLIENT_ID`.
- [ ] Slack: api.slack.com/apps → From scratch → enable **Socket Mode** (app-level token `SLACK_APP_TOKEN` with `connections:write`) → Bot scopes `chat:write`, `im:history`, `im:read`, `im:write`, `app_mentions:read`, `commands` → Event subscriptions `message.im`, `app_mention` → install to workspace → `SLACK_BOT_TOKEN`, `SLACK_SIGNING_SECRET`.

**Sui Stack extras**
- [ ] Enoki Portal app (free tier): API key, enable zkLogin + Google provider, add web origins (localhost, Walrus Sites URL, Vercel URL). Google Cloud OAuth client ID with the same origins.
- [ ] `walrus` CLI and `site-builder` CLI installed, mainnet config, a little WAL + SUI in the Sessions wallet for site deploys.
- [ ] Optional SuiNS name for the site (`hippo.sui` or similar) if budget allows; base36 subdomain works without it.
- [ ] WalForm survey created for user feedback.

**Infra**
- [ ] Neon Postgres project → `DATABASE_URL`.
- [ ] Railway project for `apps/server` (long-running Node, not serverless).
- [ ] Vercel or Cloudflare Pages for `apps/web` (static). Set `VITE_API_URL`.
- [ ] `KEY_ENCRYPTION_KEY` and `SESSION_SECRET`: `openssl rand -hex 32` each.

**Local tooling**
- [ ] Node 20 (`nvm use 20`), pnpm 9, `pnpm dlx shadcn@latest init` in `apps/web` after Vite + Tailwind v4 are in place.
- [ ] `memwal/` clone present (see `CLAUDE.md`).

**Scaffold order**
1. `pnpm init` workspace, `turbo.json`, root `tsconfig.base.json`, biome.
2. `packages/db` (Drizzle + Neon driver, `pnpm db:push`).
3. `packages/memory` (client factory, `signedRequest`, dedupe, recall policy) with a script that writes and recalls one memory on mainnet using the operator key.
4. `packages/core` (agent loop with `streamText`, tools) with a CLI runner for quick testing.
5. `apps/server` (Hono + web channel + Telegram adapter), then Discord, then Slack.
6. `apps/web` (Vite, Tailwind, shadcn, dapp-kit + Enoki, chat page, connect page, `/me`).
7. `.claude/skills/hippo-memory/SKILL.md`, `pnpm demo`, `pnpm evidence`, Walrus Sites deploy.
