import { useEffect, useState } from "react";
import { Link } from "react-router";
import { API_URL } from "@/lib/api";

interface Me {
  mode: "anonymous" | "guest" | "owned";
  personId?: string;
  memoryEnabled?: boolean;
  accountId?: string | null;
  walletAddress?: string | null;
  namespace?: string;
}

const CLAUDE_CODE_STEPS = [
  "/plugin marketplace add MystenLabs/MemWal",
  "/plugin install memwal@memwal-plugins",
  "restart, then run memwal_login and sign in with the same wallet",
  'ask it: "recall what you know about me in the hippo namespace"',
];

export function MePage() {
  const [me, setMe] = useState<Me | null>(null);

  useEffect(() => {
    void fetch(`${API_URL}/api/me`, { credentials: "include" })
      .then((r) => r.json() as Promise<Me>)
      .then(setMe)
      .catch(() => setMe({ mode: "anonymous" }));
  }, []);

  if (!me) return <p className="text-sm text-muted-foreground">Loading…</p>;

  if (me.mode === "anonymous") {
    return (
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
    );
  }

  const owned = me.mode === "owned";

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-xl font-semibold">My memory</h1>
        <p className="text-sm text-muted-foreground">
          {owned
            ? "This memory lives in a Walrus Memory account you own on Sui. hippo holds a delegate key you can revoke at any time."
            : "Right now hippo keeps your memory under its own account. Type /connect in the chat to move it into an account you own."}
        </p>
      </div>

      <dl className="rounded-lg border divide-y text-sm">
        <Row label="Mode" value={owned ? "owned by you" : "guest"} />
        <Row label="Memory" value={me.memoryEnabled ? "on" : "paused"} />
        <Row label="Namespace" value={me.namespace ?? "—"} mono />
        {me.accountId && (
          <Row
            label="Account"
            value={
              <a
                className="font-mono underline"
                href={`https://suiscan.xyz/mainnet/object/${me.accountId}`}
                target="_blank"
                rel="noreferrer"
              >
                {me.accountId.slice(0, 14)}…
              </a>
            }
          />
        )}
        {me.walletAddress && <Row label="Wallet" value={me.walletAddress} mono />}
      </dl>

      <section className="space-y-2">
        <h2 className="font-medium">Read the same memory in Claude Code</h2>
        <p className="text-sm text-muted-foreground">
          {owned
            ? "Your memory is not locked inside hippo. Sign in to Walrus Memory from any other client with the same wallet and it recalls the same facts."
            : "Once you own the memory, any Walrus Memory client signed in with your wallet reads the same facts."}
        </p>
        <ol className="space-y-1 text-sm">
          {CLAUDE_CODE_STEPS.map((s) => (
            <li key={s} className="font-mono text-xs bg-muted rounded px-2 py-1">
              {s}
            </li>
          ))}
        </ol>
      </section>

      <section className="space-y-1 text-sm text-muted-foreground">
        <h2 className="font-medium text-foreground">Commands</h2>
        <p>
          In the chat: <code>/memory</code> lists what hippo remembers, <code>/memory search</code>{" "}
          reads it back, <code>/memory forget</code> makes it unrecallable, <code>/proof</code>{" "}
          shows the blobs behind the last answer, <code>/disconnect</code> revokes hippo on chain.
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
