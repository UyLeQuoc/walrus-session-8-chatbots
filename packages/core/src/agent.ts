import {
  formatUntrustedMemories,
  isoDate,
  type MemoryPort,
  type RecalledMemory,
} from "@hippo/memory";
import { type ModelMessage, stepCountIs, streamText } from "ai";
import type { HippoModel } from "./model.ts";
import { buildSystemPrompt } from "./prompt.ts";
import { createTools } from "./tools.ts";

export interface TurnInput {
  model: HippoModel;
  port: MemoryPort;
  messages: ModelMessage[];
  channel: string;
  userHandle: string;
  memoryEnabled: boolean;
  /** First turn of a session: also pull profile/style/commitments with fixed queries. */
  sessionStart?: boolean;
}

export interface TurnContext {
  injected: RecalledMemory[];
  styleHints: string[];
}

function lastUserText(messages: ModelMessage[]): string | null {
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (m?.role !== "user") continue;
    if (typeof m.content === "string") return m.content;
    const text = m.content
      .filter((p): p is { type: "text"; text: string } => p.type === "text")
      .map((p) => p.text)
      .join(" ");
    return text || null;
  }
  return null;
}

/** Recall policy from docs/ARCHITECTURE.md §5: per-turn recall on the user message, plus session-start profile pulls. */
export async function gatherContext(input: TurnInput): Promise<TurnContext> {
  if (!input.memoryEnabled) return { injected: [], styleHints: [] };
  const query = lastUserText(input.messages);
  const seen = new Map<string, RecalledMemory>();
  const add = (list: RecalledMemory[]) => {
    for (const m of list) if (!seen.has(m.blob_id)) seen.set(m.blob_id, m);
  };
  const jobs: Promise<RecalledMemory[]>[] = [];
  if (query) jobs.push(input.port.recall({ query, limit: 6, maxDistance: 0.6 }));
  if (input.sessionStart) {
    jobs.push(
      input.port.recall({
        query: "who the user is, their stack, tools and preferences",
        limit: 5,
        maxDistance: 0.7,
      }),
    );
    jobs.push(
      input.port.recall({
        query: "how the user wants replies: language, length, tone",
        limit: 3,
        maxDistance: 0.6,
      }),
    );
    jobs.push(
      input.port.recall({
        query: "open commitments, deadlines, things promised",
        limit: 4,
        maxDistance: 0.65,
      }),
    );
  }
  for (const r of await Promise.allSettled(jobs)) if (r.status === "fulfilled") add(r.value);
  const injected = [...seen.values()].sort((a, b) => a.distance - b.distance).slice(0, 10);
  const styleHints = injected
    .filter((m) => m.parsed?.type === "style")
    .map((m) => m.parsed?.text ?? m.text);
  return { injected, styleHints };
}

export function runTurn(input: TurnInput, ctx: TurnContext) {
  const system = buildSystemPrompt({
    channel: input.channel,
    mode: input.port.scope.mode,
    memoryEnabled: input.memoryEnabled,
    userHandle: input.userHandle,
    today: isoDate(),
    styleHints: ctx.styleHints,
  });
  const messages: ModelMessage[] = [...input.messages];
  if (ctx.injected.length) {
    const block = formatUntrustedMemories(ctx.injected);
    const idx = messages.map((m) => m.role).lastIndexOf("user");
    messages.splice(Math.max(idx, 0), 0, { role: "user", content: block });
  }
  return streamText({
    model: input.model.primary,
    system,
    messages,
    tools: input.memoryEnabled ? createTools(input.port, input.channel) : undefined,
    stopWhen: stepCountIs(4),
  });
}

/** Convenience for non-streaming channels: gather, run, collect text. */
export async function completeTurn(
  input: TurnInput,
): Promise<{ text: string; ctx: TurnContext; writes: number }> {
  const ctx = await gatherContext(input);
  const result = runTurn(input, ctx);
  const text = await result.text;
  const steps = await result.steps;
  const writes = steps.flatMap((s) => s.toolCalls).filter((c) => c.toolName === "remember").length;
  return { text, ctx, writes };
}
