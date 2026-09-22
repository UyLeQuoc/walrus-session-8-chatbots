/**
 * `pnpm demo` — the memory eval. Two sessions against the real mainnet relayer:
 * teach hippo some facts, throw the conversation away, then ask questions that
 * can only be answered from Walrus. This is the evidence for "does it actually
 * remember", and it doubles as an end-to-end smoke test for reviewers.
 */
import { createMemoryPort, guestScope, loadEnv, readOperatorEnv } from "@hippo/memory";
import type { ModelMessage } from "ai";
import { completeTurn } from "./agent.ts";
import { createModel } from "./model.ts";

loadEnv();

const TEACH = [
  "Hi, I'm Mai. I work on Sui and Next.js, always in TypeScript strict mode.",
  "For package managers I only use pnpm, never npm or yarn.",
  "We decided to use Drizzle instead of Prisma for this project's ORM.",
  "One thing to remember: our Postgres runs on port 5433 because 5432 is taken.",
  "Please keep your answers short, and always answer me in Vietnamese.",
];

const ASK: Array<{ q: string; expect: RegExp; why: string }> = [
  {
    q: "Which package manager should I use here?",
    expect: /pnpm/i,
    why: "recalls a stated preference",
  },
  { q: "Which ORM did we settle on?", expect: /drizzle/i, why: "recalls a decision" },
  { q: "What port is the database on?", expect: /5433/, why: "recalls a gotcha" },
  { q: "What do you know about me?", expect: /sui|next|typescript/i, why: "recalls a profile" },
];

/**
 * The style check is the sharpest evidence that memory changes behaviour rather
 * than just being quoted back. Nothing in session two asks for Vietnamese; a
 * `style` memory written in session one is the only reason it would appear.
 * Vietnamese-only diacritics, so an English answer cannot pass by accident.
 */
const VIETNAMESE = /[ăâđêôơưĂÂĐÊÔƠƯàáảãạằắẳẵặầấẩẫậèéẻẽẹềếểễệìíỉĩịòóỏõọồốổỗộờớởỡợùúủũụừứửữựỳýỷỹỵ]/;

const INDEX_WAIT_MS = Number(process.env.DEMO_INDEX_WAIT_MS ?? 90_000);

/**
 * The same memory reached from a second "channel": a different MemoryPort, a
 * different handle, no shared conversation, pointed at the same namespace. That
 * is exactly what linking two channels does on the server, so this is the
 * automated version of the manual web-to-CLI check in
 * docs/evidence/cross-channel-2026-09-21.md.
 */
async function crossChannelCheck(
  model: ReturnType<typeof createModel>,
  namespace: string,
  operator: { key: string; accountId: string; serverUrl: string },
): Promise<boolean> {
  const other = createMemoryPort({
    scope: { mode: "guest", ...operator, namespace },
    by: "mai",
    channel: "telegram",
  });
  const turn = await completeTurn({
    model,
    port: other,
    messages: [{ role: "user", content: "Which package manager do I use?" }],
    channel: "telegram",
    userHandle: "mai",
    memoryEnabled: true,
    sessionStart: true,
  });
  const ok = /pnpm/i.test(turn.text);
  console.log(`
CROSS-CHANNEL — a second channel, same memory`);
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${turn.text.replace(/\n/g, " ").slice(0, 120)}`);
  console.log(`        recalled ${turn.ctx.injected.length} memories`);
  return ok;
}

async function main() {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("OPENROUTER_API_KEY missing");
  const env = readOperatorEnv();
  const model = createModel({
    apiKey,
    model: process.env.LLM_MODEL ?? "google/gemini-2.5-flash",
    fallbackModel: process.env.LLM_FALLBACK_MODEL,
  });

  const personId = `demo-${Date.now().toString(36)}`;
  const port = createMemoryPort({
    scope: guestScope(
      {
        key: env.MEMWAL_PRIVATE_KEY,
        accountId: env.MEMWAL_ACCOUNT_ID,
        serverUrl: env.MEMWAL_SERVER_URL,
      },
      personId,
    ),
    by: "mai",
    channel: "demo",
    onWrite: (e) => {
      if (e.outcome === "stored" && e.blobId)
        console.log(`    stored [${e.type}] blob ${e.blobId.slice(0, 12)}…`);
      if (e.outcome === "failed") console.log(`    FAILED [${e.type}] ${e.error ?? ""}`);
    },
  });

  console.log(`hippo memory eval · model ${model.id} · namespace ${port.scope.namespace}\n`);
  console.log("SESSION 1 — teaching");
  const first: ModelMessage[] = [];
  let writes = 0;
  for (const [i, text] of TEACH.entries()) {
    first.push({ role: "user", content: text });
    const turn = await completeTurn({
      model,
      port,
      messages: first,
      channel: "demo",
      userHandle: "mai",
      memoryEnabled: true,
      sessionStart: i === 0,
    });
    first.push({ role: "assistant", content: turn.text });
    writes += turn.writes;
    console.log(`  › ${text}`);
    console.log(`  ‹ ${turn.text.replace(/\n/g, " ").slice(0, 100)}  (${turn.writes} writes)`);
  }
  console.log(`\n  ${writes} memories written. Waiting ${INDEX_WAIT_MS / 1000}s for indexing…`);
  await port.flush();
  await new Promise((r) => setTimeout(r, INDEX_WAIT_MS));

  console.log("\nSESSION 2 — fresh conversation, no history carried over");
  const results: Array<{ ok: boolean; q: string; why: string; answer: string; injected: number }> =
    [];
  for (const { q, expect, why } of ASK) {
    const turn = await completeTurn({
      model,
      port,
      messages: [{ role: "user", content: q }],
      channel: "demo",
      userHandle: "mai",
      memoryEnabled: true,
      sessionStart: true,
    });
    const ok = expect.test(turn.text);
    results.push({
      ok,
      q,
      why,
      answer: turn.text.replace(/\n/g, " ").slice(0, 120),
      injected: turn.ctx.injected.length,
    });
    console.log(`  ${ok ? "PASS" : "FAIL"}  ${q}`);
    console.log(`        ${turn.text.replace(/\n/g, " ").slice(0, 140)}`);
    console.log(`        recalled ${turn.ctx.injected.length} memories`);
  }

  const styleAnswer = results.find((r) => r.q === "What do you know about me?")?.answer ?? "";
  const styleOk = VIETNAMESE.test(styleAnswer);
  console.log(`\nSTYLE — did a [style] memory change how it writes?`);
  console.log(
    `  ${styleOk ? "PASS" : "FAIL"}  the answer came back ${styleOk ? "in Vietnamese" : "in English"}, unprompted in this session`,
  );

  const crossOk = await crossChannelCheck(model, port.scope.namespace, {
    key: env.MEMWAL_PRIVATE_KEY,
    accountId: env.MEMWAL_ACCOUNT_ID,
    serverUrl: env.MEMWAL_SERVER_URL,
  });

  const passed = results.filter((r) => r.ok).length;
  console.log(`\n${passed}/${results.length} recalled correctly across sessions.`);
  console.log(`style adaptation:     ${styleOk ? "PASS" : "FAIL"}`);
  console.log(`cross-channel recall: ${crossOk ? "PASS" : "FAIL"}`);
  console.log(`namespace: ${port.scope.namespace}`);
  if (passed < results.length || !crossOk || !styleOk) process.exitCode = 1;
}

await main();
