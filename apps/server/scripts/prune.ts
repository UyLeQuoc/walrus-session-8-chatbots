/**
 * `bun run prune:people` — remove person rows that hold nothing.
 *
 * Every anonymous visitor creates a person, which is how guest mode works, but
 * a crawler, a preflight, or the SameSite cookie bug we hit in production all
 * leave a person behind with no memories and no conversation. Those rows make
 * `bun run evidence` overstate how many people have used hippo, and the submission
 * asks for that number.
 *
 * Deliberately conservative. A row is only removed when it has no memories, no
 * turns, no delegate key, no wallet identity, and is older than the cutoff, so
 * a visitor who is mid-first-message is never deleted out from under their own
 * cookie.
 *
 *   bun run prune:people              # dry run
 *   bun run prune:people --run        # delete
 *   bun run prune:people --run --older-than 2h
 */
import { sql } from "@hippo/db";
import { db } from "../src/app-context.ts";

const run = process.argv.includes("--run");
const idx = process.argv.indexOf("--older-than");
const olderThan = idx > -1 ? (process.argv[idx + 1] ?? "1 hour") : "1 hour";

const candidates = sql`
  select p.id, p.created_at
  from people p
  where p.created_at < now() - ${olderThan}::interval
    and p.mode = 'guest'
    and p.account_id is null
    and not exists (select 1 from memory_index m where m.person_id = p.id)
    and not exists (select 1 from turn_log t where t.person_id = p.id)
    and not exists (select 1 from delegate_keys d where d.person_id = p.id)
    and not exists (
      select 1 from channel_identities c
      where c.person_id = p.id and c.channel = 'wallet'
    )
`;

const rows = (await db.execute(candidates)) as unknown as Array<{ id: string; created_at: string }>;
const list = Array.isArray(rows) ? rows : ((rows as { rows?: typeof rows }).rows ?? []);

console.log(`${list.length} empty person row(s) older than ${olderThan}`);
for (const r of list.slice(0, 10)) console.log(`  ${r.id}  ${r.created_at}`);
if (list.length > 10) console.log(`  … and ${list.length - 10} more`);

if (!run) {
  console.log("\nDry run. Pass --run to delete.");
  process.exit(0);
}
if (list.length === 0) process.exit(0);

// Cascades clean up channel_identities and connect_tokens.
await db.execute(sql`delete from people where id in (select id from (${candidates}) as c)`);
console.log(`\nDeleted ${list.length}.`);
process.exit(0);
