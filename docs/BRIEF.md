# Walrus Session 8 — "Chatbots That Remember" — One-page brief

> Condensed from the official rules (thewalrussessions.wal.app/chatbots), the DeepSurge page, the Walrus blog post, the chatbot example docs and the Airtable submission form. SDK reference: `memwal/` (clone of MystenLabs/MemWal, read-only, gitignored).

## 1. Dates and submission flow

| Milestone | When |
|---|---|
| Start | Sep 18, 2026 09:00 UTC |
| **Deadline** | **Oct 9, 2026 14:00 UTC** |
| Results | Oct 16, 2026 |

One submission per person or team. Three places to register:

1. **DeepSurge** project registration: https://www.deepsurge.xyz/hackathons/c0141a4a-21be-4009-bc63-7c168608c849
2. **Airtable form** (main submission, submit once): https://airtable.com/appoDAKpC74UOqoDa/shro5iVzzjoWfZlPK
3. **Walrus Discord** (required, used to contact you): https://discord.gg/walrusprotocol

Separate forms exist for bug-bounty-only and promo-only entries (no chatbot build).

## 2. Eligibility checklist

- [ ] Working chatbot, **reachable by real users** through at least one channel (website widget, Telegram, Discord, WhatsApp, Slack, CLI, ...)
- [ ] Integrates **Walrus Memory**; all memory stored on Walrus **Mainnet** (relayer `https://relayer.memory.walrus.xyz`)
- [ ] Agent has written **≥10 blobs on mainnet** at submission. DeepSurge adds: **≥3 distinct users, each storing ≥10 memories**
- [ ] Bot must "learn and adapt to the individual"
- [ ] **Public GitHub repo** with setup instructions that actually run
- [ ] State the **LLM and runtime** (model name + version)
- [ ] A **dedicated Sui wallet** created for Sessions (reward payout)
- [ ] **Article** on Medium or Inkray, 500–800 words (see section 4)
- [ ] Share on **X**, tag `@WalrusProtocol`, hashtag `#WalrusMemory`, under the session announcement
- [ ] **Feedback**: ≥1 bug/friction point + ≥1 improvement idea, filed as GitHub issues at https://github.com/MystenLabs/MemWal/issues
- [ ] Use the bot for **a few days with real people** before writing the article

