import type { TurnContext } from "@hippo/core";
import { and, channelIdentities, delegateKeys, eq, memoryIndex, people, turnLog } from "@hippo/db";
import {
  createMemoryPort,
  decryptSecret,
  guestScope,
  type MemoryPort,
  ownedScope,
  type WriteEvent,
} from "@hippo/memory";
import { db, operator } from "./app-context.ts";
import { env } from "./env.ts";

export type Person = typeof people.$inferSelect;

/** Find or create the person behind a channel identity. */
export async function resolvePerson(
  channel: string,
  externalId: string,
  displayName?: string,
): Promise<Person> {
  const existing = await db
    .select({ person: people })
    .from(channelIdentities)
    .innerJoin(people, eq(people.id, channelIdentities.personId))
    .where(
      and(eq(channelIdentities.channel, channel), eq(channelIdentities.externalId, externalId)),
    )
    .limit(1);
  const hit = existing[0]?.person;
  if (hit) return hit;
  return db.transaction(async (tx) => {
    const [person] = await tx.insert(people).values({ displayName }).returning();
    if (!person) throw new Error("failed to create person");
    await tx
      .insert(channelIdentities)
      .values({ personId: person.id, channel, externalId, displayName });
    return person;
  });
}

/** Guest or owned MemoryPort for a person, recording every write in memory_index. */
export async function portFor(person: Person, channel: string): Promise<MemoryPort> {
  const by = person.displayName ?? person.id.slice(0, 8);
  const onWrite = async (e: WriteEvent) => {
    if (e.outcome !== "accepted") return;
    await db.insert(memoryIndex).values({
      personId: person.id,
      accountId: e.scope.accountId,
      namespace: e.scope.namespace,
      blobId: e.blobId,
      type: e.type,
      textSha256: e.textSha256,
      channel: e.channel,
    });
  };
  if (person.mode === "owned" && person.accountId) {
    const [key] = await db
      .select()
      .from(delegateKeys)
      .where(and(eq(delegateKeys.personId, person.id), eq(delegateKeys.status, "active")))
      .limit(1);
    if (key) {
      const scope = ownedScope({
        key: decryptSecret(key.privateKeyEnc, env.KEY_ENCRYPTION_KEY),
        accountId: person.accountId,
        serverUrl: env.MEMWAL_SERVER_URL,
      });
      return createMemoryPort({ scope, by, channel, onWrite });
    }
  }
  return createMemoryPort({ scope: guestScope(operator, person.id), by, channel, onWrite });
}

export async function logTurn(
  person: Person,
  channel: string,
  ctx: TurnContext,
  writes: number,
  modelId: string,
) {
  await db.insert(turnLog).values({
    personId: person.id,
    channel,
    memoryEnabled: person.memoryEnabled,
    mode: person.mode,
    model: modelId,
    injected: ctx.injected.map((m) => ({
      blobId: m.blob_id,
      distance: m.distance,
      type: m.parsed?.type ?? null,
    })),
    writes,
  });
}
