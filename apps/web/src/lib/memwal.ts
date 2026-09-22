/** Move calls against the Walrus Memory account contract. */
import { Transaction } from "@mysten/sui/transactions";
import { fromBase64, fromHex, normalizeSuiAddress, toHex } from "@mysten/sui/utils";

const SUI_CLOCK = "0x0000000000000000000000000000000000000000000000000000000000000006";

export interface ChainConfig {
  network: "mainnet" | "testnet";
  relayerUrl: string;
  packageId: string;
  registryId: string;
}

export function createAccountTx(cfg: ChainConfig): Transaction {
  const tx = new Transaction();
  tx.moveCall({
    target: `${cfg.packageId}::account::create_account`,
    arguments: [tx.object(cfg.registryId), tx.object(SUI_CLOCK)],
  });
  return tx;
}

export function addDelegateKeyTx(
  cfg: ChainConfig,
  accountId: string,
  publicKeyHex: string,
  label: string,
): Transaction {
  const tx = new Transaction();
  tx.moveCall({
    target: `${cfg.packageId}::account::add_delegate_key`,
    arguments: [
      tx.object(accountId),
      tx.object(cfg.registryId),
      tx.pure.vector("u8", Array.from(fromHex(publicKeyHex))),
      tx.pure.string(label),
      tx.object(SUI_CLOCK),
    ],
  });
  return tx;
}

export function removeDelegateKeyTx(
  cfg: ChainConfig,
  accountId: string,
  publicKeyHex: string,
): Transaction {
  const tx = new Transaction();
  tx.moveCall({
    target: `${cfg.packageId}::account::remove_delegate_key`,
    arguments: [
      tx.object(accountId),
      tx.object(cfg.registryId),
      tx.pure.vector("u8", Array.from(fromHex(publicKeyHex))),
    ],
  });
  return tx;
}

/** One MemWalAccount per address, found through the registry's Table<address, ID>. */
export async function findAccountId(
  // biome-ignore lint/suspicious/noExplicitAny: dapp-kit's client type varies by transport
  suiClient: any,
  registryId: string,
  owner: string,
): Promise<string | null> {
  const reg = await suiClient.core.getObject({ objectId: registryId, include: { json: true } });
  const raw = (reg?.object?.json?.accounts as { id?: string | { id?: string } } | undefined)?.id;
  const tableId = typeof raw === "string" ? raw : raw?.id;
  if (!tableId) return null;
  const field = await suiClient.core
    .getDynamicField({
      parentId: tableId,
      name: { type: "address", bcs: fromHex(normalizeSuiAddress(owner)) },
    })
    .catch(() => null);
  const bcs = field?.dynamicField?.value?.bcs;
  const bytes = typeof bcs === "string" ? fromBase64(bcs) : (bcs as Uint8Array | undefined);
  if (bytes?.length !== 32) return null;
  return `0x${toHex(bytes)}`;
}
