import { completeTurn } from "@hippo/core";
import type { ModelMessage } from "ai";
import { ChannelType, Client, Events, GatewayIntentBits, Partials } from "discord.js";
import { model } from "../app-context.ts";
import { env } from "../env.ts";
import { logTurn, portFor, resolvePerson } from "../persons.ts";
import type { ChannelAdapter } from "./types.ts";

const CHANNEL = "discord";
const history = new Map<string, { messages: ModelMessage[]; last: number }>();
const SESSION_GAP_MS = 6 * 60 * 60 * 1000;

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
    const person = await resolvePerson(CHANNEL, msg.author.id, msg.author.username);
    const key = `${msg.channelId}:${msg.author.id}`;
    const now = Date.now();
    const h = history.get(key);
    const sessionStart = !h || now - h.last > SESSION_GAP_MS;
    const messages = sessionStart ? [] : (h?.messages ?? []);
    messages.push({ role: "user", content: text });
    if ("sendTyping" in msg.channel) await msg.channel.sendTyping().catch(() => {});
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
        userHandle: msg.author.username,
        memoryEnabled: person.memoryEnabled,
        sessionStart,
      });
      messages.push({ role: "assistant", content: reply });
      history.set(key, { messages: messages.slice(-20), last: now });
      await msg.reply(reply.slice(0, 1990) || "…");
      await logTurn(person, CHANNEL, ctx, writes, model.id);
    } catch (err) {
      console.error("[discord] turn failed", err);
      await msg.reply("something went wrong on my side, try again in a moment.");
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
