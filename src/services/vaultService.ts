import {
  apiGet,
  API_ROUTES,
  DailyMetricsResponse,
  LatestPriceChartResponse,
  LatestVaultsResponse,
} from "./config";

const yieldMonitorService = {
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
    timeframe: '7D' | '1M'
  ): Promise<LatestPriceChartResponse> => {
    try {
      const period = timeframe === '1M' ? '30d' : '7d';
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
      const data = await apiGet<LatestVaultsResponse>(API_ROUTES.GET_VAULTS_LATEST);
      return data;
    } catch (error) {
      console.error("Error fetching vaults data:", error);
      throw error;
    }
  },
};

export default yieldMonitorService;
