import { completeTurn } from "@hippo/core";
import type { ModelMessage } from "ai";
import { Bot } from "grammy";
import { model } from "../app-context.ts";
import { env } from "../env.ts";
import { logTurn, portFor, resolvePerson } from "../persons.ts";
import type { ChannelAdapter } from "./types.ts";

const CHANNEL = "telegram";
/** Short-lived per-chat history kept in memory; long-term memory is on Walrus. */
const history = new Map<string, { messages: ModelMessage[]; last: number }>();
const SESSION_GAP_MS = 6 * 60 * 60 * 1000;

export function telegramAdapter(): ChannelAdapter | null {
  if (!env.TELEGRAM_BOT_TOKEN) return null;
  const bot = new Bot(env.TELEGRAM_BOT_TOKEN);

  bot.command("start", (ctx) =>
    ctx.reply(
      "hi, I'm hippo. I remember what you tell me, and the memory is yours. /connect to own it on-chain, /memory to see it.",
    ),
  );
  bot.command("whoami", async (ctx) => {
    const person = await resolvePerson(
      CHANNEL,
      String(ctx.from?.id),
      ctx.from?.username ?? ctx.from?.first_name,
    );
    await ctx.reply(
      `mode: ${person.mode}\nperson: ${person.id}\naccount: ${person.accountId ?? "operator (guest)"}`,
    );
  });
  bot.command("connect", (ctx) =>
    ctx.reply("owned mode is coming in Milestone 1 (see docs/ARCHITECTURE.md §3)."),
  );

  bot.on("message:text", async (ctx) => {
    const from = ctx.from;
    const person = await resolvePerson(CHANNEL, String(from.id), from.username ?? from.first_name);
    const key = String(ctx.chat.id);
    const now = Date.now();
    const h = history.get(key);
    const sessionStart = !h || now - h.last > SESSION_GAP_MS;
    const messages = sessionStart ? [] : (h?.messages ?? []);
    messages.push({ role: "user", content: ctx.message.text });
    await ctx.replyWithChatAction("typing");
    const port = await portFor(person, CHANNEL);
    try {
      const {
        text,
        ctx: turnCtx,
        writes,
      } = await completeTurn({
        model,
        port,
        messages,
        channel: CHANNEL,
        userHandle: from.username ?? from.first_name,
        memoryEnabled: person.memoryEnabled,
        sessionStart,
      });
      messages.push({ role: "assistant", content: text });
      history.set(key, { messages: messages.slice(-20), last: now });
      await ctx.reply(text || "…");
      await logTurn(person, CHANNEL, turnCtx, writes, model.id);
    } catch (err) {
      console.error("[telegram] turn failed", err);
      await ctx.reply("something went wrong on my side, try again in a moment.");
    }
  });

  return {
    name: CHANNEL,
    async start() {
      bot.catch((e) => console.error("[telegram]", e));
      void bot.start({ onStart: (me) => console.log(`[telegram] @${me.username} polling`) });
    },
    async stop() {
      await bot.stop();
    },
  };
}
