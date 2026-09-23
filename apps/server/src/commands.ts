/**
 * Slash commands, defined once and reused by every channel adapter.
 * An adapter passes the raw text; if it starts with a known command the
 * handler runs and the adapter posts the reply verbatim instead of calling the
 * model.
 */
import { and, desc, eq, memoryIndex, people, sql, turnLog } from "@hippo/db";
import { explorer, MEMORY_TYPES, type MemoryScope, RelayerExtras } from "@hippo/memory";
import { db } from "./app-context.ts";
import { HELP, PRIVACY, welcome } from "./copy.ts";
import { env } from "./env.ts";
import { createLinkCode, redeemLinkCode } from "./link.ts";
import { type Person, portFor } from "./persons.ts";

export interface CommandContext {
  person: Person;
  channel: string;
  /** Rendered link the user can open to run the wallet flow. */
  connectUrl: (kind: "connect" | "disconnect") => Promise<string>;
}

export interface CommandResult {
  text: string;
}

/**
 * Metadata routes must be signed with the *same* credential the memory port
 * uses, not the operator key carrying someone else's account id. A mismatched
 * `x-account-id` is silently repaired to whatever the signing key resolves to
 * (see docs/issues/05), so signing with the operator key while naming a user's
 * account sends the call to the operator's account instead. `/memory forget`
 * would then report success having deleted nothing of the user's.
 */
function extrasFor(scope: MemoryScope): RelayerExtras {
  return new RelayerExtras({
    key: scope.key,
    accountId: scope.accountId,
    serverUrl: scope.serverUrl,
  });
}

