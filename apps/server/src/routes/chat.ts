import { gatherContext, runTurn } from "@hippo/core";
import { convertToModelMessages, type UIMessage } from "ai";
import { Hono } from "hono";
import { getCookie, setCookie } from "hono/cookie";
import { model } from "../app-context.ts";
import { type CommandContext, handleCommand } from "../commands.ts";
import { startConnect, startDisconnect } from "../connect.ts";
import { env } from "../env.ts";
import { logTurn, type Person, portFor, resolvePerson } from "../persons.ts";
import { checkRate } from "../ratelimit.ts";

const CHANNEL = "web";
const COOKIE = "hippo_guest";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 90;

/** Anonymous cookie identity. Wallet sign-in attaches this person to an account in M3. */
async function webPerson(cookie: string | undefined, setId: (id: string) => void): Promise<Person> {
  const id = cookie ?? crypto.randomUUID();
  if (!cookie) setId(id);
  return resolvePerson(CHANNEL, id, "web");
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
    const person = await webPerson(getCookie(c, COOKIE), (id) =>
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
      channel: CHANNEL,
      connectUrl: async (kind) =>
        kind === "connect"
          ? (await startConnect(person, CHANNEL, person.displayName ?? "web")).url
          : (await startDisconnect(person)).url,
    };
    const command = await handleCommand(ctx, text);
    if (command) {
      // Commands answer as a plain stream so the client renders them like any reply.
      return c.json({ command: true, text: command.text });
    }

    const gate = await checkRate(person.id);
    if (!gate.allowed) return c.json({ command: true, text: gate.message });

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
    const turnCtx = await gatherContext(input);
    const result = runTurn(input, turnCtx);
    return result.toUIMessageStreamResponse({
      onFinish: async ({ messages: out }) => {
        const writes = out.flatMap((m) => m.parts).filter((p) => p.type === "tool-remember").length;
        await logTurn(person, CHANNEL, turnCtx, writes, model.id).catch((e) =>
          console.error("[web] logTurn", e),
        );
      },
    });
  })

  /** Everything the /me page shows. */
  .get("/api/me", async (c) => {
    const cookie = getCookie(c, COOKIE);
    if (!cookie) return c.json({ mode: "anonymous" as const });
    const person = await webPerson(cookie, () => {});
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
