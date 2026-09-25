import { App } from "@slack/bolt";
import { handleIncoming } from "../chat/turn.ts";
import { env } from "../env/load.ts";
import { slackHandler } from "./handlers.ts";
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

  const handle = slackHandler(handleIncoming);

  app.event("app_mention", async ({ event, say }) => {
    await handle(
      { user: event.user, team: event.team, channel: event.channel, text: event.text },
      (t) => say(t),
    );
  });

  app.message(async ({ message, say }) => {
    if (message.channel_type !== "im") return;
    if (!("text" in message) || !message.text) return;
    const user = "user" in message ? message.user : undefined;
    const team = "team" in message ? (message.team as string | undefined) : undefined;
    await handle({ user, team, channel: message.channel, text: message.text }, (t) => say(t));
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
