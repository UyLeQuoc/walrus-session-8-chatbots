import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChainPanel } from "@/features/me/chain-panel";
import { CopyButton } from "@/features/me/copy-button";
import { ExportPanel } from "@/features/me/export-panel";
import { Hash } from "@/features/me/hash";
import { type Memory, MemoryList } from "@/features/me/memory-list";
import { Section } from "@/features/me/section";
import { TeamPanel } from "@/features/me/team-panel";
import { WalletSignIn } from "@/features/me/wallet-signin";
import { API_URL, forgetSession, identityHeaders } from "@/lib/api";

interface Me {
  mode: "anonymous" | "guest" | "owned";
  signedIn?: boolean;
  personId?: string;
  memoryEnabled?: boolean;
  accountId?: string | null;
  walletAddress?: string | null;
  namespace?: string;
  surveyUrl?: string | null;
}

/** The commands as a list. They were a paragraph of inline code, unscannable. */
const COMMANDS: Array<[string, string]> = [
  ["/memory", "what hippo remembers about you"],
  ["/memory search", "read those memories back from Walrus"],
  ["/memory forget <blob>", "stop hippo using one memory"],
  ["/memory forget all", "make everything unrecallable"],
  ["/proof", "the blobs behind the last answer"],
  ["/export", "your memory as a file you keep"],
  ["/team", "share a memory with a few people"],
  ["/link", "use the same memory on another channel"],
  ["/connect", "own the memory in your own account"],
  ["/disconnect", "revoke hippo's access on chain"],
  ["/privacy", "what is stored, where, and for how long"],
];

const CLAUDE_CODE_STEPS = [
  "/plugin marketplace add MystenLabs/MemWal",
  "/plugin install memwal@memwal-plugins",
  "restart, then memwal_login with the same wallet",
  'ask it: "recall what you know about me", namespace hippo',
];

export function MePage() {
  const [me, setMe] = useState<Me | null>(null);
  const [memories, setMemories] = useState<Memory[]>([]);

  const load = useCallback(() => {
    void fetch(`${API_URL}/api/me`, { credentials: "include", headers: identityHeaders() })
      .then((r) => r.json() as Promise<Me>)
      .then((d) => setMe(d?.mode ? d : { mode: "anonymous" }))
      .catch(() => setMe({ mode: "anonymous" }));
    void fetch(`${API_URL}/api/me/memories`, { credentials: "include", headers: identityHeaders() })
      .then((r) => r.json() as Promise<{ memories?: Memory[] }>)
      // An unexpected shape must not blank the page: without the fallback,
      // `setMemories(undefined)` makes the next render throw on `.filter`.
      .then((d) => setMemories(Array.isArray(d.memories) ? d.memories : []))
      .catch(() => setMemories([]));
  }, []);

  useEffect(load, [load]);

  const signOut = useCallback(async () => {
    await fetch(`${API_URL}/api/auth/signout`, {
      method: "POST",
      credentials: "include",
      headers: identityHeaders(),
    });
    forgetSession();
    load();
  }, [load]);

  if (!me) return <p className="text-sm text-muted-foreground">Loading…</p>;

  if (me.mode === "anonymous") {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <h1 className="text-xl font-semibold">My memory</h1>
          <p className="text-sm text-muted-foreground">
            Say something in the{" "}
            <Link to="/" className="underline">
              chat
            </Link>{" "}
            first and hippo will start remembering you.
          </p>
        </div>
        <WalletSignIn onSignedIn={load} />
      </div>
    );
  }

  const owned = me.mode === "owned";
  const stored = memories.filter((m) => m.status === "stored").length;

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold tracking-tight">My memory</h1>
        <p className="text-sm text-muted-foreground">
          {owned
            ? "This memory lives in a Walrus Memory account you own on Sui. hippo holds a delegate key you can take away."
            : "Right now hippo keeps your memory under its own account. Move it into one you own whenever you like."}
        </p>
      </div>

      {/*
        A row, not a five-line table. The old version gave the namespace, which
        a reader can do nothing with, more visual weight than the number of
        memories that actually reached Walrus.
      */}
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <Badge variant={owned ? "accent" : "outline"}>{owned ? "you own this" : "guest"}</Badge>
        <Badge variant="outline">{me.memoryEnabled ? "remembering" : "paused"}</Badge>
        <span className="text-muted-foreground">
          <span className="font-medium text-foreground">{stored}</span> of {memories.length} written
          to Walrus
        </span>
        {me.namespace && (
          <span className="flex items-center gap-1.5 text-muted-foreground">
            in <Hash value={me.namespace} label="namespace" head={16} />
          </span>
        )}
        {me.signedIn ? (
          <Button variant="ghost" size="sm" onClick={() => void signOut()}>
            sign out
          </Button>
        ) : (
          <span className="text-muted-foreground">this browser only</span>
        )}
      </div>

      <ChainPanel owned={owned} onError={(m) => toast.error(m)} />

      <MemoryList memories={memories} onError={(m) => toast.error(m)} onChange={load} />

      {stored > 0 && <ExportPanel onError={(m) => toast.error(m)} />}

      <TeamPanel onError={(m) => toast.error(m)} />

      <Section
        title="Read the same memory in Claude Code"
        description={
          owned
            ? "Your memory is not locked inside hippo. Sign in to Walrus Memory from another client with the same wallet and it recalls the same facts."
            : "Once you own the memory, any Walrus Memory client signed in with your wallet reads the same facts."
        }
      >
        <ol className="space-y-1.5">
          {CLAUDE_CODE_STEPS.map((step) => (
            <li key={step} className="flex items-center gap-2 rounded bg-muted px-2 py-1">
              <code className="min-w-0 flex-1 font-mono text-xs [overflow-wrap:anywhere]">
                {step}
              </code>
              <CopyButton value={step} label="step" />
            </li>
          ))}
        </ol>
      </Section>

      {!me.signedIn && <WalletSignIn onSignedIn={load} />}

      {me.surveyUrl && (
        <p className="text-sm text-muted-foreground">
          Used hippo for a bit?{" "}
          <a className="underline" href={me.surveyUrl} target="_blank" rel="noreferrer">
            Telling me how it went
          </a>{" "}
          helps more than you would think.
        </p>
      )}

      <Section title="Commands" description="Type these in the chat on any channel.">
        <dl className="grid gap-x-4 gap-y-1.5 sm:grid-cols-[10rem_1fr]">
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
    </div>
  );
}
