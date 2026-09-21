import { gatherContext, runTurn } from "@hippo/core";
import { convertToModelMessages, type UIMessage } from "ai";
import { Hono } from "hono";
import { getCookie, setCookie } from "hono/cookie";
import { model } from "../app-context.ts";
import { env } from "../env.ts";
import { logTurn, portFor, resolvePerson } from "../persons.ts";

const CHANNEL = "web";
const COOKIE = "hippo_guest";

/** Milestone 0: anonymous guest identity via cookie. Wallet / zkLogin sign-in lands in Milestone 1. */
async function guestPerson(cookie: string | undefined, setId: (id: string) => void) {
  const id = cookie ?? crypto.randomUUID();
  if (!cookie) setId(id);
  return resolvePerson(CHANNEL, id, "web-guest");
}

export const chatRoutes = new Hono().post("/api/chat", async (c) => {
  const body = (await c.req.json()) as { messages: UIMessage[]; sessionStart?: boolean };
  const person = await guestPerson(getCookie(c, COOKIE), (id) =>
    setCookie(c, COOKIE, id, {
      httpOnly: true,
      sameSite: "Lax",
      secure: env.WEB_BASE_URL.startsWith("https"),
      path: "/",
      maxAge: 60 * 60 * 24 * 90,
    }),
  );
  const port = await portFor(person, CHANNEL);
  const messages = await convertToModelMessages(body.messages);
  const input = {
    model,
    port,
    messages,
    channel: CHANNEL,
    userHandle: person.displayName ?? "web",
    memoryEnabled: person.memoryEnabled,
    sessionStart: body.sessionStart ?? body.messages.length <= 1,
  };
  const ctx = await gatherContext(input);
  const result = runTurn(input, ctx);
  return result.toUIMessageStreamResponse({
    onFinish: async ({ messages: out }) => {
      const writes = out.flatMap((m) => m.parts).filter((p) => p.type === "tool-remember").length;
      await logTurn(person, CHANNEL, ctx, writes, model.id).catch((e) =>
        console.error("[web] logTurn", e),
      );
    },
  });
});
