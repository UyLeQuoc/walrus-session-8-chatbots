import type { MemWal, RecallMemory } from "@mysten-incubation/memwal";
import { type MemoryRecord, parseMemoryText } from "./format.ts";
import { type RateLimiter, runLimited } from "./limiter.ts";

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
  limiter?: RateLimiter;
}

/**
 * Measured on mainnet 2026-09-21: clearly relevant matches land between 0.45
 * and 0.78, so the SDK's "0.7 and above is unrelated" guidance is too tight for
 * question-shaped queries. Missing a real memory is worse than injecting one
 * weak line, because the untrusted-data framing already tells the model to
 * ignore what does not fit.
 */
export const DEFAULT_MAX_DISTANCE = 0.8;

/** The relayer reports matches it discarded; the SDK's typings omit the field. */
interface RecallEnvelope {
  total?: number;
  dropped_count?: number;
}

export async function recallRelevant(
  client: MemWal,
  {
    query,
    namespace,
    limit = 6,
    maxDistance = DEFAULT_MAX_DISTANCE,
    limiter,
  }: RecallRelevantOptions,
): Promise<RecalledMemory[]> {
  const call = () => client.recall({ query, namespace, limit, maxDistance });

  // The relayer intermittently returns `{results: [], total: 0, dropped_count: N}`
  // for a namespace that definitely holds matches: it found N candidates and
  // discarded every one, with no error. Taking that at face value makes the bot
  // silently forget, so retry before believing an empty result that had
  // candidates. Observed 2026-09-21, see docs/SPIKES.md §5.
  for (let attempt = 1; attempt <= 3; attempt++) {
    const res = limiter ? await runLimited(limiter, call) : await call();
    const dropped = (res as RecallEnvelope).dropped_count ?? 0;
    if (res.results.length > 0 || dropped === 0) {
      return res.results
        .filter((m) => m.distance < maxDistance)
        .map((m) => ({ ...m, parsed: parseMemoryText(m.text) }));
    }
    console.warn(
      `[memory] recall in ${namespace} dropped all ${dropped} candidates (attempt ${attempt}/3)`,
    );
    if (attempt < 3) await new Promise((r) => setTimeout(r, 1_000 * attempt));
  }
  return [];
}

export type RememberOutcome =
  | { status: "accepted"; jobId: string; settled: Promise<SettledWrite> }
  | { status: "duplicate"; blobId: string; distance: number; existing: string };

export interface SettledWrite {
  status: "stored" | "failed";
  blobId: string | null;
  error?: string;
}

export interface RememberOptions {
  text: string;
  namespace: string;
  limiter?: RateLimiter;
  /** How long the background settle may take before giving up. */
  timeoutMs?: number;
}

/**
 * Dedupe, then accept the write and return immediately.
 *
 * `rememberAndWait` takes about 24 s on mainnet (measured 2026-09-21), which is
 * far too long to hold a chat reply. The relayer accepts the job in well under
 * a second and mints the blob asynchronously, so the caller gets a job id now
 * and a `settled` promise that resolves with the blob id later.
 */
export async function rememberWithDedupe(
  client: MemWal,
  { text, namespace, limiter, timeoutMs = 120_000 }: RememberOptions,
): Promise<RememberOutcome> {
  const near = await recallRelevant(client, {
    query: text,
    namespace,
    limit: 3,
    maxDistance: DISTANCE.duplicate,
    limiter,
  });
  const dup = near[0];
  if (dup) {
    return { status: "duplicate", blobId: dup.blob_id, distance: dup.distance, existing: dup.text };
  }

  const accept = () => client.remember(text, namespace);
  const accepted = limiter ? await runLimited(limiter, accept) : await accept();

  const settled: Promise<SettledWrite> = (async () => {
    try {
      const wait = () =>
        client.waitForRememberJob(accepted.job_id, { timeoutMs, pollIntervalMs: 2_000 });
      const done = limiter ? await runLimited(limiter, wait) : await wait();
      return { status: "stored", blobId: done.blob_id ?? null };
    } catch (err) {
      return {
        status: "failed",
        blobId: null,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  })();
  // A rejection is impossible above, but never leave an unobserved promise.
  settled.catch(() => {});

  return { status: "accepted", jobId: accepted.job_id, settled };
}
