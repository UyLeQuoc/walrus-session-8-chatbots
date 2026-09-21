import { useParams } from "react-router";

export function ConnectPage({ kind }: { kind: "connect" | "disconnect" }) {
  const { token } = useParams();
  return (
    <div className="space-y-2">
      <h1 className="text-xl font-semibold">
        {kind === "connect" ? "Own your memory" : "Revoke hippo"}
      </h1>
      <p className="text-sm text-muted-foreground">
        Milestone 1: wallet connect, sponsored{" "}
        {kind === "connect" ? "create_account + add_delegate_key" : "remove_delegate_key"}. Token:{" "}
        <code>{token}</code>
      </p>
    </div>
  );
}
