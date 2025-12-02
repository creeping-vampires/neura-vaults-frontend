import {
  apiGet,
  API_ROUTES,
  DailyMetricsResponse,
  LatestPriceChartResponse,
  LatestVaultsResponse,
  VaultAllocationsResponse,
  PendingDepositsResponse,
  PendingWithdrawalsResponse,
  VolumeSummaryResponse,
} from "./config";

const yieldMonitorService = {
  getVolumeSummary: async (): Promise<VolumeSummaryResponse> => {
    try {
      const data = await apiGet<VolumeSummaryResponse>(
        API_ROUTES.GET_VOLUME_SUMMARY
      );
      return data;
    } catch (error) {
      console.error("Error fetching volume summary:", error);
      throw error;
    }
  },
  getDailyMetrics: async (): Promise<DailyMetricsResponse> => {
    try {
      const data = await apiGet<DailyMetricsResponse>(
        API_ROUTES.GET_DAILY_METRICS
      );
      return data;
    } catch (error) {
      console.error("Error fetching daily metrics:", error);
      throw error;
    }
  },
  getPriceChart: async (
    address: string,
    timeframe: "7D" | "1M"
  ): Promise<LatestPriceChartResponse> => {
    try {
      const period = timeframe === "1M" ? "30d" : "7d";
      const route = `${API_ROUTES.GET_VAULTS_LATEST}/${address}/history/${period}`;
      const data = await apiGet<LatestPriceChartResponse>(route);
      return data;
    } catch (error) {
      console.error("Error fetching price chart data (latest):", error);
      throw error;
    }
  },
  getVaultPrice: async (): Promise<LatestVaultsResponse> => {
    try {
      const data = await apiGet<LatestVaultsResponse>(
        API_ROUTES.GET_VAULTS_LATEST
      );
      return data;
    } catch (error) {
      console.error("Error fetching vaults data:", error);
      throw error;
    }
  },
  getVaultAllocations: async (
    vaultAddress: string
  ): Promise<VaultAllocationsResponse> => {
    try {
      const data = await apiGet<VaultAllocationsResponse>(
        API_ROUTES.GET_VAULT_ALLOCATIONS,
        { vaultAddress }
      );
      return data;
    } catch (error) {
      console.error("Error fetching vault allocations:", error);
      throw error;
    }
  },
  getPendingDepositAmount: async (
    vaultAddress: string
  ): Promise<PendingDepositsResponse> => {
    try {
      const data = await apiGet<PendingDepositsResponse>(
        API_ROUTES.GET_VAULT_PENDING_AMOUNT,
        { vaultAddress },
        10_000
      );
      return data;
    } catch (error) {
      console.error("Error fetching pending deposit amount:", error);
      throw error;
    }
  },
  getPendingWithdrawalAmount: async (
    vaultAddress: string
  ): Promise<PendingWithdrawalsResponse> => {
    try {
      const data = await apiGet<PendingWithdrawalsResponse>(
        API_ROUTES.GET_VAULT_PENDING_WITHDRAWALS,
        { vaultAddress },
        10_000
      );
      return data;
    } catch (error) {
      console.error("Error fetching pending withdrawal amount:", error);
      throw error;
    }
  },
};

export default yieldMonitorService;
