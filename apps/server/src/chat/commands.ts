/**
 * Slash commands, defined once and reused by every channel adapter.
 * An adapter passes the raw text; if it starts with a known command the
 * handler runs and the adapter posts the reply verbatim instead of calling the
 * model.
 */
import { and, desc, eq, memoryIndex, people, sql, turnLog } from "@hippo/db";
import { explorer, guestScope, MEMORY_TYPES, type MemoryScope, RelayerExtras } from "@hippo/memory";
import { db, operator } from "../context.ts";
import { HELP, PRIVACY, welcome } from "../copy.ts";
import { env } from "../env/load.ts";
import { createLinkCode, redeemLinkCode } from "../identity/link.ts";
import {
  inheritedGuestScopes,
  ownMemoryOf,
  type Person,
  portFor,
  setHidden,
  teamPortFor,
} from "../identity/persons.ts";
import { createTeam, currentTeam, inviteToTeam, joinTeam, leaveTeam } from "../identity/teams.ts";
import { asDownload, type ExportDownload, exportFor } from "../memory/export-person.ts";

export interface CommandContext {
  person: Person;
  channel: string;
  /** Rendered link the user can open to run the wallet flow. */
  connectUrl: (kind: "connect" | "disconnect") => Promise<string>;
}

export interface CommandResult {
  text: string;
  /** Sent as attachments where the channel can (Telegram, the CLI). */
  files?: ExportDownload[];
}

/** Channels whose adapter delivers `files`. The rest are told where to go. */
const ATTACHES = new Set(["telegram", "discord", "cli"]);

/**
 * `/export`: the person's memory as files they keep.
 *
 * Built fresh and handed over, never stored, since memory text never goes into
 * Postgres. The web chat points at the button on /me, which downloads the same
 * thing; channels that cannot carry a file say so rather than pretending.
 */
async function exportMemories(ctx: CommandContext): Promise<CommandResult> {
  const file = await exportFor(ctx.person, ctx.channel);
  const c = file.coverage;
  if (!c.memories) {
    return { text: "Nothing to export yet: I have not written anything about you." };
  }
  const summary = `${c.memories} memories. Text recovered for ${c.withText} of them, and ${c.verified} match the fingerprint I recorded when I wrote them.`;
  const caveat =
    "The file lists every blob on Walrus. It cannot let you decrypt them without me yet; it says why inside.";
  if (ATTACHES.has(ctx.channel)) {
    return {
      text: `Your memory, as files you keep. ${summary}

The .md is for reading, the .json is the complete record. ${caveat}`,
      files: [asDownload(file, "md"), asDownload(file, "json")],
    };
  }
  const where =
    ctx.channel === "web"
      ? `Download it from the Export button on ${env.WEB_BASE_URL}/me.`
      : `I cannot send files on this channel yet. /link it to the web chat, then use Export on ${env.WEB_BASE_URL}/me.`;
  return {
    text: `${summary}

${where} ${caveat}`,
  };
}

/**
 * Shared memory for a few people, with the awkward parts said out loud.
 *
 * Two of these matter more than the feature: the team does not own its memory,
 * and leaving does not take back what you put in. Both are true of every other
 * shared-memory product too; the difference is whether they are in the help
 * text or discovered later.
 */
