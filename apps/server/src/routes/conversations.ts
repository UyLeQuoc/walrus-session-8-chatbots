import { Hono } from "hono";
import { z } from "zod";
import { deleteWebConversation, listWebConversations, readWebMessages } from "../chat/history.ts";
import { LIST_LIMIT, PAGE_SIZE } from "../chat/transcript.ts";
import { mePerson } from "./chat.ts";

const listQuery = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(LIST_LIMIT).optional(),
});

const pageQuery = z.object({
  before: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().min(1).max(PAGE_SIZE).optional(),
});

const idParam = z.uuid();

export const conversationRoutes = new Hono()
  .get("/api/conversations", async (c) => {
    const person = await mePerson(c);
    if (!person) return c.json({ conversations: [], nextCursor: null });
    const parsed = listQuery.safeParse({
      cursor: c.req.query("cursor"),
      limit: c.req.query("limit"),
    });
    if (!parsed.success) return c.json({ error: "That page of chats is not valid." }, 400);
    const cursor = parsed.data.cursor ? new Date(parsed.data.cursor) : null;
    if (cursor && Number.isNaN(cursor.getTime())) {
      return c.json({ error: "That page of chats is not valid." }, 400);
    }
    const page = await listWebConversations(person.id, cursor, parsed.data.limit ?? LIST_LIMIT);
    return c.json(page);
  })
  .get("/api/conversations/:id/messages", async (c) => {
    const person = await mePerson(c);
    const id = idParam.safeParse(c.req.param("id"));
    if (!person || !id.success) return c.json({ error: "That chat is gone." }, 404);
    const parsed = pageQuery.safeParse({
      before: c.req.query("before"),
      limit: c.req.query("limit"),
    });
    if (!parsed.success) return c.json({ error: "That page of messages is not valid." }, 400);
    const page = await readWebMessages(
      person.id,
      id.data,
      parsed.data.before ?? null,
      parsed.data.limit ?? PAGE_SIZE,
    );
    if (!page.ok) return c.json({ error: "That chat is gone." }, 404);
    return c.json({ messages: page.messages, hasMore: page.hasMore });
  })
  .delete("/api/conversations/:id", async (c) => {
    const person = await mePerson(c);
    const id = idParam.safeParse(c.req.param("id"));
    if (!person || !id.success) return c.json({ error: "That chat is gone." }, 404);
    const deleted = await deleteWebConversation(person.id, id.data);
    if (!deleted) return c.json({ error: "That chat is gone." }, 404);
    return c.json({ deleted: true });
  });
