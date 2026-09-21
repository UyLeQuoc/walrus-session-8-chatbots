/**
 * `pnpm evidence` — the numbers the submission form and the article need.
 * Everything here is read from Postgres plus the relayer, never invented.
 */
import { desc, memoryIndex, people, sql, turnLog } from "@hippo/db";
import { createClient, explorer, guestScope, RelayerExtras } from "@hippo/memory";
import { db, operator } from "../src/app-context.ts";
import { env } from "../src/env.ts";

const rows = <T>(r: T[]): T[] => r;

const byPerson = rows(
  await db
    .select({
      personId: memoryIndex.personId,
      mode: people.mode,
      accountId: memoryIndex.accountId,
      channel: sql<string>`min(${memoryIndex.channel})`,
      memories: sql<number>`count(*)::int`,
      first: sql<string>`min(${memoryIndex.createdAt})::text`,
      last: sql<string>`max(${memoryIndex.createdAt})::text`,
    })
    .from(memoryIndex)
    .innerJoin(people, sql`${people.id} = ${memoryIndex.personId}`)
    .groupBy(memoryIndex.personId, people.mode, memoryIndex.accountId)
    .orderBy(desc(sql`count(*)`)),
);

const [turns] = await db
  .select({
    total: sql<number>`count(*)::int`,
    withMemory: sql<number>`count(*) filter (where ${turnLog.memoryEnabled})::int`,
    withoutMemory: sql<number>`count(*) filter (where not ${turnLog.memoryEnabled})::int`,
    recalls: sql<number>`coalesce(sum(jsonb_array_length(${turnLog.injected})), 0)::int`,
    turnsWithRecall: sql<number>`count(*) filter (where jsonb_array_length(${turnLog.injected}) > 0)::int`,
    writes: sql<number>`coalesce(sum(${turnLog.writes}), 0)::int`,
  })
  .from(turnLog);

const byChannel = rows(
  await db
    .select({ channel: turnLog.channel, turns: sql<number>`count(*)::int` })
    .from(turnLog)
    .groupBy(turnLog.channel)
    .orderBy(desc(sql`count(*)`)),
);

const qualifying = byPerson.filter((p) => p.memories >= 10);
const client = createClient(guestScope(operator, "evidence"));
const agentId = await client.getPublicKeyHex();

console.log(`# hippo evidence — ${new Date().toISOString()}`);
console.log(`\nRelayer: ${env.MEMWAL_SERVER_URL} (${env.SUI_NETWORK})`);
console.log(`Operator account: ${env.MEMWAL_ACCOUNT_ID}`);
console.log(`  ${explorer.object(env.MEMWAL_ACCOUNT_ID)}`);
console.log(`MEMWAL_AGENT_ID (delegate public key): ${agentId}`);

console.log(`\n## Requirement check`);
console.log(`People with memories:            ${byPerson.length}`);
console.log(`People with 10 or more memories: ${qualifying.length}  (session rules ask for 3)`);
console.log(`Total memories written:          ${byPerson.reduce((n, p) => n + p.memories, 0)}`);
console.log(`Distinct accounts written to:    ${new Set(byPerson.map((p) => p.accountId)).size}`);
console.log(
  `Owned-mode people:               ${byPerson.filter((p) => p.mode === "owned").length}`,
);

console.log(`\n## Per person`);
for (const p of byPerson) {
  console.log(
    `  ${p.personId.slice(0, 8)}  ${p.mode.padEnd(5)}  ${String(p.memories).padStart(3)} memories  first ${p.first.slice(0, 16)}  last ${p.last.slice(0, 16)}  acct ${p.accountId.slice(0, 10)}…`,
  );
}

console.log(`\n## Turns`);
console.log(
  `  total ${turns?.total ?? 0} (memory on ${turns?.withMemory ?? 0}, off ${turns?.withoutMemory ?? 0})`,
);
console.log(`  turns that recalled something: ${turns?.turnsWithRecall ?? 0}`);
console.log(`  memories injected in total:    ${turns?.recalls ?? 0}`);
console.log(`  memories written by the model: ${turns?.writes ?? 0}`);
for (const c of byChannel) console.log(`  ${c.channel.padEnd(9)} ${c.turns}`);

console.log(`\n## Accounts on the relayer`);
for (const accountId of new Set(byPerson.map((p) => p.accountId))) {
  const extras = new RelayerExtras({ ...operator, accountId });
  try {
    const agents = await extras.agents();
    console.log(`  ${accountId}  ${agents.agents.length} delegate keys`);
    for (const a of agents.agents) console.log(`    - ${a.label}`);
  } catch (e) {
    console.log(
      `  ${accountId}  (agents unavailable: ${e instanceof Error ? e.message.slice(0, 60) : e})`,
    );
  }
}
process.exit(0);
