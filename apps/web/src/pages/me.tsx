import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router";
import { toast } from "sonner";
import { ChainPanel } from "@/components/chain-panel";
import { type Memory, MemoryList } from "@/components/memory-list";
import { Button } from "@/components/ui/button";
import { WalletSignIn } from "@/components/wallet-signin";
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
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-xl font-semibold">My memory</h1>
        <p className="text-sm text-muted-foreground">
          {owned
            ? "This memory lives in a Walrus Memory account you own on Sui. hippo holds a delegate key you can take away."
            : "Right now hippo keeps your memory under its own account. Type /connect in the chat to move it into an account you own."}
        </p>
      </div>

      <dl className="rounded-lg border divide-y text-sm">
        <Row label="Mode" value={owned ? "owned by you" : "guest"} />
        <Row
          label="This page"
          value={
            me.signedIn ? (
              <span className="flex items-center gap-3">
                signed in with your wallet
                <Button variant="ghost" size="sm" onClick={() => void signOut()}>
                  sign out
                </Button>
              </span>
            ) : (
              "this browser only"
            )
          }
        />
        <Row label="Memory" value={me.memoryEnabled ? "on" : "paused"} />
        <Row label="Stored on Walrus" value={`${stored} of ${memories.length}`} />
        <Row label="Namespace" value={me.namespace ?? "—"} mono />
        {me.walletAddress && (
          <Row label="Wallet" value={`${me.walletAddress.slice(0, 14)}…`} mono />
        )}
      </dl>

      <ChainPanel owned={owned} onError={(m) => toast.error(m)} />

      <MemoryList memories={memories} onError={(m) => toast.error(m)} />

      <section className="space-y-2">
        <h2 className="font-medium">Read the same memory in Claude Code</h2>
        <p className="text-sm text-muted-foreground">
          {owned
            ? "Your memory is not locked inside hippo. Sign in to Walrus Memory from another client with the same wallet and it recalls the same facts."
            : "Once you own the memory, any Walrus Memory client signed in with your wallet reads the same facts."}
        </p>
        <ol className="space-y-1">
          {CLAUDE_CODE_STEPS.map((s) => (
            <li key={s} className="rounded bg-muted px-2 py-1 font-mono text-xs">
              {s}
            </li>
          ))}
        </ol>
      </section>

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

      <section className="space-y-1 text-sm text-muted-foreground">
        <h2 className="font-medium text-foreground">Commands</h2>
        <p>
          In the chat: <code>/memory</code> lists what hippo remembers, <code>/memory search</code>{" "}
          reads it back, <code>/memory forget</code> makes it unrecallable, <code>/proof</code>{" "}
          shows the blobs behind the last answer, <code>/link</code> shares this memory with another
          channel, <code>/disconnect</code> revokes hippo on chain.
        </p>
      </section>
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 px-3 py-2">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={mono ? "font-mono text-xs" : ""}>{value}</dd>
    </div>
  );
}
