import { useParams } from "react-router";
import { useShellTitle } from "@/app/shell";
import { Button } from "@/components/ui/button";
import { WalletPicker } from "@/components/wallet-picker";
import { useConnectFlow } from "@/features/connect/use-connect-flow";

export function ConnectPage({ kind }: { kind: "connect" | "disconnect" }) {
  const { token } = useParams();
  const { account, info, step, status, error, selfPaid, linkDead, run } = useConnectFlow(
    kind,
    token,
  );
  useShellTitle(kind === "connect" ? "Connect" : "Revoke");

  if (step === "loading") {
    return <p className="px-4 py-6 text-sm text-muted-foreground">Loading…</p>;
  }

  if (step === "done") {
    return (
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-6">
        <h1 className="text-xl font-semibold">
          {kind === "connect" ? "Your memory is yours" : "Access revoked"}
        </h1>
        <p className="text-sm text-muted-foreground">
          {kind === "connect"
            ? "hippo now writes into your own Walrus Memory account, and the same memory is readable from Claude Code or any other Walrus Memory client you sign in. Anything you told it before this stays in hippo's own account, where it cannot be moved from, so hippo reads both. You can revoke its access to yours at any time with /disconnect."
            : "hippo can no longer read or write anything in your account, within about a minute. What you told it before you connected lives in hippo's account rather than yours, so that part it can still read; /memory forget all makes it unrecallable. Nothing was deleted, and /connect grants access again."}
        </p>
        {selfPaid && (
          <p className="text-sm text-muted-foreground">
            Gas sponsorship was unavailable, so your wallet paid for this transaction.
          </p>
        )}
        <p className="text-sm">You can close this tab and go back to the chat.</p>
      </div>
    );
  }

  return (
    <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-6">
      <h1 className="text-xl font-semibold">
        {kind === "connect" ? "Own your memory" : "Revoke hippo"}
      </h1>
      <p className="text-sm text-muted-foreground">
        {kind === "connect" ? (
          <>
            Right now hippo keeps your memory under its own account. Sign one transaction and it
            moves to a Walrus Memory account that <strong>you</strong> own on Sui. Walrus Memory
            normally sponsors the gas, so it costs you nothing. If sponsorship is unavailable your
            wallet pays instead, which needs a small amount of SUI, and you will be told before you
            sign. You can take the access away again whenever you want.
          </>
        ) : (
          <>
            This removes hippo's key from your account on chain. After it lands, hippo cannot read
            or write your memories at all. Gas is normally sponsored; if it is not, your wallet pays
            and you will be told before you sign.
          </>
        )}
      </p>

      {info && (
        <dl className="rounded-lg border p-3 text-sm text-muted-foreground">
          <div className="flex justify-between gap-4">
            <dt>Key label</dt>
            <dd className="font-mono">{info.label}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt>Delegate key</dt>
            <dd className="font-mono">{info.publicKey.slice(0, 16)}…</dd>
          </div>
        </dl>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}
      {step === "working" && <p className="text-sm">{status}</p>}

      {linkDead ? null : account ? (
        <Button onClick={() => void run()} disabled={step === "working"}>
          {step === "working" ? "Working…" : kind === "connect" ? "Grant access" : "Revoke access"}
        </Button>
      ) : (
        <WalletPicker label="Connect your Sui wallet" />
      )}
    </div>
  );
}
