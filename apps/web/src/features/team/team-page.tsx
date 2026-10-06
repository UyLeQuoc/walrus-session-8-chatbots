import type { ReactNode } from "react";
import { Link } from "react-router";
import { useShellTitle } from "@/app/shell";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { TeamAdd } from "@/features/team/team-add";
import { TeamHeader } from "@/features/team/team-header";
import { TeamLeave } from "@/features/team/team-leave";
import { TeamSearch } from "@/features/team/team-search";
import { TeamShared } from "@/features/team/team-shared";
import { TeamStart } from "@/features/team/team-start";
import { useTeamPage } from "@/features/team/use-team-page";
import { usePageMeta } from "@/hooks/use-page-meta";

const PAGE_META = {
  title: "Team · hippo",
  description:
    "Start or join a team, add what everyone in it should recall, and search what the team shares.",
  path: "/team",
  index: false,
};

export function TeamPage() {
  const { team, known, error, invite, created, joined, remembered, left } = useTeamPage();
  useShellTitle("Team");
  usePageMeta(PAGE_META);

  if (team === undefined) {
    return (
      <Page>
        {error ? (
          <p className="text-sm text-muted-foreground">{error}</p>
        ) : (
          <div className="flex flex-col gap-6" aria-busy="true">
            <Skeleton className="h-28 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
        )}
      </Page>
    );
  }

  if (team === null && !known) {
    return (
      <Page>
        <Empty>
          <EmptyHeader>
            <EmptyTitle>No team yet</EmptyTitle>
            <EmptyDescription>
              Say something in the <Link to="/">chat</Link> first. Once hippo knows you, you can
              start a team here or join one with an invite code.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      </Page>
    );
  }

  if (team === null) {
    return (
      <Page>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <TeamStart onCreated={created} onJoined={joined} />
      </Page>
    );
  }

  return (
    <Page>
      <TeamHeader
        team={team}
        invite={invite.invite}
        inviteBusy={invite.busy}
        inviteError={invite.error}
        onInvite={() => void invite.create()}
      />
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-2">
        <TeamAdd onRemembered={remembered} />
        <TeamSearch />
      </div>
      <TeamShared memories={team.memories} error={error} />
      <TeamLeave name={team.name} onLeft={left} />
    </Page>
  );
}

function Page({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto flex min-h-0 w-full max-w-5xl flex-1 flex-col gap-6 overflow-y-auto px-4 py-6">
      {children}
    </div>
  );
}
