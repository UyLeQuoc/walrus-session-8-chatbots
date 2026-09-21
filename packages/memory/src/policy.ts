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
  /** How many submissions it took. More than one means the relayer dropped a job. */
  attempts: number;
}

/** A dropped job is resubmitted this many times before the write is called lost. */
const WRITE_ATTEMPTS = 3;
const WRITE_RETRY_BASE_MS = 5_000;

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
    let lastError = "";
    // The relayer's own Sui RPC gets throttled during SEAL encryption and the
    // job dies with "seal encrypt failed … RpcError: Too Many Requests". The
    // memory is gone, after the user was already told it was saved, so a failed
    // job is resubmitted rather than reported as lost. Observed 2026-09-21.
    for (let attempt = 1; attempt <= WRITE_ATTEMPTS; attempt++) {
      let jobId: string | null = accepted.job_id;
      if (attempt > 1) {
        try {
          const again = limiter ? await runLimited(limiter, accept) : await accept();
          jobId = again.job_id;
        } catch (err) {
          lastError = err instanceof Error ? err.message : String(err);
          jobId = null;
        }
      }
      if (!jobId) break;

      try {
        const id = jobId;
        const wait = () => client.waitForRememberJob(id, { timeoutMs, pollIntervalMs: 2_000 });
        // waitForRememberJob resolves with the stored memory and throws when
        // the job failed or timed out.
        const done = limiter ? await runLimited(limiter, wait) : await wait();
        if (done.blob_id) {
          return { status: "stored" as const, blobId: done.blob_id, attempts: attempt };
        }
        lastError = "job completed without a blob id";
      } catch (err) {
        lastError = err instanceof Error ? err.message : String(err);
      }

      if (attempt < WRITE_ATTEMPTS) {
        await new Promise((r) => setTimeout(r, WRITE_RETRY_BASE_MS * 2 ** (attempt - 1)));
      }
    }
    return { status: "failed" as const, blobId: null, error: lastError, attempts: WRITE_ATTEMPTS };
  })();
  // A rejection is impossible above, but never leave an unobserved promise.
  settled.catch(() => {});

  return { status: "accepted", jobId: accepted.job_id, settled };
}
