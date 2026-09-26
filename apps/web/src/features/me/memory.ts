export interface Memory {
  id: string;
  type: string;
  status: "pending" | "stored" | "failed";
  channel: string;
  createdAt: string;
  blobId: string | null;
  expiresAt: string | null;
  ciphertextUrl: string | null;
  explorerUrl: string | null;
  hidden?: boolean;
}

export function ago(iso: string): string {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return days === 1 ? "yesterday" : `${days}d ago`;
}
