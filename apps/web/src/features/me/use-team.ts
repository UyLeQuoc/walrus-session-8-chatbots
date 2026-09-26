import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

export interface TeamMemory {
  id: string;
  type: string;
  status: "pending" | "stored" | "failed";
  createdAt: string;
  blobId: string | null;
  explorerUrl: string | null;
  mine: boolean;
}

export interface Team {
  name: string;
  memberCount: number;
  memories: TeamMemory[];
}

export interface TeamInvite {
  code: string;
  expiresInMinutes: number;
}

async function post<T>(path: string): Promise<T> {
  const res = await apiFetch(path, { method: "POST" });
  const body = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) throw new Error(body.error ?? `That failed (${res.status}).`);
  return body;
}

export function useTeam(onError: (message: string) => void) {
  const [team, setTeam] = useState<Team | null | undefined>(undefined);
  const [invite, setInvite] = useState<TeamInvite | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    void apiFetch("/api/me/team")
      .then((r) => r.json() as Promise<{ team?: Team | null }>)
      .then((d) => setTeam(d?.team && Array.isArray(d.team.memories) ? d.team : null))
      .catch(() => setTeam(null));
  }, []);

  useEffect(load, [load]);

  const run = useCallback(
    async (fn: () => Promise<void>): Promise<boolean> => {
      setBusy(true);
      try {
        await fn();
        return true;
      } catch (err) {
        onError(err instanceof Error ? err.message : "That failed.");
        return false;
      } finally {
        setBusy(false);
      }
    },
    [onError],
  );

  const createInvite = useCallback(() => {
    void run(async () => setInvite(await post<TeamInvite>("/api/me/team/invite")));
  }, [run]);

  const leave = useCallback(
    () =>
      run(async () => {
        await post("/api/me/team/leave");
        setInvite(null);
        load();
      }),
    [load, run],
  );

  return { team, invite, busy, createInvite, leave };
}
