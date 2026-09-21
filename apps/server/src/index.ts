import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { discordAdapter } from "./channels/discord.ts";
import { slackAdapter } from "./channels/slack.ts";
import { telegramAdapter } from "./channels/telegram.ts";
import type { ChannelAdapter } from "./channels/types.ts";
import { env } from "./env.ts";
import { chatRoutes } from "./routes/chat.ts";
import { connectRoutes } from "./routes/connect.ts";

const app = new Hono();
app.use(logger());
app.use(
  "/api/*",
  cors({ origin: env.CORS_ORIGIN.split(",").map((o: string) => o.trim()), credentials: true }),
);
app.get("/api/health", (c) =>
  c.json({ ok: true, model: env.LLM_MODEL, relayer: env.MEMWAL_SERVER_URL }),
);
app.route("/", chatRoutes);
app.route("/", connectRoutes);

const adapters = [telegramAdapter(), discordAdapter(), slackAdapter()].filter(
  (a): a is ChannelAdapter => a !== null,
);
for (const a of adapters) a.start().catch((e) => console.error(`[${a.name}] failed to start`, e));
if (!adapters.length) console.log("no channel tokens set; only the web API is running");

const server = serve({ fetch: app.fetch, port: env.PORT }, (info) =>
  console.log(`hippo server on http://localhost:${info.port}`),
);

const shutdown = async () => {
  await Promise.allSettled(adapters.map((a) => a.stop()));
  server.close();
  process.exit(0);
};
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
