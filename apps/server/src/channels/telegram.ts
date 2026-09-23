import { Bot } from "grammy";
import { env } from "../env.ts";
import { handleIncoming } from "../turn.ts";
import type { ChannelAdapter } from "./types.ts";

const CHANNEL = "telegram";
const MAX_LEN = 3900;

/**
 * Telegram rejects a message over 4096 characters, and `/memory` listings run
 * long. Split on a newline where there is one in the back half of the window so
 * a list is not cut mid-entry. Exported for tests.
 */
export function chunk(text: string, maxLen = MAX_LEN): string[] {
  if (text.length <= maxLen) return [text];
  const out: string[] = [];
  let rest = text;
  while (rest.length > maxLen) {
    const cut = rest.lastIndexOf("\n", maxLen);
    const at = cut > maxLen * 0.5 ? cut : maxLen;
    out.push(rest.slice(0, at));
    rest = rest.slice(at).trimStart();
  }
  if (rest) out.push(rest);
  return out;
}

export function telegramAdapter(): ChannelAdapter | null {
  if (!env.TELEGRAM_BOT_TOKEN) return null;
  const bot = new Bot(env.TELEGRAM_BOT_TOKEN);

  bot.on("message:text", async (ctx) => {
    const from = ctx.from;
    const typing = setInterval(() => void ctx.replyWithChatAction("typing").catch(() => {}), 5_000);
    void ctx.replyWithChatAction("typing").catch(() => {});
    try {
      const reply = await handleIncoming({
        channel: CHANNEL,
        externalId: String(from.id),
        displayName: from.username ?? from.first_name,
        text: ctx.message.text,
        threadKey: `${ctx.chat.id}:${from.id}`,
      });
      for (const part of chunk(reply.text)) {
        await ctx.reply(part, { link_preview_options: { is_disabled: true } });
      }
    } catch (err) {
      console.error("[telegram] turn failed", err);
      await ctx.reply("Something went wrong on my side. Try again in a moment.");
    } finally {
      clearInterval(typing);
    }
  });

  return {
    name: CHANNEL,
    async start() {
      bot.catch((e) => console.error("[telegram]", e));
      await bot.api.setMyCommands([
        { command: "memory", description: "what I remember about you" },
        { command: "whoami", description: "your account and where the memory lives" },
        { command: "proof", description: "the memories behind my last answer" },
        { command: "link", description: "use the same memory on another channel" },
        { command: "connect", description: "own your memory on-chain" },
        { command: "disconnect", description: "revoke my access" },
        { command: "privacy", description: "what is stored, where, and for how long" },
        { command: "help", description: "all commands" },
      ]);
      void bot.start({ onStart: (me) => console.log(`[telegram] @${me.username} polling`) });
    },
    async stop() {
      await bot.stop();
    },
  };
}
