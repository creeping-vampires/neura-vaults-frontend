import {
  apiGet,
  API_ROUTES,
  DailyMetricsResponse,
  LatestChartResponse,
  LatestVaultsResponse,
  VaultAllocationsResponse,
  PendingDepositsResponse,
  PendingWithdrawalsResponse,
  VolumeSummaryResponse,
  PointsResponse,
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
  getChart: async (
    address: string,
    timeframe: "7D" | "1M"
  ): Promise<LatestChartResponse> => {
    try {
      const period = timeframe === "1M" ? "30d" : "7d";
      const route = `${API_ROUTES.GET_VAULTS_LATEST}/${address}/history/${period}`;
      const data = await apiGet<LatestChartResponse>(route);
      return data;
    } catch (error) {
      console.error("Error fetching price chart data (latest):", error);
      throw error;
    }
  },
  getVaultDetails: async (): Promise<LatestVaultsResponse> => {
    try {
      const CACHE_KEY = "vaults_data_cache";
      const CACHE_DURATION = 60 * 1000; // 1 minute

      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const { data, timestamp } = JSON.parse(cached);
        if (Date.now() - timestamp < CACHE_DURATION) {
          return data;
        }
      }

      const data = await apiGet<LatestVaultsResponse>(
        API_ROUTES.GET_VAULTS_LATEST
      );

      localStorage.setItem(
        CACHE_KEY,
        JSON.stringify({
          data,
          timestamp: Date.now(),
        })
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
        `${API_ROUTES.GET_VAULT_ALLOCATIONS}/${vaultAddress}`,
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
        { vaultAddress }
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
        { vaultAddress }
      );
      return data;
    } catch (error) {
      console.error("Error fetching pending withdrawal amount:", error);
      throw error;
    }
  },
  getPointsByProtocol: async (address: string): Promise<PointsResponse> => {
    try {
      const data = await apiGet<PointsResponse>(
        `${API_ROUTES.GET_POINTS_BY_PROTOCOL}/${address}`
      );
      return data;
    } catch (error) {
      console.error("Error fetching points by protocol:", error);
      throw error;
    }
  },
};

export default yieldMonitorService;
