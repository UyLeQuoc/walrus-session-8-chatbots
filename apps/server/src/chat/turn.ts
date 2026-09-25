/**
 * One turn handler for every non-streaming channel. Adapters translate their
 * platform's message into `IncomingMessage` and post the reply; all memory,
 * command and model logic lives here so the three adapters cannot drift.
 */
import { completeTurn } from "@hippo/core";
import type { ModelMessage } from "ai";
import { startConnect, startDisconnect } from "../connect/tokens.ts";
import { model } from "../context.ts";
import { describeFailure } from "../copy.ts";
import { hasCorrections, logTurn, portFor, resolvePerson } from "../identity/persons.ts";
import { type CommandContext, type CommandResult, handleCommand } from "./commands.ts";
import { tooLong } from "./limits.ts";
import { checkRate, noteCommand } from "./ratelimit.ts";

const SESSION_GAP_MS = 6 * 60 * 60 * 1000;
const MAX_HISTORY = 20;

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
  /** Attachments from a command, for adapters that can send them. */
  files?: CommandResult["files"];
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
      return { text: command.text, command: true, files: command.files };
    }
  } catch (err) {
    console.error(`[${msg.channel}] command failed`, err);
    // Deliberately not describeFailure: a command never reaches the model and
    // never writes a memory, so its reassurances would be about the wrong thing.
    return { text: "That command failed on my side. Try again in a moment.", command: true };
  }

  const now = Date.now();
  const prior = history.get(msg.threadKey);
  const sessionStart = !prior || now - prior.last > SESSION_GAP_MS;
  const messages: ModelMessage[] = sessionStart ? [] : [...(prior?.messages ?? [])];
  messages.push({ role: "user", content: msg.text });

  const port = await portFor(person, msg.channel);
  let text: string;
  let turnCtx: Awaited<ReturnType<typeof completeTurn>>["ctx"];
  let writes: number;
  try {
    ({
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
      hasCorrections: await hasCorrections(person.id),
    }));
  } catch (err) {
    // The adapter would otherwise say the same sentence for a dead provider and
    // an exhausted budget. Recall failures never reach here; they are swallowed
    // per query in gatherContext so memory being down costs context, not the
    // answer.
    console.error(`[${msg.channel}] turn failed`, err);
    return { text: describeFailure(err), command: true };
  }

  messages.push({ role: "assistant", content: text });
  history.set(msg.threadKey, { messages: messages.slice(-MAX_HISTORY), last: now });
  await logTurn(person, msg.channel, turnCtx, writes, model.id).catch((e) =>
    console.error(`[${msg.channel}] logTurn`, e),
  );

  return { text: text || "…", command: false };
}
