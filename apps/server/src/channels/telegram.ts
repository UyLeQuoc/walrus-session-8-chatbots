import { Bot, InputFile } from "grammy";
import { describeFailure } from "../copy.ts";
import { env } from "../env.ts";
import { handleIncoming } from "../turn.ts";
import { chunk } from "./chunk.ts";
import type { ChannelAdapter } from "./types.ts";

const CHANNEL = "telegram";

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
      for (const f of reply.files ?? []) {
        await ctx.replyWithDocument(new InputFile(Buffer.from(f.content, "utf8"), f.name));
      }
    } catch (err) {
      console.error("[telegram] turn failed", err);
      await ctx.reply(describeFailure(err));
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
