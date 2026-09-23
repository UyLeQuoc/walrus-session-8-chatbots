/**
 * A ceiling the caller cannot choose for itself.
 *
 * `checkRate` throttles per person, and a person is whoever the request says it
 * is: `x-hippo-guest` is a UUID the browser generates, and any well-formed one
 * that has not been seen before creates a new person with a fresh budget. Two
 * invented ids were used to confirm it against production, each getting a
 * working session of its own.
 *
 * That matters because the model budget is a fixed one dollar, roughly 2,300
 * turns, and the URL is about to appear in an article and a public post. A loop
 * sending a new UUID each time would empty it in minutes and end the real-use
 * week without anything looking broken.
 *
 * So this counts requests per client address, which a caller cannot mint. It is
 * in memory on purpose: the service runs one replica, because Telegram long
 * polling must not run twice, so there is nothing to share state with. If that
 * ever changes this has to move into Postgres or it becomes per-replica.
 */
const PER_MINUTE = 30;
const PER_HOUR = 200;

interface Bucket {
  hits: number[];
}

const buckets = new Map<string, Bucket>();
const HOUR_MS = 60 * 60 * 1000;
const MINUTE_MS = 60 * 1000;

/** Stops the map growing without bound on a long-lived process. */
function sweep(now: number): void {
  for (const [key, bucket] of buckets) {
    bucket.hits = bucket.hits.filter((t) => now - t < HOUR_MS);
    if (bucket.hits.length === 0) buckets.delete(key);
  }
}

let lastSweep = 0;

export interface IpDecision {
  allowed: boolean;
  message: string;
  retryAfterSeconds: number;
}

/**
 * The address to count against. Railway and Vercel both front the service, so
 * the socket address is a proxy; the left-most entry of `x-forwarded-for` is
 * the client. It is spoofable in general, which is why this is a ceiling on top
 * of the per-person limit rather than a replacement for it.
 */
export function clientAddress(headers: { get(name: string): string | null | undefined }): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return headers.get("x-real-ip") ?? "unknown";
}

export function checkAddress(address: string, now = Date.now()): IpDecision {
  if (now - lastSweep > MINUTE_MS) {
    sweep(now);
    lastSweep = now;
  }

  const bucket = buckets.get(address) ?? { hits: [] };
  bucket.hits = bucket.hits.filter((t) => now - t < HOUR_MS);

  const lastMinute = bucket.hits.filter((t) => now - t < MINUTE_MS).length;
  if (lastMinute >= PER_MINUTE) {
    return {
      allowed: false,
      message: "That is a lot of requests from one place. Give it a minute.",
      retryAfterSeconds: 60,
    };
  }
  if (bucket.hits.length >= PER_HOUR) {
    return {
      allowed: false,
      message: "That is a lot of requests from one place. Try again a bit later.",
      retryAfterSeconds: 600,
    };
  }

  bucket.hits.push(now);
  buckets.set(address, bucket);
  return { allowed: true, message: "", retryAfterSeconds: 0 };
}

/** Testing only. */
export function resetAddressLimits(): void {
  buckets.clear();
  lastSweep = 0;
}
