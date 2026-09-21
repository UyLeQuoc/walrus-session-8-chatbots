/** `pnpm hippo` — talk to hippo in the terminal as a guest person "cli". */
import { createInterface } from "node:readline/promises";
import { createMemoryPort, guestScope, loadEnv, readOperatorEnv } from "@hippo/memory";
import type { ModelMessage } from "ai";
import { gatherContext, runTurn } from "./agent.ts";
import { createModel } from "./model.ts";

loadEnv();
const apiKey = process.env.OPENROUTER_API_KEY;
if (!apiKey) throw new Error("OPENROUTER_API_KEY missing in .env");
const env = readOperatorEnv();
const memoryEnabled = !process.argv.includes("--no-memory");
const personId = process.env.HIPPO_CLI_PERSON ?? "cli";

const model = createModel({
  apiKey,
  model: process.env.LLM_MODEL ?? "google/gemini-2.5-flash",
  fallbackModel: process.env.LLM_FALLBACK_MODEL,
});
const port = createMemoryPort({
  scope: guestScope(
    {
      key: env.MEMWAL_PRIVATE_KEY,
      accountId: env.MEMWAL_ACCOUNT_ID,
      serverUrl: env.MEMWAL_SERVER_URL,
    },
    personId,
  ),
  by: personId,
  channel: "cli",
  onWrite: (e) => console.log(`  ⟶ memory ${e.outcome} [${e.type}] blob ${e.blobId.slice(0, 12)}…`),
});

console.log(
  `hippo cli · model ${model.id} · memory ${memoryEnabled ? "on" : "off"} · namespace ${port.scope.namespace}`,
);
console.log("type /quit to exit\n");
const rl = createInterface({ input: process.stdin, output: process.stdout });
const messages: ModelMessage[] = [];
let sessionStart = true;

while (true) {
  const line = (await rl.question("you › ")).trim();
  if (!line) continue;
  if (line === "/quit") break;
  messages.push({ role: "user", content: line });
  const input = {
    model,
    port,
    messages,
    channel: "cli",
    userHandle: personId,
    memoryEnabled,
    sessionStart,
  };
  const ctx = await gatherContext(input);
  if (ctx.injected.length)
    console.log(
      `  (recalled ${ctx.injected.length}: ${ctx.injected.map((m) => m.distance.toFixed(2)).join(", ")})`,
    );
  const result = runTurn(input, ctx);
  process.stdout.write("hippo › ");
  for await (const chunk of result.textStream) process.stdout.write(chunk);
  process.stdout.write("\n\n");
  const responseMessages = (await result.response).messages;
  messages.push(...responseMessages);
  sessionStart = false;
}
rl.close();
