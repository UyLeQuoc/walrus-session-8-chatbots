import {
  ConnectModal,
  useCurrentAccount,
  useSignAndExecuteTransaction,
  useSignPersonalMessage,
  useSignTransaction,
  useSuiClient,
} from "@mysten/dapp-kit";
import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router";
import { Button } from "@/components/ui/button";
import {
  addDelegateKeyTx,
  type ChainConfig,
  createAccountTx,
  findAccountId,
  removeDelegateKeyTx,
} from "@/features/connect/memwal";
import { sponsorAndExecute } from "@/features/connect/sponsor";
import { API_URL, identityHeaders } from "@/lib/api";

interface TokenInfo {
  kind: "connect" | "disconnect";
  publicKey: string;
  label: string;
  accountId: string | null;
}

type Step = "loading" | "ready" | "working" | "done" | "error";

export function ConnectPage({ kind }: { kind: "connect" | "disconnect" }) {
  const { token } = useParams();
  const account = useCurrentAccount();
  const suiClient = useSuiClient();
  const { mutateAsync: signTransaction } = useSignTransaction();
  const { mutateAsync: signPersonalMessage } = useSignPersonalMessage();
  const { mutateAsync: signAndExecuteTransaction } = useSignAndExecuteTransaction();

  const [info, setInfo] = useState<TokenInfo | null>(null);
  const [chain, setChain] = useState<ChainConfig | null>(null);
  const [step, setStep] = useState<Step>("loading");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);
  /** Set when the relayer refused to sponsor and the user paid instead. */
  const [selfPaid, setSelfPaid] = useState(false);
  /**
   * The link itself is unusable: expired, used, or never existed. Kept apart
   * from `step === "error"`, which a failed signature also sets and which must
   * still offer a retry. A dead link used to show the error and then invite the
   * person to connect a wallet anyway, for a transaction that could not work.
   */
  const [linkDead, setLinkDead] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const [tokenRes, cfgRes] = await Promise.all([
          fetch(`${API_URL}/api/connect/${token}`, {
            credentials: "include",
            headers: identityHeaders(),
          }),
          fetch(`${API_URL}/api/config`),
        ]);
        if (!tokenRes.ok) {
          setLinkDead(true);
          // The server cannot tell which kind an unknown token was meant to be,
          // so it always said "Run /connect again", on the disconnect page too.
          throw new Error(
            tokenRes.status === 404
              ? `This link has expired or was already used. Run /${kind} again in the chat for a new one.`
              : (((await tokenRes.json().catch(() => ({}))) as { error?: string }).error ??
                  "Link not valid."),
          );
        }
        if (cancelled) return;
        setInfo((await tokenRes.json()) as TokenInfo);
        setChain((await cfgRes.json()) as ChainConfig);
        setStep("ready");
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Could not load this link.");
        setStep("error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, kind]);

  const run = useCallback(async () => {
    if (!info || !chain || !account) return;
    setStep("working");
    setError("");
    setSelfPaid(false);
    const deps = {
      relayerUrl: chain.relayerUrl,
      sender: account.address,
      suiClient,
      signTransaction,
      signPersonalMessage,
      signAndExecuteTransaction,
      onFallback: () => {
        setSelfPaid(true);
        setStatus(
          "Gas sponsorship is unavailable, so your wallet will pay for this transaction. Approve it to continue.",
        );
      },
    };
    try {
      let accountId = await findAccountId(suiClient, chain.registryId, account.address);

      if (kind === "connect") {
        if (!accountId) {
          setStatus("Creating your Walrus Memory account…");
          await sponsorAndExecute(() => createAccountTx(chain), deps);
          for (let i = 0; i < 10 && !accountId; i++) {
            await new Promise((r) => setTimeout(r, 1500));
            accountId = await findAccountId(suiClient, chain.registryId, account.address);
          }
          if (!accountId)
            throw new Error(
              "The account was created but has not appeared on chain yet. Reload and try again.",
            );
        }
        setStatus("Granting hippo access to your account…");
        const id = accountId;
        const { digest } = await sponsorAndExecute(
          () => addDelegateKeyTx(chain, id, info.publicKey, info.label),
          deps,
        );
        setStatus("Confirming on chain…");
        await finish(accountId, account.address, digest);
      } else {
        if (!accountId) throw new Error("This wallet does not own a Walrus Memory account.");
        setStatus("Revoking hippo's access…");
        const id = accountId;
        const { digest } = await sponsorAndExecute(
          () => removeDelegateKeyTx(chain, id, info.publicKey),
          deps,
        );
        setStatus("Confirming on chain…");
        await finish(accountId, account.address, digest);
      }
      setStep("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
      setStep("error");
    }

    async function finish(accountId: string, walletAddress: string, digest: string) {
      // The server re-reads the account on chain; retry while the node catches up.
      for (let i = 0; i < 6; i++) {
        const res = await fetch(`${API_URL}/api/connect/${token}/done`, {
          method: "POST",
          headers: { "content-type": "application/json", ...identityHeaders() },
          credentials: "include",
          body: JSON.stringify({ accountId, walletAddress, digest }),
        });
        if (res.ok) return;
        if (res.status !== 409)
          throw new Error(
            ((await res.json()) as { error?: string }).error ?? "Confirmation failed.",
          );
        await new Promise((r) => setTimeout(r, 2000));
      }
      throw new Error("The transaction landed but confirmation kept failing. Try the link again.");
    }
  }, [
    account,
    chain,
    info,
    kind,
    signAndExecuteTransaction,
    signPersonalMessage,
    signTransaction,
    suiClient,
    token,
  ]);

  if (step === "loading") return <p className="text-sm text-muted-foreground">Loading…</p>;

  if (step === "done") {
    return (
      <div className="space-y-3">
        <h1 className="text-xl font-semibold">
          {kind === "connect" ? "Your memory is yours" : "Access revoked"}
        </h1>
        <p className="text-sm text-muted-foreground">
          {kind === "connect"
            ? "hippo now writes into your own Walrus Memory account, and the same memory is readable from Claude Code or any other Walrus Memory client you sign in. Anything you told it before this stays in hippo's own account, where it cannot be moved from, so hippo reads both. You can revoke its access to yours at any time with /disconnect."
            : "hippo can no longer read or write anything in your account, within about a minute. What you told it before you connected lives in hippo's account rather than yours, so that part it can still read; /memory forget all makes it unrecallable. Nothing was deleted, and /connect grants access again."}
        </p>
        {selfPaid && (
          <p className="text-xs text-muted-foreground">
            Gas sponsorship was unavailable, so your wallet paid for this transaction.
          </p>
        )}
        <p className="text-sm">You can close this tab and go back to the chat.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
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
        <dl className="rounded-lg border p-3 text-xs text-muted-foreground">
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
        <ConnectModal
          open={pickerOpen}
          onOpenChange={setPickerOpen}
          trigger={<Button>Connect your Sui wallet</Button>}
        />
      )}
    </div>
  );
}
