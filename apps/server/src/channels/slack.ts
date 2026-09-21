import { completeTurn } from "@hippo/core";
import { App } from "@slack/bolt";
import type { ModelMessage } from "ai";
import { model } from "../app-context.ts";
import { env } from "../env.ts";
import { logTurn, portFor, resolvePerson } from "../persons.ts";
import type { ChannelAdapter } from "./types.ts";

const CHANNEL = "slack";
const history = new Map<string, { messages: ModelMessage[]; last: number }>();
const SESSION_GAP_MS = 6 * 60 * 60 * 1000;

export function slackAdapter(): ChannelAdapter | null {
  if (!env.SLACK_BOT_TOKEN || !env.SLACK_APP_TOKEN || !env.SLACK_SIGNING_SECRET) return null;
  const app = new App({
    token: env.SLACK_BOT_TOKEN,
    appToken: env.SLACK_APP_TOKEN,
    signingSecret: env.SLACK_SIGNING_SECRET,
    socketMode: true,
  });

  const handle = async (
    userId: string,
    teamId: string | undefined,
    channelId: string,
    text: string,
    say: (t: string) => Promise<unknown>,
  ) => {
    const person = await resolvePerson(CHANNEL, `${teamId ?? "?"}/${userId}`);
    const key = `${channelId}:${userId}`;
    const now = Date.now();
    const h = history.get(key);
    const sessionStart = !h || now - h.last > SESSION_GAP_MS;
    const messages = sessionStart ? [] : (h?.messages ?? []);
    messages.push({ role: "user", content: text });
    const port = await portFor(person, CHANNEL);
    try {
      const {
        text: reply,
        ctx,
        writes,
      } = await completeTurn({
        model,
        port,
        messages,
        channel: CHANNEL,
        userHandle: userId,
        memoryEnabled: person.memoryEnabled,
        sessionStart,
      });
      messages.push({ role: "assistant", content: reply });
      history.set(key, { messages: messages.slice(-20), last: now });
      await say(reply || "…");
      await logTurn(person, CHANNEL, ctx, writes, model.id);
    } catch (err) {
      console.error("[slack] turn failed", err);
      await say("something went wrong on my side, try again in a moment.");
    }
  };

  app.event("app_mention", async ({ event, say }) => {
    const text = event.text.replace(/<@[A-Z0-9]+>/g, "").trim();
    if (text) await handle(event.user ?? "unknown", event.team, event.channel, text, (t) => say(t));
  });
  app.message(async ({ message, say }) => {
    if (
      message.channel_type !== "im" ||
      !("text" in message) ||
      !message.text ||
      !("user" in message) ||
      !message.user
    )
      return;
    await handle(
      message.user,
      "team" in message ? (message.team as string | undefined) : undefined,
      message.channel,
      message.text,
      (t) => say(t),
    );
  });

  return {
    name: CHANNEL,
    async start() {
      await app.start();
      console.log("[slack] socket mode connected");
    },
    async stop() {
      await app.stop();
    },
  };
}
