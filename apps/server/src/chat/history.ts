/**
 * Durable chat transcripts.
 *
 * Walrus holds facts. This holds the words of a conversation, encrypted, so a
 * reload or a process restart can continue it. The model never sees the whole
 * table: `contextWindow` caps what is loaded.
 */
import { and, conversations, desc, eq, isNotNull, isNull, messages, sql } from "@hippo/db";
import { decryptSecret, encryptSecret } from "@hippo/memory";
import type { ModelMessage } from "ai";
import { db } from "../context.ts";
import { env } from "../env/load.ts";
import {
  contextWindow,
  conversationTitle,
  gapExpired,
  LIST_LIMIT,
  PAGE_SIZE,
  sessionStartFor,
  type TranscriptKind,
  type TranscriptLine,
  type TranscriptRole,
} from "./transcript.ts";

export interface ConversationSummary {
  id: string;
  title: string;
  updatedAt: string;
}

export interface TranscriptMessage {
  id: string;
  role: TranscriptRole;
  kind: TranscriptKind;
  text: string;
  seq: number;
}

export interface StoredAnswer {
  text: string;
  kind: TranscriptKind;
}

export type AppendResult =
  | { ok: true; sessionStart: boolean; alreadyAnswered: boolean; answer: string | null }
  | { ok: false; reason: "missing" };

function seal(text: string): string {
  return encryptSecret(text, env.KEY_ENCRYPTION_KEY);
}

function unseal(payload: string, id: string): string | null {
  try {
    return decryptSecret(payload, env.KEY_ENCRYPTION_KEY);
  } catch (err) {
    console.error("[history] decrypt failed", id, err instanceof Error ? err.name : "error");
    return null;
  }
}

function isUniqueViolation(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  if ("code" in err && err.code === "23505") return true;
  if ("cause" in err) return isUniqueViolation(err.cause);
  return false;
}

export async function claimWebConversation(
  personId: string,
  conversationId: string,
): Promise<boolean> {
  const [existing] = await db
    .select({
      personId: conversations.personId,
      channel: conversations.channel,
    })
    .from(conversations)
    .where(eq(conversations.id, conversationId))
    .limit(1);
  if (existing) return existing.personId === personId && existing.channel === "web";
  try {
    await db.insert(conversations).values({
      id: conversationId,
      personId,
      channel: "web",
      threadKey: conversationId,
    });
    return true;
  } catch (err) {
    if (!isUniqueViolation(err)) throw err;
  }
  const [raced] = await db
    .select({ personId: conversations.personId, channel: conversations.channel })
    .from(conversations)
    .where(eq(conversations.id, conversationId))
    .limit(1);
  return raced?.personId === personId && raced.channel === "web";
}

/**
 * The open thread for a channel, or a new one when the last line is older than
 * the session gap. A unique index on the open row makes two deliveries of the
 * same message share one thread instead of forking.
 */
export async function openChannelThread(input: {
  personId: string;
  channel: string;
  threadKey: string;
  now?: number;
}): Promise<string> {
  const now = input.now ?? Date.now();
  const open = await findOpen(input.personId, input.channel, input.threadKey);
  if (open && !gapExpired(open.updatedAt.getTime(), now)) return open.id;
  if (open) {
    await db
      .update(conversations)
      .set({ closedAt: new Date(now) })
      .where(eq(conversations.id, open.id));
  }
  try {
    const [created] = await db
      .insert(conversations)
      .values({
        personId: input.personId,
        channel: input.channel,
        threadKey: input.threadKey,
      })
      .returning({ id: conversations.id });
    if (!created) throw new Error("conversation insert returned no row");
    return created.id;
  } catch (err) {
    if (!isUniqueViolation(err)) throw err;
  }
  const again = await findOpen(input.personId, input.channel, input.threadKey);
  if (!again) throw new Error("conversation insert lost the race and left no row");
  return again.id;
}

async function findOpen(personId: string, channel: string, threadKey: string) {
  const [row] = await db
    .select({ id: conversations.id, updatedAt: conversations.updatedAt })
    .from(conversations)
    .where(
      and(
        eq(conversations.personId, personId),
        eq(conversations.channel, channel),
        eq(conversations.threadKey, threadKey),
        isNull(conversations.closedAt),
      ),
    )
    .limit(1);
  return row ?? null;
}

