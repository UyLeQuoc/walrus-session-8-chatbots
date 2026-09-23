/**
 * One turn handler for every non-streaming channel. Adapters translate their
 * platform's message into `IncomingMessage` and post the reply; all memory,
 * command and model logic lives here so the three adapters cannot drift.
 */
import { completeTurn } from "@hippo/core";
import type { ModelMessage } from "ai";
import { model } from "./app-context.ts";
import { type CommandContext, handleCommand } from "./commands.ts";
import { startConnect, startDisconnect } from "./connect.ts";
import { logTurn, portFor, resolvePerson } from "./persons.ts";
import { checkRate, noteCommand } from "./ratelimit.ts";

const SESSION_GAP_MS = 6 * 60 * 60 * 1000;
const MAX_HISTORY = 20;

/**
 * The longest message hippo will take, about a thousand words.
 *
 * Refused rather than truncated. Truncating looks kinder and is worse: the
 * person believes the whole thing was read, and hippo may answer confidently
 * about a part it never saw. Telegram caps a single message at 4096 characters
 * anyway, so this only really binds on the web, where pasting a whole file is
 * easy to do by accident.
 */
export const MAX_INBOUND_CHARS = 4000;

export function tooLong(text: string): string | null {
  if (text.length <= MAX_INBOUND_CHARS) return null;
  return `That message is ${text.length.toLocaleString()} characters and I cap it at ${MAX_INBOUND_CHARS.toLocaleString()}, which is about a thousand words. Send the part you want me to read, or split it across a couple of messages. I would rather say this than answer as if I had read all of it.`;
}

/** Short-lived conversation buffer. Durable memory is on Walrus, not here. */
const history = new Map<string, { messages: ModelMessage[]; last: number }>();

export interface IncomingMessage {
  channel: string;
  /** Stable per-user id on that platform. */
  externalId: string;
  displayName?: string;
  text: string;
  /** Conversation key, usually chat or channel id plus user id. */
  threadKey: string;
}

export interface TurnReply {
  text: string;
  /** True when the reply came from a slash command rather than the model. */
  command: boolean;
}

export async function handleIncoming(msg: IncomingMessage): Promise<TurnReply> {
  const person = await resolvePerson(msg.channel, msg.externalId, msg.displayName);
  const handle = msg.displayName ?? msg.externalId;

  const ctx: CommandContext = {
    person,
    channel: msg.channel,
    connectUrl: async (kind) =>
      kind === "connect"
        ? (await startConnect(person, msg.channel, handle)).url
        : (await startDisconnect(person)).url,
  };

  // Before the rate limit, because refusing costs nothing and a long paste is a
  // mistake rather than abuse.
  const oversize = tooLong(msg.text);
  if (oversize) return { text: oversize, command: true };

  // Commands are rate limited too; see the note in routes/chat.ts.
  const gate = await checkRate(person.id);
  if (!gate.allowed) return { text: gate.message, command: true };

  try {
    const command = await handleCommand(ctx, msg.text);
    if (command) {
      await noteCommand(person.id, msg.channel);
      return { text: command.text, command: true };
    }
  } catch (err) {
    console.error(`[${msg.channel}] command failed`, err);
    return { text: "That command failed on my side. Try again in a moment.", command: true };
  }

  const now = Date.now();
  const prior = history.get(msg.threadKey);
  const sessionStart = !prior || now - prior.last > SESSION_GAP_MS;
  const messages: ModelMessage[] = sessionStart ? [] : [...(prior?.messages ?? [])];
  messages.push({ role: "user", content: msg.text });

  const port = await portFor(person, msg.channel);
  const {
    text,
    ctx: turnCtx,
    writes,
  } = await completeTurn({
    model,
    port,
    messages,
    channel: msg.channel,
    userHandle: handle,
    memoryEnabled: person.memoryEnabled,
    sessionStart,
  });

  messages.push({ role: "assistant", content: text });
  history.set(msg.threadKey, { messages: messages.slice(-MAX_HISTORY), last: now });
  await logTurn(person, msg.channel, turnCtx, writes, model.id).catch((e) =>
    console.error(`[${msg.channel}] logTurn`, e),
  );

  return { text: text || "…", command: false };
}
