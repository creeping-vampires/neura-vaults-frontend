import { apiGet } from './config';
import {
  API_ROUTES,
  LatestDepositsResponse,
  LatestWithdrawalsResponse,
  LatestVaultActionItem,
} from "./config";

export const fetchVaultDeposits = async (): Promise<LatestDepositsResponse> => {
  return apiGet<LatestDepositsResponse>(`${API_ROUTES.GET_VAULT_DEPOSITS_LATEST}`);
};

export const fetchVaultWithdrawals = async (): Promise<LatestWithdrawalsResponse> => {
  return apiGet<LatestWithdrawalsResponse>(`${API_ROUTES.GET_VAULT_WITHDRAWALS_LATEST}`);
};

export const fetchVaultActivities = async (
  _vaultAddress?: string
): Promise<LatestVaultActionItem[]> => {
  try {
    const [depositsResponse, withdrawalsResponse] = await Promise.all([
      fetchVaultDeposits(),
      fetchVaultWithdrawals(),
    ]);

    const depositItems = depositsResponse?.success
      ? depositsResponse.data?.deposits ?? []
      : [];
    const withdrawalItems = withdrawalsResponse?.success
      ? withdrawalsResponse.data?.withdrawals ?? []
      : [];

    const allItems: LatestVaultActionItem[] = [
      ...depositItems,
      ...withdrawalItems,
    ];

    // Sort by numeric timestamp descending to display most recent first
    return allItems.sort(
      (a, b) => Number(b.timestamp) - Number(a.timestamp)
    );
  } catch (error) {
    console.error("Error fetching vault activities:", error);
    throw error;
  }
};