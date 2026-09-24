/**
 * The team this person is in, on the page that is meant to show everything
 * hippo holds. Team memory used to exist only in chat.
 *
 * Teammates are never named here. A shared memory says only whether you added
 * it: the page is about what hippo holds, not about who said what.
 */
import { useCallback, useEffect, useState } from "react";
import { CopyButton } from "@/components/copy-button";
import { Hash } from "@/components/hash";
import { ago } from "@/components/memory-list";
import { Section } from "@/components/section";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { API_URL, identityHeaders } from "@/lib/api";

interface TeamMemory {
  id: string;
  type: string;
  status: "pending" | "stored" | "failed";
  createdAt: string;
  blobId: string | null;
  explorerUrl: string | null;
  mine: boolean;
}

interface Team {
  name: string;
  memberCount: number;
  memories: TeamMemory[];
}

async function post<T>(path: string): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    method: "POST",
    credentials: "include",
    headers: identityHeaders(),
  });
  const body = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) throw new Error(body.error ?? `That failed (${res.status}).`);
  return body;
}

export function TeamPanel({ onError }: { onError: (message: string) => void }) {
  const [team, setTeam] = useState<Team | null | undefined>(undefined);
  const [invite, setInvite] = useState<{ code: string; expiresInMinutes: number } | null>(null);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    void fetch(`${API_URL}/api/me/team`, { credentials: "include", headers: identityHeaders() })
      .then((r) => r.json() as Promise<{ team?: Team | null }>)
      // A shape we did not expect is "no team", never a crash on first paint.
      .then((d) => setTeam(d?.team && Array.isArray(d.team.memories) ? d.team : null))
      .catch(() => setTeam(null));
  }, []);
  useEffect(load, [load]);

  const act = async (fn: () => Promise<void>) => {
    setBusy(true);
    try {
      await fn();
    } catch (err) {
      onError(err instanceof Error ? err.message : "That failed.");
    } finally {
      setBusy(false);
    }
  };

  if (team === undefined) return null;

  if (!team) {
    return (
      <Section
        title="Team memory"
        description="Share a memory with a few people. Only what you add on purpose is shared; your own memory stays yours."
      >
        <p className="text-sm text-muted-foreground">
          In the chat, <code className="font-mono text-xs">/team new &lt;name&gt;</code> starts one
          and <code className="font-mono text-xs">/team join &lt;code&gt;</code> joins one somebody
          else started.
        </p>
      </Section>
    );
  }

  const mine = team.memories.filter((m) => m.mine).length;
  return (
    <Section
      title={`Team: ${team.name}`}
      description={`${team.memberCount} ${team.memberCount === 1 ? "member" : "members"}. Everyone in it recalls what the team holds; what you say in ordinary conversation stays yours. The shared memory lives in hippo's account, so no member owns it yet.`}
      action={
        <Button
          variant="outline"
          size="sm"
          disabled={busy}
          onClick={() =>
            void act(async () =>
              setInvite(
                await post<{ code: string; expiresInMinutes: number }>("/api/me/team/invite"),
              ),
            )
          }
        >
          Invite
        </Button>
      }
    >
      {invite && (
        <p className="flex flex-wrap items-center gap-2 text-sm">
          <code className="rounded bg-muted px-2 py-0.5 font-mono">{invite.code}</code>
          <CopyButton value={`/team join ${invite.code}`} label="join command" />
          <span className="text-muted-foreground">
            works once, for {invite.expiresInMinutes} minutes, on any channel
          </span>
        </p>
      )}

      {team.memories.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nothing shared yet. <code className="font-mono text-xs">/team remember &lt;fact&gt;</code>{" "}
          in the chat adds one.
        </p>
      ) : (
        <>
          <p className="text-xs text-muted-foreground">
            {team.memories.length} shared, {mine} added by you.
          </p>
          <ul className="divide-y rounded-lg border text-sm">
            {team.memories.map((m) => (
              <li
                key={m.id}
                className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 px-3 py-2"
              >
                <span className="flex min-w-0 items-center gap-2">
                  <Badge>{m.type}</Badge>
                  {m.blobId ? (
                    <Hash value={m.blobId} href={m.explorerUrl} label="blob id" head={8} subtle />
                  ) : (
                    <span className="text-xs text-muted-foreground">
                      {m.status === "failed" ? "never reached Walrus" : "not written yet"}
                    </span>
                  )}
                </span>
                <span className="text-xs text-muted-foreground">
                  {ago(m.createdAt)} · {m.mine ? "you" : "a teammate"}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}

      {confirmLeave ? (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span>
            Leave? What you added stays with the team: a memory on Walrus cannot be deleted.
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={busy}
            onClick={() =>
              void act(async () => {
                await post("/api/me/team/leave");
                setConfirmLeave(false);
                setInvite(null);
                load();
              })
            }
          >
            Leave
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setConfirmLeave(false)}>
            Stay
          </Button>
        </div>
      ) : (
        <Button variant="ghost" size="sm" onClick={() => setConfirmLeave(true)}>
          Leave the team
        </Button>
      )}
    </Section>
  );
}