The Airtable form also asks for: `MEMWAL_AGENT_ID` (public key of the delegate key, dashboard https://memory.walrus.xyz/dashboard → Delegate keys), `MemWalAccount object ID` (0x…), an **explorer link** to the MemWalAccount object holding the memories, number of agents that wrote blobs, which tool you used to connect (SDK / MCP / ...), a promo post link (optional), and non-web3 communities Walrus should engage (optional).

## 3. Judging criteria (Walrus panel)

1. **Does it actually remember?** Is memory doing real work or decorative? Right things recalled at the right time, visibly improving the conversation?
2. **Real-world use.** Deployed and used by real people (even a handful). Convincing before/after.
3. **Build quality.** Clean, documented, reproducible. Could someone clone and run it?
4. **The article.** Useful to someone who has never used Walrus Memory. Could they follow it? Does it make them want to build one?

## 4. Prizes ($2,500 total, paid in WAL / stablecoin)

| Track | Prize | Condition |
|---|---|---|
| **Best Chatbot** | $500 / $250 / $150 | All four criteria |
| **Beyond the Big Two** | 2 × $150 | Primary LLM is **not** Anthropic or OpenAI (Gemini, Llama/Qwen/Mistral via Ollama/vLLM, Groq, OpenRouter, DeepSeek, ...). Must state model + runtime and document integration friction. **Stacks with Best Chatbot** |
| **Best Article** | 3 × $100 | Clarity, honesty, usefulness to a newcomer |
| **Bug Bounty** | 5 × $100 | GitHub issues with repro steps, expected vs actual, environment (model, runtime, OS, SDK version). Judged separately by the eng team |
| **Promo** | 5 × $100 | Post in a community **outside** Walrus/Sui (subreddit, dev forum, other Discord, newsletter). X, r/sui, r/walrus do **not** count |

→ One strong submission can win in up to **five tracks**.

### The article must cover
- What the bot does, who it is for, what problem it solves
- How Walrus Memory is integrated: **what gets stored, when it is recalled, how it shapes responses**
- **Before/after**: behaviour without memory vs with it
- **Evidence of real use**: screenshots, logs, video, live link. Especially the moment the bot recalled something from a previous session and it *mattered*
- Written as a story, "honest over polished", 500–800 words. Title for search intent: "how to add memory to a support chatbot", "chatbot that remembers users between sessions"

## 5. Walrus Memory (MemWal) — what you need to build

**What it is.** A memory layer for agents. Text → relayer embeds + SEAL-encrypts → uploads a blob to Walrus → indexes the vector in the relayer DB. Ownership is enforced on-chain (Sui). Recall = semantic search. Isolation boundary = `owner + namespace`.

**Credentials** (create at https://memory.walrus.xyz with a Sui wallet):
- `MEMWAL_ACCOUNT_ID` — MemWalAccount object ID (0x…)
- `MEMWAL_PRIVATE_KEY` — **delegate key** hex (not the owner key), server-side only
- `MEMWAL_SERVER_URL` — `https://relayer.memory.walrus.xyz` (mainnet) / `relayer-staging.memory.walrus.xyz` (testnet)

**Cost.** The Walrus Foundation managed relayer **pays storage fees** from its server wallet, with possible usage limits and no SLA. You do not need to hold WAL.

**SDKs.** TypeScript `@mysten-incubation/memwal` (Node ≥18). Python `pip install memwal`. MCP `@mysten-incubation/memwal-mcp`.

```ts
const memwal = MemWal.create({ key, accountId, serverUrl, namespace: "my-app" });
await memwal.rememberAndWait("User prefers dark mode.", ns, { timeoutMs: 30_000 }); // one fact
await memwal.analyzeAndWait("long free text...", ns);   // LLM extracts facts, stores each
const r = await memwal.recall({ query, namespace: ns, limit: 5, maxDistance: 0.7 });
// r.results[] = { blob_id, text, distance }
await memwal.listNamespaces(); await memwal.restore(ns, 50); await memwal.health();
```

**Vercel AI SDK middleware** (lightest integration, used by the example chatbot):
```ts
import { withMemWal } from "@mysten-incubation/memwal/ai";
const model = withMemWal(baseModel, { key, accountId, serverUrl, namespace, maxMemories: 5, autoSave: true, minRelevance: 0.3 });
```
Before each LLM call: takes the last user message → recall → injects results into the prompt as *untrusted data* (nonce-delimited). After: `analyze(userMessage)` fire-and-forget. `model.flush()` for serverless.

**Multi-user pattern (official cookbook).** One operator account + one delegate key on the server; **one namespace per user** (`myapp-<userId>`, lowercase, stable). A namespace is a *data-organization* boundary, NOT a security boundary. Authenticate the user first, then map to the namespace. The example chatbot uses `chatbot-user:<id>`.

**Gotchas (also candidate bug-bounty / friction reports):**
- `remember()` is **always append, never upsert** → duplicate memories, dedupe yourself.
- `recall()` has **no default relevance threshold** → small namespaces return filler; filter `distance < 0.7` (< 0.25 near-duplicate, 0.25–0.55 related).
- Indexing lags a few seconds → use `*AndWait` when saving then recalling in the same flow.
- Namespace: flat string, exact match, ≤255 UTF-8 bytes, no hierarchy. Namespace names are **public on-chain**, keep sensitive info out of them.
- `restore()` has no cursor; it is a "top up the N newest blobs" operation.
- Deletion: `POST /api/forget` only removes the index row (memory becomes unrecallable); the Walrus blob persists until epoch expiry. Permanent deletion goes through the Security Delete API signed by the owner wallet.
- The relayer sees plaintext while embedding/encrypting (trust assumption of the managed relayer).
- `401` = wrong key / key not registered on the account / staging vs mainnet mismatch.

**Worth reading in `memwal/`:** `SKILL.md` (complete single-file reference), `docs/sdk/cookbook-multi-tenant.md`, `docs/guides/system-prompt-templates.md` (prompts that make the agent remember/recall on its own), `packages/sdk/src/ai/middleware.ts`, `apps/chatbot/` (Next.js + AI SDK example: `lib/ai/tools/save-memory.ts`, `lib/ai/memory-namespace.ts`), `docs/guides/delete-memories-programmatically.md`.

## 6. Links
- MemWal GitHub: https://github.com/MystenLabs/MemWal · Docs: https://memory.walrus.xyz · llms.txt: https://docs.wal.app/walrus-memory/llms.txt
- Chatbot example docs: https://docs.wal.app/walrus-memory/examples/chatbot
- Intro blog: https://blog.walrus.xyz/how-to-add-portable-memory-to-claude-code-and-codex-with-walrus-memory/
- Notion deck: https://app.notion.com/p/mystenlabs/SuiHub-Lagos-Walrus-Memory-Hackathon-1-3756d9dcb4e9808ca16fc8c22562e3c6
- Sessions hub: https://thewalrussessions.wal.app/ · Wallet: https://slush.app/get-started

## 7. See also
`IDEA.md` (pitch), `ARCHITECTURE.md` (design), `PLAN.md` (timeline and submission), `MEMWAL-NOTES.md` (SDK and relayer details).
