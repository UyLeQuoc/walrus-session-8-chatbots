import { Bot } from "grammy";
import { env } from "../env.ts";
import { handleIncoming } from "../turn.ts";
import { telegramHandler } from "./handlers.ts";
import type { ChannelAdapter } from "./types.ts";

const CHANNEL = "telegram";

export function telegramAdapter(): ChannelAdapter | null {
  if (!env.TELEGRAM_BOT_TOKEN) return null;
  const bot = new Bot(env.TELEGRAM_BOT_TOKEN);

  const handle = telegramHandler(handleIncoming);
  bot.on("message:text", (ctx) => handle(ctx));

  return {
    name: CHANNEL,
    async start() {
      bot.catch((e) => console.error("[telegram]", e));
      await bot.api.setMyCommands([
        { command: "memory", description: "what I remember about you" },
        { command: "whoami", description: "your account and where the memory lives" },
        { command: "proof", description: "the memories behind my last answer" },
        { command: "export", description: "your memory as a file you keep" },
        { command: "link", description: "use the same memory on another channel" },
        { command: "team", description: "share a memory with a few people" },
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
