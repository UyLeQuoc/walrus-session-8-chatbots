import { useCallback, useState } from "react";
import { apiFetch, errorMessage } from "@/lib/api";

export interface MemoryHit {
  mine?: boolean;
  text: string;
  type: string | null;
  relevance: number;
  blobId: string;
  explorerUrl: string;
}

export function useMemoryActions(onError: (message: string) => void, onChange?: () => void) {
  const [hits, setHits] = useState<MemoryHit[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [toggling, setToggling] = useState<string | null>(null);

  const search = useCallback(
    async (query: string) => {
      const q = query.trim();
      if (!q) {
        setHits(null);
        return;
      }
      setSearching(true);
      try {
        const res = await apiFetch(`/api/me/search?q=${encodeURIComponent(q)}`);
        const body = (await res.json()) as { results?: MemoryHit[]; error?: string };
        if (!res.ok) throw new Error(body.error ?? "Search failed.");
        setHits(body.results ?? []);
      } catch (err) {
        onError(err instanceof Error ? err.message : "Search failed.");
      } finally {
        setSearching(false);
      }
    },
    [onError],
  );

  const toggle = useCallback(
    async (blobId: string, hidden: boolean) => {
      setToggling(blobId);
      try {
        const res = await apiFetch("/api/me/memories/visibility", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ blobId, hidden }),
        });
        if (!res.ok) throw new Error(await errorMessage(res, `That failed (${res.status}).`));
        if (hidden) setHits((current) => current?.filter((hit) => hit.blobId !== blobId) ?? null);
        onChange?.();
      } catch (err) {
        onError(err instanceof Error ? err.message : "That failed.");
      } finally {
        setToggling(null);
      }
    },
    [onChange, onError],
  );

  const clear = useCallback(() => setHits(null), []);

  return { hits, searching, toggling, search, toggle, clear };
}
