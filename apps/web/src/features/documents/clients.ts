import { SealClient, SessionKey } from "@mysten/seal";
import type { ClientWithCoreApi } from "@mysten/sui/client";
import { Transaction } from "@mysten/sui/transactions";
import { fromHex } from "@mysten/sui/utils";
import type { WalrusClient } from "@mysten/walrus";
import walrusWasmUrl from "@mysten/walrus-wasm/web/walrus_wasm_bg.wasm?url";
import { z } from "zod";
import { STORAGE_EPOCHS } from "@/features/documents/file-rules";
import type { WalletSigner } from "@/features/documents/wallet-signer";

/** The committee key server Walrus Memory seals with on mainnet (docs/SPIKES.md §14). */
const COMMITTEE = "0x686098f1439237fff9f36b99c7329683c22979d2005c2465cb891acb012a7595";
const SEAL_AGGREGATOR = "https://seal-aggregator-mainnet.mystenlabs.com";
const WALRUS_AGGREGATOR = "https://aggregator.walrus-mainnet.walrus.space";
const UPLOAD_RELAY = "https://upload-relay.mainnet.walrus.space";
/** 0.05 SUI: a ceiling on the relay tip, so a misconfigured relay cannot drain a wallet. */
const RELAY_TIP_MAX_MIST = 50_000_000;
export const WAL_COIN_TYPE =
  "0x356a26eb9e012a68958082340d4c4116e7f55615cf27affcff209cf0ae544f59::wal::WAL";

const SealEnv = z.object({ apiKey: z.string().min(1) });

export function sealApiKey(env: Record<string, unknown>): string | null {
  const parsed = SealEnv.safeParse({ apiKey: env.VITE_SEAL_API_KEY });
  return parsed.success ? parsed.data.apiKey : null;
}

export interface FileChain {
  packageId: string;
  registryId: string;
  accountId: string;
  owner: string;
}

export function sealClient(sui: ClientWithCoreApi, apiKey: string): SealClient {
  return new SealClient({
    suiClient: sui,
    serverConfigs: [
      {
        objectId: COMMITTEE,
        weight: 1,
        aggregatorUrl: SEAL_AGGREGATOR,
        apiKeyName: "X-API-Key",
        apiKey,
      },
    ],
    verifyKeyServers: true,
  });
}

export async function sealEncrypt(
  seal: SealClient,
  packageId: string,
  sealId: string,
  plaintext: Uint8Array,
): Promise<Uint8Array> {
  const { encryptedObject } = await seal.encrypt({
    threshold: 1,
    packageId,
    id: sealId,
    data: plaintext,
  });
  return encryptedObject;
}

/**
 * Decrypt in the browser with a session the owner's wallet signs. The approval
 * is the account's own `seal_approve`, sent as the owner; hippo's server takes
 * no part in it.
 */
export async function sealDecrypt(input: {
  seal: SealClient;
  sui: ClientWithCoreApi;
  chain: FileChain;
  sealId: string;
  ciphertext: Uint8Array;
  signPersonalMessage: (message: Uint8Array) => Promise<string>;
}): Promise<Uint8Array> {
  const session = await SessionKey.create({
    address: input.chain.owner,
    packageId: input.chain.packageId,
    ttlMin: 10,
    suiClient: input.sui,
  });
  await session.setPersonalMessageSignature(
    await input.signPersonalMessage(session.getPersonalMessage()),
  );
  const tx = new Transaction();
  tx.setSender(input.chain.owner);
  tx.moveCall({
    target: `${input.chain.packageId}::account::seal_approve`,
    arguments: [
      tx.pure.vector("u8", Array.from(fromHex(input.sealId))),
      tx.object(input.chain.registryId),
      tx.object(input.chain.accountId),
    ],
  });
  const txBytes = await tx.build({ client: input.sui, onlyTransactionKind: true });
  await input.seal.fetchKeys({ ids: [input.sealId], txBytes, sessionKey: session, threshold: 1 });
  return input.seal.decrypt({ data: input.ciphertext, sessionKey: session, txBytes });
}

let walrus: Promise<WalrusClient> | null = null;

export function walrusClient(sui: ClientWithCoreApi): Promise<WalrusClient> {
  walrus ??= import("@mysten/walrus").then(
    ({ WalrusClient: Client }) =>
      new Client({
        network: "mainnet",
        suiClient: sui,
        wasmUrl: walrusWasmUrl,
        uploadRelay: { host: UPLOAD_RELAY, sendTip: { max: RELAY_TIP_MAX_MIST } },
      }),
  );
  return walrus;
}

export async function walrusWrite(
  client: WalrusClient,
  signer: WalletSigner,
  ciphertext: Uint8Array,
): Promise<{ blobId: string; blobObjectId: string; endEpoch: number }> {
  const { blobId, blobObject } = await client.writeBlob({
    blob: ciphertext,
    deletable: false,
    epochs: STORAGE_EPOCHS,
    signer,
  });
  return { blobId, blobObjectId: blobObject.id, endEpoch: blobObject.storage.end_epoch };
}

export async function walrusRead(blobId: string): Promise<Uint8Array> {
  const res = await fetch(`${WALRUS_AGGREGATOR}/v1/blobs/${encodeURIComponent(blobId)}`);
  if (!res.ok) throw new Error(`Walrus could not return that file just now (${res.status}).`);
  return new Uint8Array(await res.arrayBuffer());
}
