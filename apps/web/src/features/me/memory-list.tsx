/**
 * What hippo wrote, with a way to narrow it down.
 *
 * Two different operations that look like one. Filtering by type is local: the
 * page already has every row. Searching is not, because memory text is never
 * stored in Postgres, only blob ids and dates, so the words have to come back
 * from Walrus through a recall. That is the same call `/memory search` makes,
 * and it costs relayer budget, so it happens on submit rather than on keystroke.
 */
import { type FormEvent, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Hash } from "@/features/me/hash";
import { ago, type Memory } from "@/features/me/memory";
import { Section } from "@/features/me/section";
import { useMemoryActions } from "@/features/me/use-memory-actions";

export type { Memory };

function daysUntil(iso: string): number {
  return Math.round((new Date(iso).getTime() - Date.now()) / 86_400_000);
}

export function MemoryList({
  memories,
  onError,
  onChange,
}: {
  memories: Memory[];
  onError: (m: string) => void;
  /** Called after a memory is hidden or unhidden, so the page can reload. */
  onChange?: () => void;
}) {
  const [type, setType] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const { hits, searching, toggling, search, toggle, clear } = useMemoryActions(onError, onChange);

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

  const onSearch = (e: FormEvent) => {
    e.preventDefault();
    void search(query);
  };

  return (
    <Section
      title="Memories"
      description={soonest !== null ? `Storage runs out in about ${soonest} days.` : undefined}
    >
      {/*
        Search leads, because it is the only way to read a memory. The text is
        never stored in Postgres, so the list below can show when and where a
        memory was written and nothing of what it says. Putting the list first
        and the search underneath had that backwards.
      */}
      <form className="flex gap-2" onSubmit={onSearch}>
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
              clear();
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
            <p className="text-sm text-muted-foreground">Nothing close to that.</p>
          ) : (
            <ul className="divide-y rounded-lg border text-sm">
              {hits.map((h) => (
                <li key={h.blobId} className="space-y-1 px-3 py-2">
                  <p>{h.text}</p>
                  <p className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    {h.type && <Badge>{h.type}</Badge>}
                    {h.mine === false && <Badge variant="outline">team</Badge>}
                    <span>relevance {h.relevance.toFixed(2)}</span>
                    <a className="underline" href={h.explorerUrl} target="_blank" rel="noreferrer">
                      blob
                    </a>
                    {h.mine !== false && (
                      <Button
                        type="button"
                        variant="ghost"
                        disabled={toggling === h.blobId}
                        onClick={() => void toggle(h.blobId, true)}
                      >
                        stop using this
                      </Button>
                    )}
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
                  className={`group flex flex-wrap items-center justify-between gap-x-3 gap-y-1 px-3 py-2 ${m.hidden ? "opacity-60" : ""}`}
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <Badge>{m.type}</Badge>
                    {m.hidden && <Badge variant="outline">hidden</Badge>}
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
                        {m.blobId && (
                          <Button
                            type="button"
                            variant="ghost"
                            disabled={toggling === m.blobId}
                            onClick={() => m.blobId && void toggle(m.blobId, !m.hidden)}
                          >
                            {m.hidden ? "use again" : "hide"}
                          </Button>
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
    <Button
      type="button"
      variant={active ? "default" : "outline"}
      onClick={onClick}
      aria-pressed={active}
    >
      {label}
    </Button>
  );
}
