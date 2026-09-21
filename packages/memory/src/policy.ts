import type { MemWal, RecallMemory } from "@mysten-incubation/memwal";
import { type MemoryRecord, parseMemoryText } from "./format.ts";

/** Cosine-distance bands from memwal/SKILL.md. Lower is more similar. */
export const DISTANCE = { duplicate: 0.25, related: 0.55, weak: 0.7 } as const;

export interface RecalledMemory extends RecallMemory {
  parsed: MemoryRecord | null;
}

export interface RecallRelevantOptions {
  query: string;
  namespace: string;
  limit?: number;
  maxDistance?: number;
}

export async function recallRelevant(
  client: MemWal,
  { query, namespace, limit = 6, maxDistance = 0.6 }: RecallRelevantOptions,
): Promise<RecalledMemory[]> {
  const res = await client.recall({ query, namespace, limit, maxDistance });
  return res.results
    .filter((m) => m.distance < maxDistance)
    .map((m) => ({ ...m, parsed: parseMemoryText(m.text) }));
}

export type RememberOutcome =
  | { status: "stored"; blobId: string; id: string }
  | { status: "duplicate"; blobId: string; distance: number; existing: string };

/**
 * remember() on the relayer is append-only. Check for a near-duplicate first so the
 * same fact stated twice does not become two entries that both surface on recall.
 */
export async function rememberWithDedupe(
  client: MemWal,
  { text, namespace, timeoutMs = 30_000 }: { text: string; namespace: string; timeoutMs?: number },
): Promise<RememberOutcome> {
  const near = await client.recall({
    query: text,
    namespace,
    limit: 3,
    maxDistance: DISTANCE.duplicate,
  });
  const dup = near.results.find((m) => m.distance < DISTANCE.duplicate);
  if (dup)
    return { status: "duplicate", blobId: dup.blob_id, distance: dup.distance, existing: dup.text };
  const stored = await client.rememberAndWait(text, namespace, { timeoutMs });
  return { status: "stored", blobId: stored.blob_id, id: stored.id };
}
