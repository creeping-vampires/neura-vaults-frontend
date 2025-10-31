export const explorerUrl = "https://hyperevmscan.io";

export const operatorAddress = "0x2CdC7b3039bA87F1eb1BCeA36907f9651821Cba4";

import yieldMonitorService from "@/services/vaultService";
import { LatestVaultsResponse, LatestVaultItem } from "@/services/config";

export type DynamicVault = LatestVaultItem;

export async function fetchAllVaults(): Promise<LatestVaultItem[]> {
  const resp: LatestVaultsResponse = await yieldMonitorService.getVaultPrice();
  return resp?.data ?? [];
}
