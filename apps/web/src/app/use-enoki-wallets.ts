import { useSuiClientContext } from "@mysten/dapp-kit";
import { isEnokiNetwork, registerEnokiWallets } from "@mysten/enoki";
import type { ClientWithCoreApi } from "@mysten/sui/client";
import { useEffect } from "react";
import { enokiConfig, GOOGLE_REDIRECT_PATH } from "@/app/enoki";

export function useEnokiWallets(): void {
  const { client, network } = useSuiClientContext();
  useEffect(() => {
    const config = enokiConfig(import.meta.env);
    if (!config || !isEnokiNetwork(network)) return;
    if (!("core" in client)) return;
    const { unregister } = registerEnokiWallets({
      apiKey: config.apiKey,
      providers: {
        google: {
          clientId: config.clientId,
          redirectUrl: `${window.location.origin}${GOOGLE_REDIRECT_PATH}`,
        },
      },
      client: client as unknown as ClientWithCoreApi,
      network,
    });
    return unregister;
  }, [client, network]);
}
