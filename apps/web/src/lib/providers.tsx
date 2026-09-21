import { createNetworkConfig, SuiClientProvider, WalletProvider } from "@mysten/dapp-kit";
import { SuiGrpcClient } from "@mysten/sui/grpc";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import "@mysten/dapp-kit/dist/index.css";

const { networkConfig } = createNetworkConfig({
  mainnet: { url: "https://fullnode.mainnet.sui.io:443", network: "mainnet" },
  testnet: { url: "https://fullnode.testnet.sui.io:443", network: "testnet" },
});

const queryClient = new QueryClient();

/** Public fullnodes retired JSON-RPC, so every Sui read here goes over gRPC. */
function createClient(name: string, cfg: { url: string }) {
  return new SuiGrpcClient({ network: name as "mainnet" | "testnet", baseUrl: cfg.url });
}

export function Providers({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <SuiClientProvider
        networks={networkConfig}
        defaultNetwork="mainnet"
        // biome-ignore lint/suspicious/noExplicitAny: dapp-kit types createClient against its JSON-RPC client
        createClient={createClient as any}
      >
        <WalletProvider autoConnect>{children}</WalletProvider>
      </SuiClientProvider>
    </QueryClientProvider>
  );
}
