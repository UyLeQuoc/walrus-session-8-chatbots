import {
  ConnectModal,
  useCurrentAccount,
  useSignPersonalMessage,
  useSignTransaction,
  useSuiClient,
} from "@mysten/dapp-kit";
import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router";
import { Button } from "@/components/ui/button";
import { API_URL } from "@/lib/api";
import {
  addDelegateKeyTx,
  type ChainConfig,
  createAccountTx,
  findAccountId,
  removeDelegateKeyTx,
} from "@/lib/memwal";
import { sponsorAndExecute } from "@/lib/sponsor";

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

  const [info, setInfo] = useState<TokenInfo | null>(null);
  const [chain, setChain] = useState<ChainConfig | null>(null);
  const [step, setStep] = useState<Step>("loading");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const [tokenRes, cfgRes] = await Promise.all([
          fetch(`${API_URL}/api/connect/${token}`, { credentials: "include" }),
          fetch(`${API_URL}/api/config`),
        ]);
        if (!tokenRes.ok)
          throw new Error(
            ((await tokenRes.json()) as { error?: string }).error ?? "Link not valid.",
          );
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
  }, [token]);

  const run = useCallback(async () => {
    if (!info || !chain || !account) return;
    setStep("working");
    setError("");
    const deps = {
      relayerUrl: chain.relayerUrl,
      sender: account.address,
      suiClient,
      signTransaction,
      signPersonalMessage,
    };
    try {
      let accountId = await findAccountId(suiClient, chain.registryId, account.address);

      if (kind === "connect") {
        if (!accountId) {
          setStatus("Creating your Walrus Memory account…");
          await sponsorAndExecute(createAccountTx(chain), deps);
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
        const tx = addDelegateKeyTx(chain, accountId, info.publicKey, info.label);
        const { digest } = await sponsorAndExecute(tx, deps);
        setStatus("Confirming on chain…");
        await finish(accountId, account.address, digest);
      } else {
        if (!accountId) throw new Error("This wallet does not own a Walrus Memory account.");
        setStatus("Revoking hippo's access…");
        const tx = removeDelegateKeyTx(chain, accountId, info.publicKey);
        const { digest } = await sponsorAndExecute(tx, deps);
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
          headers: { "content-type": "application/json" },
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
  }, [account, chain, info, kind, signPersonalMessage, signTransaction, suiClient, token]);

  if (step === "loading") return <p className="text-sm text-muted-foreground">Loading…</p>;

  if (step === "done") {
    return (
      <div className="space-y-3">
        <h1 className="text-xl font-semibold">
          {kind === "connect" ? "Your memory is yours" : "Access revoked"}
        </h1>
        <p className="text-sm text-muted-foreground">
          {kind === "connect"
            ? "hippo now writes into your own Walrus Memory account. You can revoke it at any time with /disconnect, and the same memory is readable from Claude Code or any other Walrus Memory client you sign in."
            : "hippo can no longer read or write your memory. Nothing was deleted; run /connect to grant access again."}
        </p>
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
            moves to a Walrus Memory account that <strong>you</strong> own on Sui. Gas is sponsored,
            so this costs you nothing, and you can take the access away again whenever you want.
          </>
        ) : (
          <>
            This removes hippo's key from your account on chain. After it lands, hippo cannot read
            or write your memories at all.
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

      {account ? (
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
