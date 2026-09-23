import { App } from "@slack/bolt";
import { describeFailure } from "../copy.ts";
import { env } from "../env.ts";
import { handleIncoming } from "../turn.ts";
import type { ChannelAdapter } from "./types.ts";

const CHANNEL = "slack";

export function slackAdapter(): ChannelAdapter | null {
  if (!env.SLACK_BOT_TOKEN || !env.SLACK_APP_TOKEN || !env.SLACK_SIGNING_SECRET) return null;
  const app = new App({
    token: env.SLACK_BOT_TOKEN,
    appToken: env.SLACK_APP_TOKEN,
    signingSecret: env.SLACK_SIGNING_SECRET,
    socketMode: true,
  });

  const run = async (
    userId: string,
    teamId: string | undefined,
    channelId: string,
    text: string,
    say: (t: string) => Promise<unknown>,
  ) => {
    try {
      const reply = await handleIncoming({
        channel: CHANNEL,
        externalId: `${teamId ?? "?"}/${userId}`,
        text,
        threadKey: `${channelId}:${userId}`,
      });
      await say(reply.text);
    } catch (err) {
      console.error("[slack] turn failed", err);
      await say(describeFailure(err));
    }
  };

  app.event("app_mention", async ({ event, say }) => {
    const text = event.text.replace(/<@[A-Z0-9]+>/g, "").trim();
    if (text) await run(event.user ?? "unknown", event.team, event.channel, text, (t) => say(t));
  });

  app.message(async ({ message, say }) => {
    if (message.channel_type !== "im") return;
    if (!("text" in message) || !message.text) return;
    if (!("user" in message) || !message.user) return;
    const team = "team" in message ? (message.team as string | undefined) : undefined;
    await run(message.user, team, message.channel, message.text, (t) => say(t));
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
