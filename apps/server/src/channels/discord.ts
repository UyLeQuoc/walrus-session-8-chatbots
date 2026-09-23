import { ChannelType, Client, Events, GatewayIntentBits, Partials } from "discord.js";
import { describeFailure } from "../copy.ts";
import { env } from "../env.ts";
import { handleIncoming } from "../turn.ts";
import type { ChannelAdapter } from "./types.ts";

const CHANNEL = "discord";
const MAX_LEN = 1900;

export function discordAdapter(): ChannelAdapter | null {
  if (!env.DISCORD_TOKEN) return null;
  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.DirectMessages,
      GatewayIntentBits.MessageContent,
    ],
    partials: [Partials.Channel],
  });

  client.on(Events.MessageCreate, async (msg) => {
    if (msg.author.bot) return;
    const isDm = msg.channel.type === ChannelType.DM;
    const mentioned = client.user ? msg.mentions.has(client.user) : false;
    if (!isDm && !mentioned) return;
    const text = msg.content.replace(/<@!?\d+>/g, "").trim();
    if (!text) return;

    if ("sendTyping" in msg.channel) await msg.channel.sendTyping().catch(() => {});
    try {
      const reply = await handleIncoming({
        channel: CHANNEL,
        externalId: msg.author.id,
        displayName: msg.author.username,
        text,
        threadKey: `${msg.channelId}:${msg.author.id}`,
      });
      for (let i = 0; i < reply.text.length; i += MAX_LEN) {
        await msg.reply(reply.text.slice(i, i + MAX_LEN));
      }
    } catch (err) {
      console.error("[discord] turn failed", err);
      await msg.reply(describeFailure(err));
    }
  });

  return {
    name: CHANNEL,
    async start() {
      client.once(Events.ClientReady, (c) => console.log(`[discord] logged in as ${c.user.tag}`));
      await client.login(env.DISCORD_TOKEN);
    },
    async stop() {
      await client.destroy();
    },
  };
}
