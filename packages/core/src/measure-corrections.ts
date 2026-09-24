/**
 * `pnpm measure:corrections` — how often does the model store a change of mind?
 *
 * The conflict machinery (newest-first ordering, the corrections pull, the
 * dedupe exemption) is worth nothing if the correction is never written, and
 * whether it is written is a prompt question with a noisy answer. Measured on
 * 2026-09-24 with gemini-2.5-flash, in the third condition below (the demo's
 * own session one, with its facts in recalled memory):
 *
 *   original prompt                              12/12, one typed profile
 *   + a "when memories disagree" rule            16/20   (a regression)
 *   + an explicit CHANGES rule, current prompt   12/12, all typed correction
 *
 * The regression only showed when the old fact was already in recalled memory,
 * so the conditions below differ in exactly that. A change typed `profile`
 * instead of `correction` counts as a miss: dedupe would treat it as a repeat
 * of the fact it replaces and store nothing.
 *
 * Nothing is written to Walrus: the memory port is a fake that records the
 * calls. Only the model is real, and a run costs well under a cent.
 *
 *   TRIALS=12 pnpm measure:corrections
 *   LLM_MODEL=qwen/qwen3.7-flash pnpm measure:corrections
 */
import { loadEnv, type MemoryPort, type MemoryType, type RecalledMemory } from "@hippo/memory";
import type { ModelMessage } from "ai";
import { completeTurn } from "./agent.ts";
import { createModel } from "./model.ts";

loadEnv();

const apiKey = process.env.OPENROUTER_API_KEY;
if (!apiKey) throw new Error("OPENROUTER_API_KEY missing");
const model = createModel({ apiKey, model: process.env.LLM_MODEL ?? "google/gemini-2.5-flash" });
const TRIALS = Number(process.env.TRIALS ?? 6);

/** A fact, how hippo acknowledged it, and the later change to it. */
const SCENARIOS: Array<[string, string, string]> = [
  [
    "For package managers I only use pnpm, never npm or yarn.",
    "Understood. You use pnpm exclusively.",
    "Change of plan: we moved this project from pnpm to bun this week, so use bun now.",
  ],
  [
    "I use VS Code with vim bindings.",
    "Noted: VS Code with vim bindings.",
    "Actually I don't use VS Code anymore, I switched to Neovim.",
  ],
  [
    "I promised to ship the billing export by October 3.",
    "Got it, billing export due October 3.",
    "The deadline moved: it's October 10 now, not October 3.",
  ],
];

function recalled(type: MemoryType, text: string): RecalledMemory {
  return {
    blob_id: text,
    distance: 0.5,
    created_at: "2026-09-24T09:41:12Z",
    text: `[${type}] [by:@mai] [#demo] [2026-09-24] ${text}`,
    parsed: { type, tags: {}, date: "2026-09-24", text },
  };
}

/** Records what the model asked to remember; recalls `held` for any topical query. */
function fakePort(held: RecalledMemory[], calls: string[]): MemoryPort {
  return {
    scope: { mode: "guest", namespace: "measure", key: "", accountId: "", serverUrl: "" },
    recall: async ({ query }) => (query === "[correction]" ? [] : held),
    remember: async ({ type }) => {
      calls.push(type);
      return { saved: true, note: "Stored." };
    },
    flush: async () => {},
  } as MemoryPort;
}

async function measure(
  label: string,
  cases: typeof SCENARIOS,
  build: (s: (typeof SCENARIOS)[number]) => { messages: ModelMessage[]; held: RecalledMemory[] },
) {
  let stored = 0;
  let total = 0;
  const types: Record<string, number> = {};
  for (const scenario of cases) {
    for (let t = 0; t < TRIALS; t++) {
      const calls: string[] = [];
      const { messages, held } = build(scenario);
      await completeTurn({
        model,
        port: fakePort(held, calls),
        messages,
        channel: "demo",
        userHandle: "mai",
        memoryEnabled: true,
      });
      total++;
      if (calls.includes("correction")) stored++;
      const key = calls.join("+") || "(no call)";
      types[key] = (types[key] ?? 0) + 1;
    }
  }
  console.log(
    `${label.padEnd(34)} stored as correction ${stored}/${total}  ${JSON.stringify(types)}`,
  );
  return stored === total;
}

/** The demo's session one, verbatim, ending on the change of plan. */
const DEMO_SESSION: ModelMessage[] = [
  {
    role: "user",
    content: "Hi, I'm Mai. I work on Sui and Next.js, always in TypeScript strict mode.",
  },
  { role: "assistant", content: "Hi Mai. Got it, Sui, Next.js, and TypeScript strict mode." },
  { role: "user", content: "For package managers I only use pnpm, never npm or yarn." },
  { role: "assistant", content: "Understood. You use pnpm exclusively." },
  { role: "user", content: "We decided to use Drizzle instead of Prisma for this project's ORM." },
  { role: "assistant", content: "Drizzle it is." },
  {
    role: "user",
    content: "One thing to remember: our Postgres runs on port 5433 because 5432 is taken.",
  },
  { role: "assistant", content: "Got it. Postgres runs on port 5433." },
  { role: "user", content: "Please keep your answers short, and always answer me in Vietnamese." },
  {
    role: "assistant",
    content: "Đã hiểu. Câu trả lời của tôi sẽ ngắn gọn và luôn bằng tiếng Việt.",
  },
  {
    role: "user",
    content: "Change of plan: we moved this project from pnpm to bun this week, so use bun now.",
  },
];
const DEMO_HELD = [
  recalled("profile", "For package managers I only use pnpm, never npm or yarn."),
  recalled("profile", "I work on Sui and Next.js, always in TypeScript strict mode."),
  recalled("decision", "We decided to use Drizzle instead of Prisma for this project's ORM."),
  recalled("style", "Please keep your answers short, and always answer me in Vietnamese."),
];

const short = ([fact, ack, change]: (typeof SCENARIOS)[number]): ModelMessage[] => [
  { role: "user", content: fact },
  { role: "assistant", content: ack },
  { role: "user", content: change },
];

console.log(`model ${model.id}, ${TRIALS} trials per case\n`);
const results = [
  await measure("old fact only in the conversation", SCENARIOS, (s) => ({
    messages: short(s),
    held: [],
  })),
  await measure("old fact also in recalled memory", SCENARIOS, (s) => ({
    messages: short(s),
    held: [recalled("profile", s[0])],
  })),
  await measure("the demo's session one", SCENARIOS.slice(0, 1), () => ({
    messages: DEMO_SESSION,
    held: DEMO_HELD,
  })),
];
if (results.includes(false)) process.exitCode = 1;
