/**
 * What hippo wrote, with a way to narrow it down.
 *
 * Two different operations that look like one. Filtering by type is local: the
 * page already has every row. Searching is not, because memory text is never
 * stored in Postgres, only blob ids and dates, so the words have to come back
 * from Walrus through a recall. That is the same call `/memory search` makes,
 * and it costs relayer budget, so it happens on submit rather than on keystroke.
 */
import { type FormEvent, useCallback, useMemo, useState } from "react";
import { Hash } from "@/components/hash";
import { Section } from "@/components/section";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { API_URL, identityHeaders } from "@/lib/api";

export interface Memory {
  id: string;
  type: string;
  status: "pending" | "stored" | "failed";
  channel: string;
  createdAt: string;
  blobId: string | null;
  expiresAt: string | null;
  ciphertextUrl: string | null;
  explorerUrl: string | null;
}

interface Hit {
  text: string;
  type: string | null;
  relevance: number;
  blobId: string;
  explorerUrl: string;
}

function daysUntil(iso: string): number {
  return Math.round((new Date(iso).getTime() - Date.now()) / 86_400_000);
}

/**
 * "2 days ago", not the same date five times.
 *
 * Every row on this page carried an identical absolute date, which told a
 * reader nothing and made the rows indistinguishable from each other.
 */
export function ago(iso: string): string {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return days === 1 ? "yesterday" : `${days}d ago`;
}

export function MemoryList({
  memories,
  onError,
}: {
  memories: Memory[];
  onError: (m: string) => void;
}) {
  const [type, setType] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<Hit[] | null>(null);
  const [searching, setSearching] = useState(false);

  const types = useMemo(() => [...new Set(memories.map((m) => m.type))].sort(), [memories]);
  /** The one expiry figure worth stating, said once rather than on every row. */
  const soonest = useMemo(() => {
    const days = memories.filter((m) => m.expiresAt).map((m) => daysUntil(m.expiresAt as string));
    return days.length ? Math.min(...days) : null;
  }, [memories]);
  const shown = useMemo(
    () => (type ? memories.filter((m) => m.type === type) : memories),
    [memories, type],
  );

  const search = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      const q = query.trim();
      if (!q) {
        setHits(null);
        return;
      }
      setSearching(true);
      try {
        const res = await fetch(`${API_URL}/api/me/search?q=${encodeURIComponent(q)}`, {
          credentials: "include",
          headers: identityHeaders(),
        });
        const body = (await res.json()) as { results?: Hit[]; error?: string };
        if (!res.ok) throw new Error(body.error ?? "Search failed.");
        setHits(body.results ?? []);
      } catch (err) {
        onError(err instanceof Error ? err.message : "Search failed.");
      } finally {
        setSearching(false);
      }
    },
    [onError, query],
  );

  return (
    <Section
      title="What hippo wrote"
      description={
        <>
          Each one is an encrypted blob on Walrus. Anyone can download the ciphertext; only your
          account can read it.
          {soonest !== null && <> Storage runs out in about {soonest} days.</>}
        </>
      }
    >
      {/*
        Search leads, because it is the only way to read a memory. The text is
        never stored in Postgres, so the list below can show when and where a
        memory was written and nothing of what it says. Putting the list first
        and the search underneath had that backwards.
      */}
      <form className="flex gap-2" onSubmit={(e) => void search(e)}>
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Read them back: what do you know about me?"
          aria-label="Search your memory"
        />
        <Button type="submit" variant="outline" disabled={searching}>
          {searching ? "Reading…" : "Search"}
        </Button>
        {hits !== null && (
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              setHits(null);
              setQuery("");
            }}
          >
            Clear
          </Button>
        )}
      </form>

      {searching && <Skeleton className="h-16 w-full" />}

      {hits !== null && !searching && (
        <div className="space-y-2">
          {hits.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nothing close to that. The words come from Walrus, so a memory that was never written
              cannot be found here.
            </p>
          ) : (
            <ul className="divide-y rounded-lg border text-sm">
              {hits.map((h) => (
                <li key={h.blobId} className="space-y-1 px-3 py-2">
                  <p>{h.text}</p>
                  <p className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    {h.type && <Badge>{h.type}</Badge>}
                    <span>relevance {h.relevance.toFixed(2)}</span>
                    <a className="underline" href={h.explorerUrl} target="_blank" rel="noreferrer">
                      blob
                    </a>
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {hits === null && (
        <>
          <Separator />
          {types.length > 1 && (
            <div className="flex flex-wrap gap-1.5">
              <FilterChip label="all" active={type === null} onClick={() => setType(null)} />
              {types.map((t) => (
                <FilterChip
                  key={t}
                  label={t}
                  active={type === t}
                  onClick={() => setType(type === t ? null : t)}
                />
              ))}
            </div>
          )}

          {shown.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {memories.length === 0 ? "Nothing yet." : `No ${type} memories.`}
            </p>
          ) : (
            <ul className="divide-y rounded-lg border text-sm">
              {shown.map((m) => (
                <li
                  key={m.id}
                  className="group flex flex-wrap items-center justify-between gap-x-3 gap-y-1 px-3 py-2"
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <Badge>{m.type}</Badge>
                    {/* The blob id is the only thing that differs between rows. */}
                    {m.blobId ? (
                      <Hash value={m.blobId} href={m.explorerUrl} label="blob id" head={8} subtle />
                    ) : (
                      <span className="text-xs text-muted-foreground">not written yet</span>
                    )}
                  </span>
                  <span className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span>
                      {ago(m.createdAt)} · {m.channel}
                    </span>
                    {m.status === "stored" ? (
                      <>
                        {/*
                          Only when it is close. Every row carried the same
                          "expires in 209d", which is five repetitions of one
                          fact; the section heading states it once instead.
                        */}
                        {m.expiresAt && daysUntil(m.expiresAt) <= 30 && (
                          <span className="text-destructive">
                            expires in {daysUntil(m.expiresAt)}d
                          </span>
                        )}
                        {m.ciphertextUrl && (
                          <a
                            className="underline"
                            href={m.ciphertextUrl}
                            target="_blank"
                            rel="noreferrer"
                          >
                            ciphertext
                          </a>
                        )}
                      </>
                    ) : (
                      <span>{m.status === "pending" ? "writing to Walrus…" : "write failed"}</span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </Section>
  );
}

function FilterChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={
        active
          ? "rounded border border-transparent bg-primary px-2 py-0.5 text-xs font-medium text-primary-foreground"
          : "rounded border px-2 py-0.5 text-xs text-muted-foreground hover:text-foreground"
      }
    >
      {label}
    </button>
  );
}
