/**
 * `pnpm demo` — the memory eval. Two sessions against the real mainnet relayer:
 * teach hippo some facts, change one of them, throw the conversation away, then
 * ask questions that can only be answered from Walrus. This is the evidence for
 * "does it actually remember", and it doubles as an end-to-end smoke test for
 * reviewers.
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
  // Contradicts the pnpm line above. Both get stored — a correction is related
  // to what it corrects, not a duplicate of it — so session two recalls both,
  // and only ordering plus the conflict rule decide which one is believed.
  "Change of plan: we moved this project from pnpm to bun this week, so use bun now.",
];

const ASK: Array<{ q: string; expect: RegExp; why: string }> = [
  {
    q: "Which package manager should I use here?",
    expect: /\bbun\b/i,
    why: "believes the correction over the fact it replaced",
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
 * The fact the correction replaced, and the one it replaced it with. An answer
 * that names pnpm without bun is presenting the superseded fact as current,
 * whichever question it was answering. Checking only the package-manager
 * question missed exactly that: on 2026-09-24 it passed with "use bun" while
 * "what do you know about me?" answered "you only use pnpm".
 */
const STALE = /pnpm/i;
const CURRENT = /\bbun\b/i;

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
): Promise<{ ok: boolean; text: string; injected: string[] }> {
  const other = createMemoryPort({
    scope: { mode: "guest", ...operator, namespace },
    by: "mai",
    channel: "telegram",
  });
  const turn = await completeTurn({
    model,
    port: other,
    messages: [{ role: "user", content: "Which ORM did we pick for this project?" }],
    channel: "telegram",
    userHandle: "mai",
    memoryEnabled: true,
    sessionStart: true,
  });
  const ok = /drizzle/i.test(turn.text);
  console.log(`
CROSS-CHANNEL — a second channel, same memory`);
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${turn.text.replace(/\n/g, " ").slice(0, 120)}`);
  console.log(`        recalled ${turn.ctx.injected.length} memories`);
  return { ok, text: turn.text, injected: turn.ctx.injected.map((m) => m.text) };
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
  const results: Array<{
    ok: boolean;
    q: string;
    why: string;
    answer: string;
    full: string;
    injected: string[];
  }> = [];
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
      full: turn.text,
      injected: turn.ctx.injected.map((m) => m.text),
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

  const cross = await crossChannelCheck(model, port.scope.namespace, {
    key: env.MEMWAL_PRIVATE_KEY,
    accountId: env.MEMWAL_ACCOUNT_ID,
    serverUrl: env.MEMWAL_SERVER_URL,
  });
  const crossOk = cross.ok;

  // Measured, not asserted: what was actually in context, and what came out.
  const direct = results.find((r) => r.q === "Which package manager should I use here?");
  const had = (texts: string[] = [], re: RegExp) => texts.some((t) => re.test(t));
  const answers = [
    ...results.map((r) => ({ q: r.q, text: r.full, injected: r.injected })),
    { q: "(cross-channel) Which ORM did we pick?", text: cross.text, injected: cross.injected },
  ];
  const stale = answers.filter((a) => STALE.test(a.text) && !CURRENT.test(a.text));
  const newestOk = Boolean(direct?.ok) && stale.length === 0;
  console.log(`\nCONFLICT — pnpm was taught, then corrected to bun. Did the correction win?`);
  console.log(
    `  ${direct?.ok ? "PASS" : "FAIL"}  asked directly: answered ${direct?.ok ? "bun" : "without bun"}; in context: pnpm memory ${had(direct?.injected, STALE) ? "yes" : "no"}, bun correction ${had(direct?.injected, CURRENT) ? "yes" : "no"}`,
  );
  console.log(
    `  ${stale.length ? "FAIL" : "PASS"}  ${stale.length} of ${answers.length} answers stated pnpm without bun`,
  );
  for (const a of stale) {
    console.log(
      `        "${a.q}" — the correction was ${had(a.injected, CURRENT) ? "in context and ignored" : "never recalled"}`,
    );
  }

  const passed = results.filter((r) => r.ok).length;
  console.log(`\n${passed}/${results.length} recalled correctly across sessions.`);
  console.log(`newest fact wins:     ${newestOk ? "PASS" : "FAIL"}`);
  console.log(`style adaptation:     ${styleOk ? "PASS" : "FAIL"}`);
  console.log(`cross-channel recall: ${crossOk ? "PASS" : "FAIL"}`);
  console.log(`namespace: ${port.scope.namespace}`);
  if (passed < results.length || !crossOk || !styleOk || !newestOk) process.exitCode = 1;
}

await main();