export async function storedAnswer(
  conversationId: string,
  clientId: string,
): Promise<StoredAnswer | null> {
  const [user] = await db
    .select({ seq: messages.seq })
    .from(messages)
    .where(and(eq(messages.conversationId, conversationId), eq(messages.clientId, clientId)))
    .limit(1);
  if (!user) return null;
  const [answer] = await db
    .select({
      id: messages.id,
      kind: messages.kind,
      bodyEnc: messages.bodyEnc,
    })
    .from(messages)
    .where(
      and(
        eq(messages.conversationId, conversationId),
        eq(messages.role, "assistant"),
        sql`${messages.seq} > ${user.seq}`,
      ),
    )
    .orderBy(messages.seq)
    .limit(1);
  if (!answer) return null;
  const text = unseal(answer.bodyEnc, answer.id);
  if (text === null) return null;
  return { text, kind: answer.kind };
}

export async function appendUser(input: {
  conversationId: string;
  personId: string;
  text: string;
  kind: TranscriptKind;
  clientId?: string;
  regenerate?: boolean;
  now?: number;
}): Promise<AppendResult> {
  const now = input.now ?? Date.now();
  try {
    return await db.transaction(async (tx) => {
      const [conv] = await tx
        .select()
        .from(conversations)
        .where(
          and(
            eq(conversations.id, input.conversationId),
            eq(conversations.personId, input.personId),
          ),
        )
        .limit(1)
        .for("update");
      if (!conv) return { ok: false, reason: "missing" };

      const existing = input.clientId
        ? await tx
            .select({ id: messages.id, seq: messages.seq })
            .from(messages)
            .where(and(eq(messages.conversationId, conv.id), eq(messages.clientId, input.clientId)))
            .limit(1)
        : [];
      const prior = existing[0];
      if (prior) {
        if (input.regenerate) {
          await tx
            .delete(messages)
            .where(and(eq(messages.conversationId, conv.id), sql`${messages.seq} > ${prior.seq}`));
        } else {
          const [answer] = await tx
            .select({ id: messages.id, bodyEnc: messages.bodyEnc })
            .from(messages)
            .where(
              and(
                eq(messages.conversationId, conv.id),
                eq(messages.role, "assistant"),
                sql`${messages.seq} > ${prior.seq}`,
              ),
            )
            .orderBy(messages.seq)
            .limit(1);
          if (answer) {
            const text = unseal(answer.bodyEnc, answer.id);
            if (text !== null) {
              return { ok: true, sessionStart: false, alreadyAnswered: true, answer: text };
            }
          }
        }
        const flags = await sessionFlags(tx, conv.id, prior.seq, now);
        return { ok: true, ...flags, alreadyAnswered: false, answer: null };
      }

      const seq = await nextSeq(tx, conv.id);
      await tx.insert(messages).values({
        conversationId: conv.id,
        seq,
        role: "user",
        kind: input.kind,
        bodyEnc: seal(input.text),
        clientId: input.clientId,
      });
      const flags = await sessionFlags(tx, conv.id, seq, now);
      await tx
        .update(conversations)
        .set({
          updatedAt: new Date(now),
          ...(conv.titleEnc ? {} : { titleEnc: seal(conversationTitle(input.text)) }),
        })
        .where(eq(conversations.id, conv.id));
      return { ok: true, ...flags, alreadyAnswered: false, answer: null };
    });
  } catch (err) {
    if (!isUniqueViolation(err) || !input.clientId) throw err;
    const prior = await storedAnswer(input.conversationId, input.clientId);
    if (!prior) return { ok: true, sessionStart: false, alreadyAnswered: false, answer: null };
    return { ok: true, sessionStart: false, alreadyAnswered: true, answer: prior.text };
  }
}

async function sessionFlags(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  conversationId: string,
  seq: number,
  now: number,
): Promise<{ sessionStart: boolean }> {
  const [counts] = await tx
    .select({
      n: sql<number>`count(*) filter (where ${messages.kind} = 'turn' and ${messages.seq} < ${seq})::int`,
    })
    .from(messages)
    .where(eq(messages.conversationId, conversationId));
  const [previous] = await tx
    .select({ createdAt: messages.createdAt })
    .from(messages)
    .where(and(eq(messages.conversationId, conversationId), sql`${messages.seq} < ${seq}`))
    .orderBy(desc(messages.seq))
    .limit(1);
  return {
    sessionStart: sessionStartFor(counts?.n ?? 0, previous?.createdAt.getTime() ?? null, now),
  };
}

async function nextSeq(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  conversationId: string,
): Promise<number> {
  const [row] = await tx
    .select({ seq: sql<number>`coalesce(max(${messages.seq}), 0)::int` })
    .from(messages)
    .where(eq(messages.conversationId, conversationId));
  return (row?.seq ?? 0) + 1;
}

