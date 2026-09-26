/**
 * The account on Sui, read from the chain, with the keys that can reach it.
 *
 * Everything else on /me is hippo's account of itself. This is the part a user
 * does not have to believe: the object id resolves on an explorer, the delegate
 * list is what the contract enforces, and the revoke button removes an entry
 * from that exact list. Showing our own `delegate_keys` table here would have
 * been easier and would have proved nothing.
 */
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Hash } from "@/features/me/hash";
import { Section } from "@/features/me/section";
import { useAccount } from "@/features/me/use-account";

export function ChainPanel({ owned, onError }: { owned: boolean; onError: (m: string) => void }) {
  const { account, busy, start } = useAccount(onError);

  if (account === undefined) {
    return (
      <Section title="Account">
        <Skeleton className="h-4 w-64" />
        <Skeleton className="h-4 w-48" />
      </Section>
    );
  }

  if (account === null) return null;

  return (
    <Section title="Account" description={owned ? undefined : "Still hippo's own account."}>
      {owned ? null : (
        <Button disabled={busy} onClick={() => void start("connect")}>
          {busy ? "Opening…" : "Own this memory"}
        </Button>
      )}
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
                className="group flex items-center justify-between gap-3 px-3 py-2"
              >
                <span className="flex items-center gap-2">
                  <span>{d.label || "unlabelled"}</span>
                  {d.isHippo && <Badge variant="accent">hippo</Badge>}
                </span>
                <Hash value={d.publicKeyHex} label="public key" head={12} subtle />
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
        <Button variant="destructive" disabled={busy} onClick={() => void start("disconnect")}>
          {busy ? "Opening…" : "Revoke hippo's access"}
        </Button>
      ) : null}
    </Section>
  );
}
