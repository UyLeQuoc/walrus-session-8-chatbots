import { useCurrentAccount } from "@mysten/dapp-kit";
import type { ReactNode } from "react";
import { Link } from "react-router";
import { toast } from "sonner";
import { useShellTitle } from "@/app/shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { ChainPanel } from "@/features/me/chain-panel";
import { ExportPanel } from "@/features/me/export-panel";
import { Hash } from "@/features/me/hash";
import { MemoryList } from "@/features/me/memory-list";
import { TeamPanel } from "@/features/me/team-panel";
import { useMe } from "@/features/me/use-me";
import { WalletSignIn } from "@/features/me/wallet-signin";
import { usePageMeta } from "@/hooks/use-page-meta";

const PAGE_META = {
  title: "My memory · hippo",
  description:
    "What hippo remembers about you, where it lives on Walrus and Sui, and the controls to export, hide or revoke it.",
  path: "/me",
  index: false,
};

export function MePage() {
  const { me, memories, error, load, signOut } = useMe();
  const account = useCurrentAccount();
  const linked = Boolean(me?.walletAddress) || Boolean(account);
  useShellTitle("My memory");
  usePageMeta(PAGE_META);

  if (!me) {
    return <p className="px-4 py-6 text-sm text-muted-foreground">{error || "Loading…"}</p>;
  }

  if (me.mode === "anonymous") {
    return (
      <Page>
        <Empty>
          <EmptyHeader>
            <EmptyTitle>Nothing remembered yet</EmptyTitle>
            <EmptyDescription>
              Say something in the <Link to="/">chat</Link> first and hippo will start remembering
              you.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
        {linked ? null : <WalletSignIn onSignedIn={load} />}
      </Page>
    );
  }

  const owned = me.mode === "owned";
  const stored = memories.filter((m) => m.status === "stored").length;

  return (
    <Page>
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={owned ? "accent" : "outline"}>{owned ? "you own this" : "guest"}</Badge>
          <Badge variant="outline">{me.memoryEnabled ? "remembering" : "paused"}</Badge>
          <span className="text-sm text-muted-foreground">
            {stored} of {memories.length} on Walrus
          </span>
          {me.namespace ? (
            <span className="min-w-0 max-w-xs flex-1 text-sm text-muted-foreground">
              <Hash value={me.namespace} label="namespace" />
            </span>
          ) : null}
          {me.signedIn ? (
            <Button variant="outline" className="ml-auto" onClick={() => void signOut()}>
              Sign out
            </Button>
          ) : null}
        </div>
        {owned ? null : (
          <p className="text-sm text-muted-foreground">
            Right now hippo keeps your memory under its own account.
          </p>
        )}
        {stored > 0 ? <ExportPanel onError={(message) => toast.error(message)} /> : null}
      </div>

      {!me.signedIn && !linked ? <WalletSignIn onSignedIn={load} /> : null}

      <div className="grid gap-6 md:grid-cols-2">
        <ChainPanel owned={owned} onError={(message) => toast.error(message)} />
        <Card>
          <CardHeader>
            <CardTitle>Storage</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {stored} of {memories.length} on Walrus.
            </p>
          </CardContent>
        </Card>
      </div>

      <TeamPanel onError={(message) => toast.error(message)} />

      <MemoryList memories={memories} onError={(message) => toast.error(message)} onChange={load} />
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
