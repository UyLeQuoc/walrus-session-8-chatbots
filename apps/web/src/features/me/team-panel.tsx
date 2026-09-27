/**
 * The team this person is in, on the page that is meant to show everything
 * hippo holds. Team memory used to exist only in chat.
 *
 * Teammates are never named here. A shared memory says only whether you added
 * it: the page is about what hippo holds, not about who said what.
 */
import { useState } from "react";
import { CopyButton } from "@/components/copy-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Hash } from "@/features/me/hash";
import { ago } from "@/features/me/memory";
import { useTeam } from "@/features/me/use-team";

export function TeamPanel({ onError }: { onError: (message: string) => void }) {
  const { team, invite, busy, createInvite, leave } = useTeam(onError);
  const [confirmLeave, setConfirmLeave] = useState(false);

  if (team === undefined) return null;

  if (!team) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Team memory</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            In the chat, <code className="font-mono text-xs">/team new &lt;name&gt;</code> starts
            one and <code className="font-mono text-xs">/team join &lt;code&gt;</code> joins one
            somebody else started.
          </p>
        </CardContent>
      </Card>
    );
  }

  const mine = team.memories.filter((m) => m.mine).length;
  return (
    <Card>
      <CardHeader>
        <CardTitle>Team: {team.name}</CardTitle>
        <CardDescription>
          {team.memberCount} {team.memberCount === 1 ? "member" : "members"}. The shared memory
          lives in hippo's account, so no member owns it yet.
        </CardDescription>
        <Button variant="outline" disabled={busy} onClick={createInvite}>
          Invite
        </Button>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
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
            Nothing shared yet.{" "}
            <code className="font-mono text-xs">/team remember &lt;fact&gt;</code> in the chat adds
            one.
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
                      <Hash value={m.blobId} href={m.explorerUrl} label="blob id" />
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
              disabled={busy}
              onClick={() => {
                void leave().then((left) => {
                  if (left) setConfirmLeave(false);
                });
              }}
            >
              Leave
            </Button>
            <Button variant="ghost" onClick={() => setConfirmLeave(false)}>
              Stay
            </Button>
          </div>
        ) : (
          <Button variant="ghost" onClick={() => setConfirmLeave(true)}>
            Leave the team
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
