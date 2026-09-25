import { ConnectModal, useCurrentAccount, useSignPersonalMessage } from "@mysten/dapp-kit";
import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { API_URL, identityHeaders, rememberSession } from "@/lib/api";

/**
 * Prove control of a wallet, so someone who ran `/connect` on Telegram can open
 * this page and see their own memory. The server issues the nonce and derives
 * the address from the signature, so nothing here is trusted.
 */
export function WalletSignIn({ onSignedIn }: { onSignedIn: () => void }) {
  const account = useCurrentAccount();
  const { mutateAsync: signPersonalMessage } = useSignPersonalMessage();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const signIn = useCallback(async () => {
    setBusy(true);
    setError("");
    try {
      const challenge = await fetch(`${API_URL}/api/auth/challenge`, {
        method: "POST",
        credentials: "include",
        headers: identityHeaders(),
      });
      if (!challenge.ok) throw new Error("Could not start sign-in.");
      const { nonce, message } = (await challenge.json()) as { nonce: string; message: string };

      const { signature } = await signPersonalMessage({
        message: new TextEncoder().encode(message),
      });

      const verified = await fetch(`${API_URL}/api/auth/verify`, {
        method: "POST",
        headers: { "content-type": "application/json", ...identityHeaders() },
        credentials: "include",
        body: JSON.stringify({ nonce, signature }),
      });
      if (!verified.ok) {
        throw new Error(((await verified.json()) as { error?: string }).error ?? "Sign-in failed.");
      }
      // Cross-origin the cookie will not come back, so keep the session id.
      const body = (await verified.json()) as { sessionId?: string };
      if (body.sessionId) rememberSession(body.sessionId);
      onSignedIn();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sign-in failed.");
    } finally {
      setBusy(false);
    }
  }, [onSignedIn, signPersonalMessage]);

  return (
    <div className="space-y-2 rounded-lg border p-4">
      <h2 className="font-medium">Already own your memory?</h2>
      <p className="text-sm text-muted-foreground">
        If you ran <code>/connect</code> on another channel, sign this page with the same wallet and
        it will show that memory instead of this browser's. You are signing a message, not a
        transaction: nothing is spent and nothing is authorised.
      </p>
      {error && <p className="text-sm text-destructive">{error}</p>}
      {account ? (
        <Button onClick={() => void signIn()} disabled={busy}>
          {busy ? "Signing…" : "Sign in with your wallet"}
        </Button>
      ) : (
        <ConnectModal
          open={pickerOpen}
          onOpenChange={setPickerOpen}
          trigger={<Button variant="outline">Connect your Sui wallet</Button>}
        />
      )}
    </div>
  );
}
