/**
 * Three real numbers, or nothing.
 *
 * Written rather than taken from a block: every stats block in the library is a
 * full-viewport marketing section built around percentages or invented figures,
 * and gutting one down to a strip of three counts at this density would have
 * left none of it behind.
 *
 * The numbers come from the same query `bun run evidence` uses, counting only
 * memories that actually landed on Walrus. If the request fails the strip does
 * not render: a front page that guesses at its own evidence is worse than one
 * that shows none.
 */
import { useEffect, useState } from "react";
import { API_URL } from "@/lib/api";

interface Stats {
  memories: number;
  people: number;
  accountId: string;
  network: string;
}

export function LiveStats() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetch(`${API_URL}/api/stats`)
      .then((r) => (r.ok ? (r.json() as Promise<Stats>) : null))
      .then((d) => {
        if (!cancelled && d && typeof d.memories === "number") setStats(d);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  if (!stats) return null;

  return (
    <dl className="flex flex-wrap items-baseline gap-x-6 gap-y-2 rounded-lg border px-3 py-2.5 text-xs">
      <Figure value={stats.memories} label={stats.memories === 1 ? "memory" : "memories"} />
      <Figure value={stats.people} label={stats.people === 1 ? "person" : "people"} />
      <div className="flex items-baseline gap-1.5">
        <dt className="text-muted-foreground">on</dt>
        <dd>
          <a
            className="font-mono underline"
            href={`https://suiscan.xyz/${stats.network}/object/${stats.accountId}`}
            target="_blank"
            rel="noreferrer"
          >
            {stats.accountId.slice(0, 10)}…
          </a>
        </dd>
      </div>
      <p className="text-muted-foreground">
        Counted from blobs that actually landed on Walrus {stats.network}, not from writes hippo
        started.
      </p>
    </dl>
  );
}

function Figure({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex items-baseline gap-1.5">
      <dd className="text-base font-medium tabular-nums">{value.toLocaleString()}</dd>
      <dt className="text-muted-foreground">{label}</dt>
    </div>
  );
}
