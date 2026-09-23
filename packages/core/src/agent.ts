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
  /**
   * The search string, not the message. A long paste is a legitimate thing to
   * send a bot, but sending all of it to the relayer as an embedding query is
   * slow, spends shared budget, and searches worse than the first couple of
   * sentences would. The model still sees the whole message.
   *
   * 300 characters is the same ceiling the `recall` tool's own schema enforces,
   * so the two paths cannot disagree.
   */
  const query = lastUserText(input.messages)?.slice(0, 300) ?? null;
  const seen = new Map<string, RecalledMemory>();
  const add = (list: RecalledMemory[]) => {
    for (const m of list) if (!seen.has(m.blob_id)) seen.set(m.blob_id, m);
  };
  // Lazy, so they can be issued one at a time. Concurrent recalls make the
  // relayer drop matches and answer with an empty result (docs/SPIKES.md §H),
  // and a session-start turn would otherwise fire four at once. The extra
  // latency is worth not silently forgetting.
  const jobs: Array<() => Promise<RecalledMemory[]>> = [];
  if (query) jobs.push(() => input.port.recall({ query, limit: 6 }));
  if (input.sessionStart) {
    jobs.push(() =>
      input.port.recall({
        query: "who the user is, their stack, tools and preferences",
        limit: 5,
        maxDistance: 0.7,
      }),
    );
    jobs.push(() =>
      input.port.recall({
        query: "how the user wants replies: language, length, tone",
        limit: 3,
        maxDistance: 0.6,
      }),
    );
    jobs.push(() =>
      input.port.recall({
        query: "open commitments, deadlines, things promised",
        limit: 4,
        maxDistance: 0.65,
      }),
    );
  }
  for (const job of jobs) {
    try {
      add(await job());
    } catch (err) {
      console.warn("[memory] recall failed", err);
    }
  }
  const injected = [...seen.values()].sort((a, b) => a.distance - b.distance).slice(0, 10);
  const styleHints = injected
    .filter((m) => m.parsed?.type === "style")
    .map((m) => m.parsed?.text ?? m.text);
  return { injected, styleHints };
}

export function runTurn(input: TurnInput, ctx: TurnContext, useFallback = false) {
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
  const model = useFallback ? input.model.fallback : input.model.primary;
  if (!model) throw new Error("No fallback model configured.");
  return streamText({
    model,
    system,
    messages,
    tools: input.memoryEnabled ? createTools(input.port, input.channel) : undefined,
    stopWhen: stepCountIs(4),
  });
}

/**
 * Convenience for non-streaming channels: gather, run, collect text.
 *
 * Falls back to the second model once if the first fails outright. A
 * `fallbackModel` had been constructed and wired to nothing since the beginning,
 * so the submission's claim that one was configured was true of the config and
 * false of the behaviour.
 *
 * Only this path falls back, which covers Telegram, Discord, Slack and the CLI.
 * The web chat streams, and by the time a stream fails its first bytes may
 * already be on the page, so it reports the failure instead. That asymmetry is
 * deliberate and is the reason this lives here rather than in `runTurn`.
 */
export async function completeTurn(
  input: TurnInput,
): Promise<{ text: string; ctx: TurnContext; writes: number }> {
  const ctx = await gatherContext(input);
  const collect = async (useFallback: boolean) => {
    const result = runTurn(input, ctx, useFallback);
    const text = await result.text;
    const steps = await result.steps;
    const writes = steps
      .flatMap((s) => s.toolCalls)
      .filter((c) => c.toolName === "remember").length;
    return { text, ctx, writes };
  };
  try {
    return await collect(false);
  } catch (err) {
    if (!input.model.fallback) throw err;
    console.warn("[model] primary failed, trying the fallback", err);
    return await collect(true);
  }
}
