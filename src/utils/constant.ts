export const explorerUrl = "https://hyperevmscan.io";

import yieldMonitorService from "@/services/vaultService";
import { LatestVaultsResponse, LatestVaultItem } from "@/services/config";

export type DynamicVault = LatestVaultItem;

export async function fetchAllVaults(): Promise<LatestVaultItem[]> {
  const resp: LatestVaultsResponse = await yieldMonitorService.getVaultPrice();
  return resp?.data ?? [];
}
