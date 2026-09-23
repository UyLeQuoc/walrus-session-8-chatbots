/**
 * The account on Sui, read from the chain, with the keys that can reach it.
 *
 * Everything else on /me is hippo's account of itself. This is the part a user
 * does not have to believe: the object id resolves on an explorer, the delegate
 * list is what the contract enforces, and the revoke button removes an entry
 * from that exact list. Showing our own `delegate_keys` table here would have
 * been easier and would have proved nothing.
 */
import { useCallback, useEffect, useState } from "react";
import { Hash } from "@/components/hash";
import { Section } from "@/components/section";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { API_URL, identityHeaders } from "@/lib/api";

interface Delegate {
  label: string;
  publicKeyHex: string;
  suiAddress: string;
  isHippo: boolean;
}

interface Account {
  accountId: string;
  explorerUrl: string;
  owner?: string;
  ownerUrl?: string | null;
  active?: boolean;
  yours?: boolean;
  unreadable?: boolean;
  delegates?: Delegate[];
}

export function ChainPanel({ owned, onError }: { owned: boolean; onError: (m: string) => void }) {
  const [account, setAccount] = useState<Account | null | undefined>(undefined);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void fetch(`${API_URL}/api/me/account`, {
      credentials: "include",
      headers: identityHeaders(),
    })
      .then((r) => r.json() as Promise<{ account: Account | null }>)
      .then((d) => {
        if (!cancelled) setAccount(d.account ?? null);
      })
      .catch(() => {
        if (!cancelled) setAccount(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const start = useCallback(
    async (kind: "connect" | "disconnect") => {
      setBusy(true);
      try {
        const res = await fetch(`${API_URL}/api/me/${kind}`, {
          method: "POST",
          credentials: "include",
          headers: identityHeaders(),
        });
        const body = (await res.json()) as { url?: string; error?: string };
        if (!res.ok || !body.url) throw new Error(body.error ?? "Could not start that.");
        // Same app, but WEB_BASE_URL is the server's idea of where we live, so
        // follow it rather than guessing a path.
        window.location.assign(body.url);
      } catch (e) {
        setBusy(false);
        onError(e instanceof Error ? e.message : "Could not start that.");
      }
    },
    [onError],
  );

  if (account === undefined) {
    return (
      <Section title="On chain" description="Reading the account from Sui.">
        <Skeleton className="h-4 w-64" />
        <Skeleton className="h-4 w-48" />
      </Section>
    );
  }

  if (account === null) return null;

  return (
    <Section
      title="On chain"
      description={
        account.yours
          ? "This account is yours. hippo appears below as one delegate key, and nothing it does can remove itself from that list."
          : "Your memory currently lives in hippo's own account. Connecting a wallet moves it into one you own."
      }
    >
      <dl className="space-y-2 text-sm">
        <div className="flex items-baseline justify-between gap-4">
          <dt className="text-muted-foreground">Account</dt>
          <dd>
            <Hash
              value={account.accountId}
              href={account.explorerUrl}
              label="account id"
              head={18}
            />
          </dd>
        </div>
        {account.owner && (
          <div className="flex items-baseline justify-between gap-4">
            <dt className="text-muted-foreground">Owner</dt>
            <dd>
              <Hash value={account.owner} href={account.ownerUrl} label="owner" head={18} />
            </dd>
          </div>
        )}
      </dl>

      {account.unreadable ? (
        <p className="text-sm text-muted-foreground">
          The object could not be read from the chain just now. The link above still resolves.
        </p>
      ) : (
        <div className="space-y-2">
          <p className="text-sm font-medium">
            Keys that can read this memory ({account.delegates?.length ?? 0})
          </p>
          <ul className="divide-y rounded-md border text-sm">
            {(account.delegates ?? []).map((d) => (
              <li
                key={d.publicKeyHex}
                className="flex items-center justify-between gap-3 px-3 py-2"
              >
                <span className="flex items-center gap-2">
                  <span>{d.label || "unlabelled"}</span>
                  {d.isHippo && <Badge variant="accent">hippo</Badge>}
                </span>
                <Hash value={d.publicKeyHex} label="public key" head={12} />
              </li>
            ))}
            {(account.delegates?.length ?? 0) === 0 && (
              <li className="px-3 py-2 text-muted-foreground">
                No delegate keys. Nothing but the owner can read this account.
              </li>
            )}
          </ul>
        </div>
      )}

      {owned ? (
        <div className="space-y-1">
          <Button variant="destructive" disabled={busy} onClick={() => void start("disconnect")}>
            {busy ? "Opening…" : "Revoke hippo's access"}
          </Button>
          <p className="text-xs text-muted-foreground">
            Removes hippo's key from the list above, on chain. Takes effect within about a minute.
            Nothing is deleted, and you can grant access again later.
          </p>
        </div>
      ) : (
        <div className="space-y-1">
          <Button disabled={busy} onClick={() => void start("connect")}>
            {busy ? "Opening…" : "Own this memory"}
          </Button>
          <p className="text-xs text-muted-foreground">
            Signs one transaction to create your own Walrus Memory account and give hippo a delegate
            key. Gas is normally sponsored.
          </p>
        </div>
      )}
    </Section>
  );
}
