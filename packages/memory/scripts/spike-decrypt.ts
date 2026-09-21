/**
 * Spike 7 — fetch a memory's raw blob from a public Walrus aggregator and
 * decrypt it locally with the delegate key.
 *
 * If this works, /proof can show the ciphertext anyone can download next to the
 * plaintext only this account can read, which is the "verifiable, owned memory"
 * claim demonstrated rather than asserted.
 */
import { EncryptedObject, SealClient, SessionKey } from "@mysten/seal";
import { SuiGrpcClient } from "@mysten/sui/grpc";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { Transaction } from "@mysten/sui/transactions";
import { fromHex, normalizeSuiAddress } from "@mysten/sui/utils";
import { fetchRelayerConfig, readOperatorEnv } from "../src/index.ts";

const AGGREGATOR = "https://aggregator.walrus-mainnet.walrus.space";
const SEAL_SERVERS_MAINNET = [
  { objectId: "0x145540d931f182fef76467dd8074c9839aea126852d90d18e1556fcbbd1208b6", weight: 1 },
  { objectId: "0xe0eb52eba9261b96e895bbb4deca10dcd64fbc626a1133017adcd5131353fd10", weight: 1 },
];

const blobId = process.argv[2];
if (!blobId) throw new Error("usage: tsx scripts/spike-decrypt.ts <blob-id>");

const env = readOperatorEnv();
const relayerCfg = await fetchRelayerConfig(env.MEMWAL_SERVER_URL);

console.log(`blob        ${blobId}`);
console.log(`aggregator  ${AGGREGATOR}`);

const res = await fetch(`${AGGREGATOR}/v1/blobs/${blobId}`);
if (!res.ok) throw new Error(`aggregator returned ${res.status}`);
const ciphertext = new Uint8Array(await res.arrayBuffer());
console.log(`downloaded  ${ciphertext.length} bytes of ciphertext (public, anyone can fetch this)`);

const parsed = EncryptedObject.parse(ciphertext);
console.log(`sealed under package ${parsed.packageId}`);
console.log(`seal identity        ${parsed.id.slice(0, 48)}…`);
console.log(`relayer /config says ${relayerCfg.packageId}`);

const suiClient = new SuiGrpcClient({
  network: "mainnet",
  baseUrl: "https://fullnode.mainnet.sui.io:443",
});
const keypair = Ed25519Keypair.fromSecretKey(fromHex(env.MEMWAL_PRIVATE_KEY));
const address = keypair.getPublicKey().toSuiAddress();
console.log(`delegate address     ${address}`);

const sealClient = new SealClient({
  // biome-ignore lint/suspicious/noExplicitAny: SealClient types against the JSON-RPC client
  suiClient: suiClient as any,
  serverConfigs: SEAL_SERVERS_MAINNET,
  verifyKeyServers: true,
});

// The session key is bound to the package the ciphertext was sealed under.
const sessionKey = await SessionKey.create({
  address,
  packageId: normalizeSuiAddress(parsed.packageId),
  ttlMin: 5,
  signer: keypair,
  // biome-ignore lint/suspicious/noExplicitAny: same client type mismatch
  suiClient: suiClient as any,
});

// seal_approve is called on the *current* package; the identity carries the
// original one. After a Move upgrade these differ.
const tx = new Transaction();
tx.moveCall({
  target: `${relayerCfg.packageId}::account::seal_approve`,
  arguments: [
    tx.pure.vector("u8", Array.from(fromHex(parsed.id))),
    tx.object(env.MEMWAL_REGISTRY_ID),
    tx.object(env.MEMWAL_ACCOUNT_ID),
  ],
});
// biome-ignore lint/suspicious/noExplicitAny: same client type mismatch
const txBytes = await tx.build({ client: suiClient as any, onlyTransactionKind: true });

await sealClient.fetchKeys({ ids: [parsed.id], txBytes, sessionKey, threshold: 2 });
const plaintext = await sealClient.decrypt({ data: ciphertext, sessionKey, txBytes });

console.log("\nDECRYPTED:");
console.log(new TextDecoder().decode(plaintext));
