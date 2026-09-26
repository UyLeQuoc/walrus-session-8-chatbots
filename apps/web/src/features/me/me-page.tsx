import type { ReactNode } from "react";
import { Link } from "react-router";
import { toast } from "sonner";
import { useShellTitle } from "@/app/shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { ChainPanel } from "@/features/me/chain-panel";
import { CopyButton } from "@/features/me/copy-button";
import { ExportPanel } from "@/features/me/export-panel";
import { Hash } from "@/features/me/hash";
import { MemoryList } from "@/features/me/memory-list";
import { Section } from "@/features/me/section";
import { TeamPanel } from "@/features/me/team-panel";
import { useMe } from "@/features/me/use-me";
import { WalletSignIn } from "@/features/me/wallet-signin";

const COMMANDS: Array<[string, string]> = [
  ["/memory", "what hippo remembers"],
  ["/memory search", "read it back from Walrus"],
  ["/memory forget <blob>", "stop using one memory"],
  ["/memory forget all", "make everything unrecallable"],
  ["/proof", "blobs behind the last answer"],
  ["/export", "download your memory"],
  ["/team", "share a memory"],
  ["/link", "same memory, another channel"],
  ["/connect", "own it in your account"],
  ["/disconnect", "revoke hippo on chain"],
  ["/privacy", "what is stored, and for how long"],
];

const CLAUDE_CODE_STEPS = [
  "/plugin marketplace add MystenLabs/MemWal",
  "/plugin install memwal@memwal-plugins",
  "restart, then memwal_login with the same wallet",
  'ask it: "recall what you know about me", namespace hippo',
];

export function MePage() {
  const { me, memories, error, load, signOut } = useMe();
  useShellTitle("My memory");

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
        <WalletSignIn onSignedIn={load} />
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
            <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Hash value={me.namespace} label="namespace" head={16} />
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
      </div>

      <ChainPanel owned={owned} onError={(m) => toast.error(m)} />

      {!me.signedIn ? (
        <div className="border-t pt-6">
          <WalletSignIn onSignedIn={load} />
        </div>
      ) : null}

      <MemoryList memories={memories} onError={(m) => toast.error(m)} onChange={load} />

      {stored > 0 ? <ExportPanel onError={(m) => toast.error(m)} /> : null}

      <TeamPanel onError={(m) => toast.error(m)} />

      <Section title="Claude Code" description="Same wallet, namespace hippo.">
        <ol className="flex flex-col gap-2">
          {CLAUDE_CODE_STEPS.map((step) => (
            <li key={step} className="flex items-center gap-2">
              <code className="min-w-0 flex-1 font-mono text-xs [overflow-wrap:anywhere]">
                {step}
              </code>
              <CopyButton value={step} label="step" />
            </li>
          ))}
        </ol>
      </Section>

      <Section title="Commands">
        <dl className="grid gap-x-4 gap-y-2 sm:grid-cols-[11rem_1fr]">
          {COMMANDS.map(([cmd, what]) => (
            <div key={cmd} className="contents">
              <dt>
                <code className="font-mono text-xs">{cmd}</code>
              </dt>
              <dd className="text-sm text-muted-foreground">{what}</dd>
            </div>
          ))}
        </dl>
      </Section>

      {me.surveyUrl ? (
        <p className="text-sm text-muted-foreground">
          Used hippo for a bit?{" "}
          <a className="underline" href={me.surveyUrl} target="_blank" rel="noreferrer">
            Tell me how it went
          </a>
          .
        </p>
      ) : null}
    </Page>
  );
}

function Page({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto flex min-h-0 w-full max-w-2xl flex-1 flex-col gap-6 overflow-y-auto px-4 py-6">
      {children}
    </div>
  );
}
