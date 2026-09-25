/**
 * Register hippo's slash commands with Discord.
 *
 * Discord needs commands registered over REST before they appear; the gateway
 * connection alone does not publish them. Run once after setting
 * DISCORD_TOKEN and DISCORD_CLIENT_ID, and again whenever the list changes.
 *
 *   bun run --filter @hippo/server discord:commands            # global, up to an hour to propagate
 *   bun run --filter @hippo/server discord:commands <guildId>  # one server, instant, good for testing
 *
 * The handlers live in apps/server/src/chat/commands.ts and are shared with every
 * other channel, so this file only publishes the names.
 */
import { REST, Routes } from "discord.js";
import { env } from "../src/env/load.ts";

const COMMANDS = [
  { name: "memory", description: "What I remember about you" },
  { name: "whoami", description: "Your account and where the memory lives" },
  { name: "proof", description: "The memories behind my last answer" },
  { name: "link", description: "Use the same memory on another channel" },
  { name: "connect", description: "Own your memory in your own Walrus account" },
  { name: "disconnect", description: "Revoke my access on-chain" },
  { name: "help", description: "All commands" },
];

if (!env.DISCORD_TOKEN || !env.DISCORD_CLIENT_ID) {
  console.error("DISCORD_TOKEN and DISCORD_CLIENT_ID must both be set in .env");
  process.exit(1);
}

const guildId = process.argv[2];
const rest = new REST({ version: "10" }).setToken(env.DISCORD_TOKEN);
const route = guildId
  ? Routes.applicationGuildCommands(env.DISCORD_CLIENT_ID, guildId)
  : Routes.applicationCommands(env.DISCORD_CLIENT_ID);

const result = (await rest.put(route, { body: COMMANDS })) as Array<{ name: string }>;
console.log(
  `Registered ${result.length} command(s) ${guildId ? `in guild ${guildId}` : "globally"}: ${result.map((c) => c.name).join(", ")}`,
);
if (!guildId)
  console.log(
    "Global commands can take up to an hour to appear. Pass a guild id to test immediately.",
  );
process.exit(0);
