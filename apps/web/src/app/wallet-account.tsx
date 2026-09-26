import { Link } from "react-router";
import { shortAddress, WalletAvatar } from "@/app/wallet-avatar";
import { WalletPicker } from "@/components/wallet-picker";
import { useMe } from "@/features/me/use-me";

export function WalletAccount() {
  const { me, load } = useMe();
  const address = me?.walletAddress;

  if (!me) return null;

  if (address) {
    return (
      <Link
        to="/me"
        className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-sidebar-accent"
      >
        <WalletAvatar address={address} />
        <span className="truncate font-mono text-xs">{shortAddress(address)}</span>
      </Link>
    );
  }

  return <WalletPicker className="w-full" label="Connect wallet" signIn onSignedIn={load} />;
}
