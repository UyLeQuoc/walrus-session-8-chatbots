import { gatherContext, runTurn } from "@hippo/core";
import { desc, eq, memoryIndex } from "@hippo/db";
import { explorer, RelayerExtras } from "@hippo/memory";
import { convertToModelMessages, type UIMessage } from "ai";
import { type Context, Hono } from "hono";
import { getCookie, setCookie } from "hono/cookie";
import { db, model } from "../app-context.ts";
import { personFromSession } from "../auth.ts";
import { type CommandContext, handleCommand } from "../commands.ts";
import { startConnect, startDisconnect } from "../connect.ts";
import { env } from "../env.ts";
import { logTurn, type Person, portFor, resolvePerson } from "../persons.ts";
import { checkRate, noteCommand } from "../ratelimit.ts";

/** The web page and the CLI share this route; the CLI identifies itself by header. */
const CHANNEL = "web";
const COOKIE = "hippo_guest";
const SESSION_COOKIE = "hippo_session";

/**
 * Cross-origin fallbacks for the cookies.
 *
 * A `SameSite=Lax` cookie is not sent on a cross-site request, which is what
 * broke production when the page was on vercel.app and the API on railway.app.
 * Proxying fixed that, but it ties the app to a host that can proxy, and the UI
 * is meant to be able to live on Walrus Sites, where it cannot.
 *
 * So a client on a different origin may carry the same opaque id in a header
 * instead. A header is never attached by the browser on its own, so this cannot
 * be used for CSRF: it is strictly safer in that respect than `SameSite=None`,
 * which was the other way to solve it. The trade is that the id lives in
 * `localStorage` rather than an `HttpOnly` cookie, so a cross-site scripting
 * bug on the page could read it. Same-origin deployments keep the cookie and
 * never touch this path.
 */
const GUEST_HEADER = "x-hippo-guest";
const SESSION_HEADER = "x-hippo-session";

/** A guest id is opaque, but it must still look like one we would have minted. */
function readGuestId(c: Context): string | undefined {
  const cookie = getCookie(c, COOKIE);
  if (cookie) return cookie;
  const header = c.req.header(GUEST_HEADER);
  return header && /^[0-9a-f-]{36}$/i.test(header) ? header : undefined;
}

function readSessionId(c: Context): string | undefined {
  const cookie = getCookie(c, SESSION_COOKIE);
  if (cookie) return cookie;
  const header = c.req.header(SESSION_HEADER);
  return header && /^[0-9a-f]{64}$/i.test(header) ? header : undefined;
}
const COOKIE_MAX_AGE = 60 * 60 * 24 * 90;

/**
 * Who is talking. A wallet session wins over the anonymous cookie, so someone
 * who signed in sees their own memory rather than a fresh stranger's.
 */
async function webPerson(
  c: Context,
  channel: string,
  cookie: string | undefined,
  setId: (id: string) => void,
): Promise<Person> {
  const sessionId = readSessionId(c);
  if (sessionId) {
    const signedIn = await personFromSession(sessionId);
    if (signedIn) return signedIn;
  }
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
    const person = await webPerson(c, channel, readGuestId(c), (id) =>
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
    // Commands are rate limited too. They are the cheapest thing to flood and
    // the most expensive to serve: /connect mints a keypair and two rows,
    // /memory search spends the shared relayer budget.
    const gate = await checkRate(person.id);
    if (!gate.allowed) return c.json({ command: true, text: gate.message });

    const command = await handleCommand(ctx, text);
    if (command) {
      await noteCommand(person.id, channel);
      return c.json({ command: true, text: command.text });
    }

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
      /**
       * Tell the page what this answer was built from. Judging criterion one is
       * whether memory is doing real work, and a user cannot see that from the
       * text alone: the bot just sounds like it knows them. Sending the recalled
       * memories with the reply makes it visible in the moment rather than only
       * through `/proof` afterwards.
       */
      messageMetadata: ({ part }) =>
        part.type === "start"
          ? {
              recalled: turnCtx.injected.map((m) => ({
                type: m.parsed?.type ?? "memory",
                text: m.parsed?.text ?? m.text,
                relevance: Number((1 - m.distance).toFixed(2)),
                blobId: m.blob_id,
              })),
            }
          : undefined,
      onFinish: async ({ messages: out }) => {
        const writes = out.flatMap((m) => m.parts).filter((p) => p.type === "tool-remember").length;
        await logTurn(person, channel, turnCtx, writes, model.id).catch((e) =>
          console.error("[web] logTurn", e),
        );
      },
    });
  })

  /** The memories hippo wrote for this person, newest first, with links and expiry. */
  .get("/api/me/memories", async (c) => {
    const cookie = readGuestId(c);
    if (!cookie && !readSessionId(c)) return c.json({ memories: [] });
    const person = await webPerson(c, CHANNEL, cookie, () => {});
    const rows = await db
      .select()
      .from(memoryIndex)
      .where(eq(memoryIndex.personId, person.id))
      .orderBy(desc(memoryIndex.createdAt))
      .limit(100);

    /**
     * Storage on Walrus is paid per epoch, so a memory is not kept forever.
     * The read API carries `expires_at` per blob, and telling the user when
     * their memory runs out is more honest than implying it never does.
     * Best-effort: the relayer's metadata routes are flaky, so a failure here
     * costs the expiry column and nothing else.
     */
    const port = await portFor(person, CHANNEL);
    const expiry = new Map<string, string>();
    try {
      const extras = new RelayerExtras(port.scope);
      for (const m of await extras.allMemories()) {
        if (m.expires_at) expiry.set(m.blob_id, m.expires_at);
      }
    } catch (e) {
      console.warn("[web] expiry lookup failed", e instanceof Error ? e.message : e);
    }

    return c.json({
      memories: rows.map((r) => ({
        id: r.id,
        type: r.type,
        status: r.status,
        channel: r.channel,
        createdAt: r.createdAt,
        blobId: r.blobId,
        expiresAt: r.blobId ? (expiry.get(r.blobId) ?? null) : null,
        // The ciphertext is public; only this account can read it. That is the
        // point, so both links are offered.
        ciphertextUrl: r.blobId ? explorer.blob(r.blobId) : null,
        explorerUrl: r.blobId ? explorer.blobExplorer(r.blobId) : null,
      })),
    });
  })

  /** Everything the /me page shows. */
  .get("/api/me", async (c) => {
    const cookie = readGuestId(c);
    const sessionId = readSessionId(c);
    // `signedIn` has to mean the session resolved, not that a cookie was sent.
    // A signed-out or expired session leaves the cookie in the browser, and
    // reporting that as signed in would show the wrong thing on /me.
    const sessionPerson = sessionId ? await personFromSession(sessionId) : null;
    if (!cookie && !sessionPerson) return c.json({ mode: "anonymous" as const });
    const person = sessionPerson ?? (await webPerson(c, CHANNEL, cookie, () => {}));
    const signedIn = Boolean(sessionPerson);
    const port = await portFor(person, CHANNEL);
    return c.json({
      mode: person.mode,
      signedIn,
      personId: person.id,
      memoryEnabled: person.memoryEnabled,
      accountId: person.accountId,
      walletAddress: person.walletAddress,
      namespace: port.scope.namespace,
      surveyUrl: env.SURVEY_URL ?? null,
    });
  });