export async function appendAssistant(
  conversationId: string,
  text: string,
  kind: TranscriptKind,
): Promise<void> {
  const body = text.trim() || "…";
  await db.transaction(async (tx) => {
    const [conv] = await tx
      .select({ id: conversations.id })
      .from(conversations)
      .where(eq(conversations.id, conversationId))
      .limit(1)
      .for("update");
    if (!conv) return;
    const [latest] = await tx
      .select({ role: messages.role })
      .from(messages)
      .where(eq(messages.conversationId, conversationId))
      .orderBy(desc(messages.seq))
      .limit(1);
    if (latest?.role === "assistant") return;
    const seq = await nextSeq(tx, conversationId);
    await tx.insert(messages).values({
      conversationId,
      seq,
      role: "assistant",
      kind,
      bodyEnc: seal(body),
    });
    await tx
      .update(conversations)
      .set({ updatedAt: new Date() })
      .where(eq(conversations.id, conversationId));
  });
}

export async function modelMessages(conversationId: string): Promise<ModelMessage[]> {
  const rows = await db
    .select({
      id: messages.id,
      role: messages.role,
      kind: messages.kind,
      bodyEnc: messages.bodyEnc,
      seq: messages.seq,
    })
    .from(messages)
    .where(and(eq(messages.conversationId, conversationId), eq(messages.kind, "turn")))
    .orderBy(desc(messages.seq))
    .limit(40);
  const lines: TranscriptLine[] = [];
  for (const row of rows.reverse()) {
    const text = unseal(row.bodyEnc, row.id);
    if (text === null) continue;
    lines.push({ role: row.role, kind: row.kind, text, seq: row.seq });
  }
  return contextWindow(lines).map((line) => ({ role: line.role, content: line.text }));
}

export async function listWebConversations(
  personId: string,
  cursor: Date | null,
  limit = LIST_LIMIT,
): Promise<{ conversations: ConversationSummary[]; nextCursor: string | null }> {
  const rows = await db
    .select({
      id: conversations.id,
      titleEnc: conversations.titleEnc,
      updatedAt: conversations.updatedAt,
    })
    .from(conversations)
    .where(
      and(
        eq(conversations.personId, personId),
        eq(conversations.channel, "web"),
        isNotNull(conversations.titleEnc),
        ...(cursor ? [sql`${conversations.updatedAt} < ${cursor}`] : []),
      ),
    )
    .orderBy(desc(conversations.updatedAt))
    .limit(limit);
  const listed: ConversationSummary[] = [];
  for (const row of rows) {
    if (!row.titleEnc) continue;
    const title = unseal(row.titleEnc, row.id);
    if (title === null) continue;
    listed.push({ id: row.id, title, updatedAt: row.updatedAt.toISOString() });
  }
  const last = listed.at(-1);
  return {
    conversations: listed,
    nextCursor: listed.length === limit && last ? last.updatedAt : null,
  };
}

export async function readWebMessages(
  personId: string,
  conversationId: string,
  before: number | null,
  limit = PAGE_SIZE,
): Promise<
  { ok: true; messages: TranscriptMessage[]; hasMore: boolean } | { ok: false; reason: "missing" }
> {
  const [conv] = await db
    .select({ id: conversations.id })
    .from(conversations)
    .where(
      and(
        eq(conversations.id, conversationId),
        eq(conversations.personId, personId),
        eq(conversations.channel, "web"),
      ),
    )
    .limit(1);
  if (!conv) return { ok: false, reason: "missing" };
  const rows = await db
    .select({
      id: messages.id,
      role: messages.role,
      kind: messages.kind,
      bodyEnc: messages.bodyEnc,
      seq: messages.seq,
      clientId: messages.clientId,
    })
    .from(messages)
    .where(
      and(
        eq(messages.conversationId, conversationId),
        ...(before === null ? [] : [sql`${messages.seq} < ${before}`]),
      ),
    )
    .orderBy(desc(messages.seq))
    .limit(limit + 1);
  const hasMore = rows.length > limit;
  const page = rows.slice(0, limit).reverse();
  const out: TranscriptMessage[] = [];
  for (const row of page) {
    const text = unseal(row.bodyEnc, row.id);
    if (text === null) continue;
    out.push({
      id: row.clientId ?? row.id,
      role: row.role,
      kind: row.kind,
      text,
      seq: row.seq,
    });
  }
  return { ok: true, messages: out, hasMore };
}

export async function deleteWebConversation(
  personId: string,
  conversationId: string,
): Promise<boolean> {
  const deleted = await db
    .delete(conversations)
    .where(
      and(
        eq(conversations.id, conversationId),
        eq(conversations.personId, personId),
        eq(conversations.channel, "web"),
      ),
    )
    .returning({ id: conversations.id });
  return deleted.length > 0;
}
