/**
 * Resolve a MemWalAccount object ID for an owner address via the on-chain
 * AccountRegistry's Table<address, ID>. Ported from
 * memwal/apps/app/src/utils/suiClientCompat.ts, gRPC path only (public
 * fullnodes retired JSON-RPC).
 */
import { SuiGrpcClient } from "@mysten/sui/grpc";
import { fromBase64, fromHex, normalizeSuiAddress, toHex } from "@mysten/sui/utils";

const tableIdCache = new Map<string, string>();

export function createSuiClient(network: "mainnet" | "testnet" = "mainnet"): SuiGrpcClient {
  return new SuiGrpcClient({
    network,
    baseUrl: `https://fullnode.${network}.sui.io:443`,
  });
}

export async function findAccountIdForOwner(
  client: SuiGrpcClient,
  registryId: string,
  ownerAddress: string,
): Promise<string | null> {
  let tableId = tableIdCache.get(registryId);
  if (!tableId) {
    const res = await client.core.getObject({ objectId: registryId, include: { json: true } });
    const json = (res.object as { json?: Record<string, unknown> }).json ?? {};
    const raw = (json.accounts as { id?: string | { id?: string } } | undefined)?.id;
    tableId = typeof raw === "string" ? raw : raw?.id;
    if (!tableId) return null;
    tableIdCache.set(registryId, tableId);
  }

  const field = await client.core
    .getDynamicField({
      parentId: tableId,
      name: { type: "address", bcs: fromHex(normalizeSuiAddress(ownerAddress)) },
    })
    .catch(() => null);
  const bcs = (field as { dynamicField?: { value?: { bcs?: unknown } } } | null)?.dynamicField
    ?.value?.bcs;
  const bytes = typeof bcs === "string" ? fromBase64(bcs) : (bcs as Uint8Array | undefined);
  if (!bytes || bytes.length !== 32) return null;
  return `0x${toHex(bytes)}`;
}

export interface RelayerConfig {
  packageId: string;
  network: "mainnet" | "testnet";
  suiRpcUrl: string;
  suiGrpcUrl: string;
  suiTransport: string;
  securityDeleteEnabled?: boolean;
}

let configCache: Promise<RelayerConfig> | null = null;

/**
 * The live deployment parameters. The package is upgradeable, so the package ID
 * in the docs goes stale: on 2026-09-21 the mainnet relayer reported
 * 0xe7c16fbe… while docs/contract/overview.md still said 0xcee7a6fd… (the
 * original package, which objects still carry in their type). Move calls must
 * target what this returns, never a hardcoded value.
 */
export function fetchRelayerConfig(serverUrl: string): Promise<RelayerConfig> {
  configCache ??= fetch(`${serverUrl.replace(/\/+$/, "")}/config`, {
    signal: AbortSignal.timeout(15_000),
  }).then(async (res) => {
    if (!res.ok) throw new Error(`GET /config → ${res.status}`);
    return (await res.json()) as RelayerConfig;
  });
  return configCache;
}
