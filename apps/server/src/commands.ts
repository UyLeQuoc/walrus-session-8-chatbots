/**
 * Slash commands, defined once and reused by every channel adapter.
 * An adapter passes the raw text; if it starts with a known command the
 * handler runs and the adapter posts the reply verbatim instead of calling the
 * model.
 */
import { and, desc, eq, memoryIndex, people, sql, turnLog } from "@hippo/db";
import { explorer, MEMORY_TYPES, RelayerExtras } from "@hippo/memory";
import { db, operator } from "./app-context.ts";
import { env } from "./env.ts";
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

const HELP = `hippo remembers what you tell it, and the memory belongs to you.

/memory            what I remember about you
/memory search <q> search your memory
/memory off | on   pause or resume remembering
/memory forget     make everything unrecallable
/whoami            your account and where the memory lives
/proof             the memories behind my last answer
/connect           own your memory in your own Walrus account
/disconnect        revoke my access on-chain
/help              this message`;

function extrasFor(person: Person): RelayerExtras {
  if (person.mode === "owned" && person.accountId) {
    // Owned mode reads through the person's own account; the delegate key is
    // resolved by portFor, so metadata routes use the operator only in guest mode.
    return new RelayerExtras({ ...operator, accountId: person.accountId });
  }
  return new RelayerExtras(operator);
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
    const stats = await extrasFor(person).stats(port.scope.namespace);
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
    .map(
      (r) =>
        `• [${r.type}] ${r.createdAt.toISOString().slice(0, 10)} · blob ${r.blobId.slice(0, 10)}…`,
    )
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
    const res = await extrasFor(ctx.person).forget(port.scope.namespace);
    await db.delete(memoryIndex).where(eq(memoryIndex.personId, ctx.person.id));
    return {
      text: `Removed ${res.deleted} memories from the search index, so I can no longer recall them.\n\nThe encrypted blobs stay on Walrus until they expire. Permanent deletion is signed by your own wallet and is available in owned mode at ${env.WEB_BASE_URL}/me`,
    };
  } catch (e) {
    return { text: `Could not reach the relayer: ${e instanceof Error ? e.message : String(e)}` };
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
    case "help":
    case "start":
      return { text: HELP };
    case "whoami":
      return whoami(ctx);
    case "proof":
      return proof(ctx);
    case "connect":
      return ctx.person.mode === "owned"
        ? {
            text: "You already own this memory. /whoami shows the account, /disconnect revokes me.",
          }
        : {
            text: `Own your memory in your own Walrus Memory account:\n${await ctx.connectUrl("connect")}\n\nYou sign one transaction, gas is sponsored, and you can revoke me at any time.`,
          };
    case "disconnect":
      return ctx.person.mode === "owned"
        ? {
            text: `Revoke my access on-chain:\n${await ctx.connectUrl("disconnect")}\n\nAfter that I cannot read or write your memory until you grant it again.`,
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
