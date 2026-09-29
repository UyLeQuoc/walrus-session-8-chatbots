import { and, conversations, eq, memoryIndex, messages, sql } from "@hippo/db";
import { db } from "../context.ts";
import { ownMemoryOf, type Person } from "../identity/persons.ts";
import {
  type ChatMemory,
  memoriesInWindow,
  WINDOW_PAD_MS,
  withRecalledText,
} from "./chat-window.ts";

function clock(value: Date | string | null | undefined): Date | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export type ChatMemoryResult =
  | { ok: true; limited: false; memories: ChatMemory[] }
  | { ok: true; limited: true; message: string; memories: ChatMemory[] }
  | { ok: false; reason: "missing" };

export async function memoriesForChat(
  person: Person,
  conversationId: string,
): Promise<ChatMemoryResult> {
  const [bounds] = await db
    .select({
      start: sql<Date | null>`min(${messages.createdAt})`,
      end: sql<Date | null>`max(${messages.createdAt})`,
    })
    .from(messages)
    .innerJoin(conversations, eq(conversations.id, messages.conversationId))
    .where(
      and(
        eq(conversations.id, conversationId),
        eq(conversations.personId, person.id),
        eq(conversations.channel, "web"),
      ),
    );
  const start = clock(bounds?.start);
  const end = clock(bounds?.end);
  if (!start || !end) {
    const [conv] = await db
      .select({ id: conversations.id })
      .from(conversations)
      .where(
        and(
          eq(conversations.id, conversationId),
          eq(conversations.personId, person.id),
          eq(conversations.channel, "web"),
        ),
      )
      .limit(1);
    if (!conv) return { ok: false, reason: "missing" };
    return { ok: true, limited: false, memories: [] };
  }
  const from = new Date(start.getTime() - WINDOW_PAD_MS);
  const to = new Date(end.getTime() + WINDOW_PAD_MS);
  const rows = await db
    .select({
      id: memoryIndex.id,
      type: memoryIndex.type,
      status: memoryIndex.status,
      blobId: memoryIndex.blobId,
      hiddenAt: memoryIndex.hiddenAt,
      createdAt: memoryIndex.createdAt,
    })
    .from(memoryIndex)
    .where(
      and(
        ownMemoryOf(person.id),
        eq(memoryIndex.channel, "web"),
        // postgres.js rejects a Date bound through a raw fragment.
        sql`${memoryIndex.createdAt} >= ${from.toISOString()}`,
        sql`${memoryIndex.createdAt} <= ${to.toISOString()}`,
      ),
    );
  const indexed = memoriesInWindow(
    rows.map((row) => ({
      id: row.id,
      type: row.type,
      status: row.status,
      blobId: row.blobId,
      hidden: Boolean(row.hiddenAt),
      createdAt: row.createdAt,
    })),
    start,
    end,
  );
  return { ok: true, limited: false, memories: withRecalledText(indexed, null) };
}