async function whoami(ctx: CommandContext): Promise<CommandResult> {
  const { person } = ctx;
  const port = await portFor(person, ctx.channel);
  const lines = [
    person.mode === "owned"
      ? "Mode: owned. This memory is in your own Walrus Memory account."
      : "Mode: guest. Your memory sits under hippo's account until you run /connect.",
    `Namespace: ${port.scope.namespace}`,
  ];
  if (person.accountId) {
    lines.push(`Account: ${person.accountId}`, explorer.object(person.accountId));
  }
  if (person.walletAddress) lines.push(`Wallet: ${person.walletAddress}`);

  const [{ count } = { count: 0 }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(memoryIndex)
    .where(eq(memoryIndex.personId, person.id));
  lines.push(`Memories written by hippo: ${count}`);

  try {
    const stats = await extrasFor(port.scope).stats(port.scope.namespace);
    lines.push(
      `Namespace total on the relayer: ${stats.memory_count} (${stats.storage_bytes} bytes)`,
    );
  } catch {
    // Metadata routes are flaky; the local count above is the reliable one.
  }
  return { text: lines.join("\n") };
}

async function listMemories(ctx: CommandContext): Promise<CommandResult> {
  const rows = await db
    .select()
    .from(memoryIndex)
    .where(eq(memoryIndex.personId, ctx.person.id))
    .orderBy(desc(memoryIndex.createdAt))
    .limit(30);
  if (!rows.length) {
    return { text: "I have not written anything about you yet. Tell me something worth keeping." };
  }
  const byType = new Map<string, number>();
  for (const r of rows) byType.set(r.type, (byType.get(r.type) ?? 0) + 1);
  const summary = [...byType.entries()].map(([t, n]) => `${t} ${n}`).join(", ");
  const recent = rows
    .slice(0, 10)
    .map((r) => {
      const where = r.blobId ? `blob ${r.blobId.slice(0, 10)}…` : "writing to Walrus…";
      return `• [${r.type}] ${r.createdAt.toISOString().slice(0, 10)} · ${where}`;
    })
    .join("\n");
  return {
    text: `${rows.length} memories (${summary}).\n\n${recent}\n\nUse /memory search <question> to read them back.`,
  };
}

async function searchMemories(ctx: CommandContext, query: string): Promise<CommandResult> {
  if (!query.trim()) return { text: "Usage: /memory search <question>" };
  const port = await portFor(ctx.person, ctx.channel);
  const hits = await port.recall({ query, limit: 8, maxDistance: 0.9 });
  if (!hits.length) return { text: `Nothing close to "${query}".` };
  const lines = hits.map((h) => {
    const relevance = (1 - h.distance).toFixed(2);
    return `• ${h.parsed?.text ?? h.text}\n  relevance ${relevance} · blob ${h.blob_id.slice(0, 10)}…`;
  });
  return { text: lines.join("\n") };
}

async function setMemory(ctx: CommandContext, on: boolean): Promise<CommandResult> {
  await db.update(people).set({ memoryEnabled: on }).where(eq(people.id, ctx.person.id));
  return {
    text: on
      ? "Memory on. I will remember what matters from now on."
      : "Memory off. I will not read or write memory until you run /memory on. Nothing already stored is deleted.",
  };
}

async function forget(ctx: CommandContext): Promise<CommandResult> {
  const port = await portFor(ctx.person, ctx.channel);
  try {
    const res = await extrasFor(port.scope).forget(port.scope.namespace);
    await db.delete(memoryIndex).where(eq(memoryIndex.personId, ctx.person.id));
    return {
      text: `Removed ${res.deleted} memories from the search index, so I can no longer recall any of them.\n\nBeing straight with you about the limit: the encrypted blobs stay on Walrus until their storage epochs run out, and there is currently no way to delete them earlier. Nobody can read them without your account's keys, and I can no longer find them, but they are not gone.`,
    };
  } catch (e) {
    return { text: `Could not reach the relayer: ${e instanceof Error ? e.message : String(e)}` };
  }
}

async function link(ctx: CommandContext, arg: string): Promise<CommandResult> {
  if (!arg.trim()) {
    const { code, expiresInMinutes } = await createLinkCode(ctx.person);
    return {
      text: `Your link code is ${code}.\n\nOpen hippo on another channel (the web chat, Telegram, Discord, Slack or the CLI) and send:\n/link ${code}\n\nBoth conversations then share one memory. The code works once and expires in ${expiresInMinutes} minutes.\n\nKeep it to yourself. Anyone who redeems it joins your memory.`,
    };
  }
  const result = await redeemLinkCode(ctx.person, arg);
  if (result.ok) {
    return {
      text: "Linked. This channel and the one that gave you the code now share the same memory.",
    };
  }
  switch (result.reason) {
    case "self":
      return {
        text: "That code came from this same conversation. Run /link on the other channel instead.",
      };
    case "expired":
      return {
        text: "That code has expired or was already used. Run /link on the other channel for a fresh one.",
      };
    default:
      return {
        text: "That does not look like a link code. Run /link on the other channel to get one.",
      };
  }
}

async function proof(ctx: CommandContext): Promise<CommandResult> {
  const [last] = await db
    .select()
    .from(turnLog)
    .where(and(eq(turnLog.personId, ctx.person.id), eq(turnLog.channel, ctx.channel)))
    .orderBy(desc(turnLog.createdAt))
    .limit(1);
  const injected = last?.injected ?? [];
  if (!injected.length) return { text: "My last answer used no stored memory." };
  const lines = injected.map(
    (m) =>
      `• ${m.type ?? "memory"} · relevance ${(1 - m.distance).toFixed(2)}\n  ${explorer.blobExplorer(m.blobId)}`,
  );
  return { text: `My last answer used ${injected.length} memories:\n${lines.join("\n")}` };
}

/** Returns null when the text is not a command, so the adapter runs the model. */
export async function handleCommand(
  ctx: CommandContext,
  text: string,
): Promise<CommandResult | null> {
  const trimmed = text.trim();
  if (!trimmed.startsWith("/")) return null;
  const [rawCmd = "", ...rest] = trimmed.slice(1).split(/\s+/);
  const cmd = rawCmd.toLowerCase();
  const arg = rest.join(" ");

  switch (cmd) {
    case "start":
      return { text: welcome(env.SURVEY_URL) };
    case "help":
      return { text: HELP };
    case "privacy":
      return { text: PRIVACY };
    case "whoami":
      return whoami(ctx);
    case "link":
      return link(ctx, arg);
    case "proof":
      return proof(ctx);
    case "connect":
      return ctx.person.mode === "owned"
        ? {
            text: "You already own this memory. /whoami shows the account, /disconnect revokes me.",
          }
        : {
            text: `Own your memory in your own Walrus Memory account:\n${await ctx.connectUrl("connect")}\n\nYou sign one transaction, gas is normally sponsored, and you can revoke me at any time. Everything I already know stays readable: it sits in my account and cannot be moved, so I read both from then on. New memories go only to yours.`,
          };
    case "disconnect":
      return ctx.person.mode === "owned"
        ? {
            text: `Revoke my access on-chain:\n${await ctx.connectUrl("disconnect")}\n\nAfter it lands I cannot read or write anything in your account, within about a minute. What you told me before you connected is the exception: that lives in my account, not yours, and I can still read it. /memory forget makes it unrecallable.`,
          }
        : { text: "Nothing to revoke: you are in guest mode." };
    case "memory": {
      const [sub = "", ...subRest] = arg.split(/\s+/);
      switch (sub.toLowerCase()) {
        case "":
          return listMemories(ctx);
        case "search":
          return searchMemories(ctx, subRest.join(" "));
        case "on":
          return setMemory(ctx, true);
        case "off":
          return setMemory(ctx, false);
        case "forget":
          return forget(ctx);
        default:
          return searchMemories(ctx, arg);
      }
    }
    default:
      return { text: `Unknown command. ${HELP}` };
  }
}

export const MEMORY_TYPE_LIST = MEMORY_TYPES.join(", ");
