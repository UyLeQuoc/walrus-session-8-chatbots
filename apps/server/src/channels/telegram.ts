import { Bot } from "grammy";
import { env } from "../env.ts";
import { handleIncoming } from "../turn.ts";
import { telegramHandler } from "./handlers.ts";
import { keepPolling } from "./polling.ts";
import type { ChannelAdapter } from "./types.ts";

const CHANNEL = "telegram";

export function telegramAdapter(): ChannelAdapter | null {
  if (!env.TELEGRAM_BOT_TOKEN) return null;
  const bot = new Bot(env.TELEGRAM_BOT_TOKEN);

  const handle = telegramHandler(handleIncoming);
  bot.on("message:text", (ctx) => handle(ctx));
  let stopping = false;

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
      // Not `void bot.start()`: a 409 during a deploy overlap rejected it
      // unhandled and crashed the whole server. See polling.ts.
      void keepPolling({
        start: () =>
          bot.start({ onStart: (me) => console.log(`[telegram] @${me.username} polling`) }),
        stopped: () => stopping,
      });
    },
    async stop() {
      stopping = true;
      await bot.stop();
    },
  };
}