async function team(ctx: CommandContext, arg: string): Promise<CommandResult> {
  const [sub = "", ...rest] = arg.split(/\s+/);
  const value = rest.join(" ");
  const mine = await currentTeam(ctx.person.id);

  switch (sub.toLowerCase()) {
    case "": {
      if (!mine) {
        return {
          text: "You are not in a team.\n\n/team new <name>  start one\n/team join <code>  join one somebody else started\n\nA team shares memory that anyone in it can recall. What you say normally stays yours; only /team remember puts something in the shared pile.",
        };
      }
      return {
        text: `Team: ${mine.name} (${mine.memberCount} ${mine.memberCount === 1 ? "member" : "members"}).\n\nEveryone in it recalls the shared memory. Your own memory is still yours and is not shared.\n\n/team remember <fact>  add to the shared memory\n/team invite           a code for somebody else\n/team leave            stop reading and writing it\n\nThe shared memory lives in my account, not yours, so nobody in the team owns it yet. /privacy has the detail.`,
      };
    }

    case "new": {
      const outcome = await createTeam(ctx.person, value);
      if (!outcome.ok) {
        return {
          text:
            outcome.reason === "bad-name"
              ? "Give it a name: /team new Platform"
              : "You are already in a team. /team leave first.",
        };
      }
      return {
        text: `Started "${outcome.team.name}".\n\nShare this code, it works once and lasts ${outcome.expiresInMinutes} minutes:\n\n${outcome.code}\n\nThey run /team join ${outcome.code} on any channel. Add facts with /team remember <fact>; ordinary conversation stays private to you.`,
      };
    }

    case "invite": {
      if (!mine) return { text: "You are not in a team. /team new <name> starts one." };
      const invite = await inviteToTeam(ctx.person, mine.teamId);
      return {
        text: `${invite.code}\n\nWorks once, for ${invite.expiresInMinutes} minutes. They run /team join ${invite.code}.`,
      };
    }

    case "join": {
      const outcome = await joinTeam(ctx.person, value);
      if (!outcome.ok) {
        const why: Record<string, string> = {
          unknown: "That is not a code. They look like ABC234.",
          expired: "That code has been used or has expired. Ask for another.",
          "already-in-a-team": "You are already in a team. /team leave first.",
          "already-member": "You are already in that team.",
          full: "That team is full.",
        };
        return { text: why[outcome.reason] ?? (why.unknown as string) };
      }
      return {
        text: `Joined "${outcome.team.name}". You will now recall what the team has put in, and /team remember adds to it.\n\nYour own memory stays yours and is not shared.`,
      };
    }

    case "remember": {
      if (!mine) return { text: "You are not in a team. /team new <name> starts one." };
      if (value.trim().length < 3) return { text: "Usage: /team remember <fact>" };
      const port = await teamPortFor(ctx.person, ctx.channel, mine.teamId);
      const result = await port.remember({ type: "decision", text: value, channel: ctx.channel });
      if (!result.saved) return { text: `"${mine.name}" already knows that.` };
      const redacted = result.redacted.length
        ? ` I stripped ${result.redacted.join(", ")} out of it first.`
        : "";
      return {
        text: `Added to "${mine.name}". Everyone in the team can recall it from now on.${redacted}`,
      };
    }

    case "leave": {
      const left = await leaveTeam(ctx.person.id);
      if (!left) return { text: "You are not in a team." };
      return {
        text: `Left "${left.name}". I will not read or write its memory for you any more.\n\nWhat you already put in stays: a memory on Walrus cannot be deleted, so the team keeps it. Only add things to a team you are willing to leave behind.`,
      };
    }

    default:
      return {
        text: "Try /team, /team new <name>, /team join <code>, /team invite, /team remember <fact>, or /team leave.",
      };
  }
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
    .where(ownMemoryOf(person.id));
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
    .where(ownMemoryOf(ctx.person.id))
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
      const hidden = r.hiddenAt ? " · hidden" : "";
      return `• [${r.type}] ${r.createdAt.toISOString().slice(0, 10)} · ${where}${hidden}`;
    })
    .join("\n");
  return {
    text: `${rows.length} memories (${summary}).\n\n${recent}\n\nUse /memory search <question> to read them back, and /memory forget <blob> to stop me using one.`,
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

const FORGET_USAGE =
  "/memory forget <blob>  stop me using one memory: the blob shown by /memory or /memory search\n/memory forget all     make everything unrecallable\n\nNothing is deleted from Walrus either way; that is not possible yet.";

/**
 * Stop using one memory, or start again.
 *
 * Walrus cannot delete or edit a blob, and the relayer can only forget a whole
 * namespace, so this is hippo's own filter: the memory stops being recalled
 * and stops counting as a duplicate. What it cannot do is said every time.
 */
async function hideOne(ctx: CommandContext, target: string, hide: boolean): Promise<CommandResult> {
  const verb = hide ? "forget" : "unhide";
  if (!target.trim()) return { text: `Usage: /memory ${verb} <blob>, as /memory shows it.` };
  const out = await setHidden(ctx.person.id, target, hide);
  switch (out.kind) {
    case "too-short":
      return { text: "Give at least the first six characters of the blob, as /memory shows it." };
    case "none":
      return { text: `None of your memories has a blob starting "${target.trim()}".` };
    case "ambiguous":
      return { text: `That matches ${out.count} of your memories. Give more of the blob.` };
    case "done": {
      const short = `${out.blobId.slice(0, 10)}…`;
      if (!hide) return { text: `I will use that ${out.type} memory again (blob ${short}).` };
      const elsewhere =
        ctx.person.mode === "owned"
          ? " Other apps signed in to your account can still recall it."
          : "";
      return {
        text: `I will not use that ${out.type} memory again (blob ${short}).\n\nIt is still on Walrus, encrypted, because nothing there can be deleted yet.${elsewhere} /memory unhide ${out.blobId.slice(0, 10)} brings it back.`,
      };
    }
  }
}

async function forget(ctx: CommandContext): Promise<CommandResult> {
  const port = await portFor(ctx.person, ctx.channel);
  /**
   * Every namespace that is this person's own. Once they own an account, what
   * they said as a guest is still in hippo's account and still read alongside
   * (see `alsoRead` in persons.ts), so forgetting only the owned namespace left
   * it recallable — while /privacy and /disconnect both promised otherwise.
   * Team memory is not theirs to forget and is left alone.
   */
  const scopes = [port.scope];
  if (ctx.person.mode === "owned") scopes.push(guestScope(operator, ctx.person.id));
  // And any guest namespace a merge left behind, which recall also reads.
  scopes.push(...(await inheritedGuestScopes(ctx.person)));
  try {
    let deleted = 0;
    for (const scope of scopes) deleted += (await extrasFor(scope).forget(scope.namespace)).deleted;
    await db.delete(memoryIndex).where(ownMemoryOf(ctx.person.id));
    return {
      text: `Removed ${deleted} memories from the search index, so I can no longer recall any of them.\n\nBeing straight with you about the limit: the encrypted blobs stay on Walrus until their storage epochs run out, and there is currently no way to delete them earlier. Nobody can read them without your account's keys, and I can no longer find them, but they are not gone.`,
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
    case "team":
      return team(ctx, arg);
    case "whoami":
      return whoami(ctx);
    case "link":
      return link(ctx, arg);
    case "proof":
      return proof(ctx);
    case "export":
      return exportMemories(ctx);
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
            text: `Revoke my access on-chain:\n${await ctx.connectUrl("disconnect")}\n\nAfter it lands I cannot read or write anything in your account, within about a minute. What you told me before you connected is the exception: that lives in my account, not yours, and I can still read it. /memory forget all makes it unrecallable.`,
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
        case "forget": {
          const target = subRest.join(" ").trim();
          if (!target) return { text: FORGET_USAGE };
          return target.toLowerCase() === "all" ? forget(ctx) : hideOne(ctx, target, true);
        }
        case "unhide":
          return hideOne(ctx, subRest.join(" "), false);
        default:
          return searchMemories(ctx, arg);
      }
    }
    default:
      return { text: `Unknown command. ${HELP}` };
  }
}

export const MEMORY_TYPE_LIST = MEMORY_TYPES.join(", ");
