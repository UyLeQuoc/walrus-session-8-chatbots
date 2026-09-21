import { gatherContext, runTurn } from "@hippo/core";
import { desc, eq, memoryIndex } from "@hippo/db";
import { explorer } from "@hippo/memory";
import { convertToModelMessages, type UIMessage } from "ai";
import { Hono } from "hono";
import { getCookie, setCookie } from "hono/cookie";
import { db, model } from "../app-context.ts";
import { type CommandContext, handleCommand } from "../commands.ts";
import { startConnect, startDisconnect } from "../connect.ts";
import { env } from "../env.ts";
import { logTurn, type Person, portFor, resolvePerson } from "../persons.ts";
import { checkRate } from "../ratelimit.ts";

/** The web page and the CLI share this route; the CLI identifies itself by header. */
const CHANNEL = "web";
const COOKIE = "hippo_guest";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 90;

/** Anonymous cookie identity. Wallet sign-in attaches this person to an account in M3. */
async function webPerson(
  channel: string,
  cookie: string | undefined,
  setId: (id: string) => void,
): Promise<Person> {
  const id = cookie ?? crypto.randomUUID();
  if (!cookie) setId(id);
  return resolvePerson(channel, id, channel);
}

function lastUserText(messages: UIMessage[]): string {
  const last = [...messages].reverse().find((m) => m.role === "user");
  if (!last) return "";
  return last.parts
    .filter((p): p is { type: "text"; text: string } => p.type === "text")
    .map((p) => p.text)
    .join(" ")
    .trim();
}

export const chatRoutes = new Hono()
  .post("/api/chat", async (c) => {
    const body = (await c.req.json()) as { messages: UIMessage[]; sessionStart?: boolean };
    const channel = c.req.header("x-hippo-channel") === "cli" ? "cli" : CHANNEL;
    const person = await webPerson(channel, getCookie(c, COOKIE), (id) =>
      setCookie(c, COOKIE, id, {
        httpOnly: true,
        sameSite: "Lax",
        secure: env.WEB_BASE_URL.startsWith("https"),
        path: "/",
        maxAge: COOKIE_MAX_AGE,
      }),
    );

    const text = lastUserText(body.messages);
    const ctx: CommandContext = {
      person,
      channel,
      connectUrl: async (kind) =>
        kind === "connect"
          ? (await startConnect(person, channel, person.displayName ?? channel)).url
          : (await startDisconnect(person)).url,
    };
    const command = await handleCommand(ctx, text);
    if (command) {
      // Commands answer as a plain stream so the client renders them like any reply.
      return c.json({ command: true, text: command.text });
    }

    const gate = await checkRate(person.id);
    if (!gate.allowed) return c.json({ command: true, text: gate.message });

    const port = await portFor(person, channel);
    const messages = await convertToModelMessages(body.messages);
    const input = {
      model,
      port,
      messages,
      channel,
      userHandle: person.displayName ?? "web",
      memoryEnabled: person.memoryEnabled,
      sessionStart: body.sessionStart ?? body.messages.length <= 1,
    };
    const turnCtx = await gatherContext(input);
    const result = runTurn(input, turnCtx);
    return result.toUIMessageStreamResponse({
      onFinish: async ({ messages: out }) => {
        const writes = out.flatMap((m) => m.parts).filter((p) => p.type === "tool-remember").length;
        await logTurn(person, channel, turnCtx, writes, model.id).catch((e) =>
          console.error("[web] logTurn", e),
        );
      },
    });
  })

  /** The memories hippo wrote for this person, newest first, with links. */
  .get("/api/me/memories", async (c) => {
    const cookie = getCookie(c, COOKIE);
    if (!cookie) return c.json({ memories: [] });
    const person = await webPerson(CHANNEL, cookie, () => {});
    const rows = await db
      .select()
      .from(memoryIndex)
      .where(eq(memoryIndex.personId, person.id))
      .orderBy(desc(memoryIndex.createdAt))
      .limit(100);
    return c.json({
      memories: rows.map((r) => ({
        id: r.id,
        type: r.type,
        status: r.status,
        channel: r.channel,
        createdAt: r.createdAt,
        blobId: r.blobId,
        // The ciphertext is public; only this account can read it. That is the
        // point, so both links are offered.
        ciphertextUrl: r.blobId ? explorer.blob(r.blobId) : null,
        explorerUrl: r.blobId ? explorer.blobExplorer(r.blobId) : null,
      })),
    });
  })

  /** Everything the /me page shows. */
  .get("/api/me", async (c) => {
    const cookie = getCookie(c, COOKIE);
    if (!cookie) return c.json({ mode: "anonymous" as const });
    const person = await webPerson(CHANNEL, cookie, () => {});
    const port = await portFor(person, CHANNEL);
    return c.json({
      mode: person.mode,
      personId: person.id,
      memoryEnabled: person.memoryEnabled,
      accountId: person.accountId,
      walletAddress: person.walletAddress,
      namespace: port.scope.namespace,
    });
  });
