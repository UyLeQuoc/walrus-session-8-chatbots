/**
 * Gasless account setup. The Walrus Memory relayer sponsors exactly three
 * calls — account::create_account, add_delegate_key and remove_delegate_key —
 * so a user can own their memory without ever holding SUI.
 *
 * Ported from memwal/apps/app/src/hooks/useSponsoredTransaction.ts. Verified on
 * 2026-09-21 that the relayer accepts these calls from a non-Walrus origin, so
 * the browser talks to it directly and no server proxy is needed.
 */

import type { Transaction } from "@mysten/sui/transactions";
import { Transaction as Tx } from "@mysten/sui/transactions";
import { createSponsorAuthorization } from "@mysten-incubation/memwal";

const MAX_ATTEMPTS = 3;
const BASE_DELAY_MS = 500;

/** 408/429/500/503/504 are worth retrying; 502 means the sponsor rejected the transaction itself. */
function retryable(status: number): boolean {
  return status === 408 || status === 429 || status === 500 || status === 503 || status === 504;
}

export interface SponsorDeps {
  relayerUrl: string;
  sender: string;
  suiClient: unknown;
  signTransaction: (input: { transaction: Tx }) => Promise<{ signature: string }>;
  signPersonalMessage: (input: { message: Uint8Array }) => Promise<{ signature: string }>;
}

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}

export async function sponsorAndExecute(
  transaction: Transaction,
  deps: SponsorDeps,
): Promise<{ digest: string }> {
  const kindBytes = await transaction.build({
    // biome-ignore lint/suspicious/noExplicitAny: dapp-kit and @mysten/sui disagree on the client type across majors
    client: deps.suiClient as any,
    onlyTransactionKind: true,
  });
  const kindBase64 = toBase64(kindBytes);
  let lastError: unknown;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const auth = await createSponsorAuthorization(deps.sender, kindBytes, (message) =>
        deps.signPersonalMessage({ message }),
      );
      const sponsorRes = await fetch(`${deps.relayerUrl}/sponsor`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transactionBlockKindBytes: kindBase64,
          sender: deps.sender,
          ...auth,
        }),
      });
      if (!sponsorRes.ok) {
        const body = await sponsorRes.text();
        if (!retryable(sponsorRes.status) || attempt === MAX_ATTEMPTS) {
          throw new Error(readSponsorError(sponsorRes.status, body));
        }
        throw Object.assign(new Error("retryable"), { retryable: true });
      }
      const sponsored = (await sponsorRes.json()) as { bytes: string; digest: string };

      const { signature } = await deps.signTransaction({ transaction: Tx.from(sponsored.bytes) });

      const execRes = await fetch(`${deps.relayerUrl}/sponsor/execute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ digest: sponsored.digest, sender: deps.sender, signature }),
      });
      if (!execRes.ok) {
        const body = await execRes.text();
        if (!retryable(execRes.status) || attempt === MAX_ATTEMPTS) {
          throw new Error(readSponsorError(execRes.status, body));
        }
        throw Object.assign(new Error("retryable"), { retryable: true });
      }
      return (await execRes.json()) as { digest: string };
    } catch (err) {
      lastError = err;
      const isRetryable = (err as { retryable?: boolean }).retryable === true;
      if (!isRetryable || attempt === MAX_ATTEMPTS) break;
      await new Promise((r) => setTimeout(r, BASE_DELAY_MS * 2 ** (attempt - 1)));
    }
  }
  throw lastError instanceof Error ? lastError : new Error("Sponsorship failed.");
}

function readSponsorError(status: number, body: string): string {
  let detail: string | undefined;
  try {
    detail = (JSON.parse(body) as { error?: string }).error;
  } catch {
    detail = undefined;
  }
  if (status === 429) return "Too many requests right now. Wait a moment and try again.";
  if (status === 502)
    return detail ?? "The sponsor rejected this transaction. It may already have been applied.";
  if (status >= 500) return "The sponsor service is briefly unavailable. Try again in a moment.";
  return detail ?? `Sponsorship failed (${status}).`;
}
