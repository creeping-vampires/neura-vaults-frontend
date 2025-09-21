import { apiGet, API_ROUTES, DailyMetricsResponse, PriceChartResponse, VaultPriceResponse } from "./config";

const yieldMonitorService = {
  getDailyMetrics: async (): Promise<DailyMetricsResponse> => {
    try {
      const data = await apiGet<DailyMetricsResponse>(API_ROUTES.GET_DAILY_METRICS);
      return data;
    } catch (error) {
      console.error("Error fetching daily metrics:", error);
      throw error;
    }
  },
  getPriceChart: async (params: { days: number; limit: number }): Promise<PriceChartResponse> => {
    try {
      const data = await apiGet<PriceChartResponse>(API_ROUTES.GET_PRICE_CHART, params);
      return data;
    } catch (error) {
      console.error("Error fetching price chart data:", error);
      throw error;
    }
  },
  getVaultPrice: async (): Promise<VaultPriceResponse> => {
    try {
      const data = await apiGet<VaultPriceResponse>(API_ROUTES.GET_VAULT_PRICE);
      return data;
    } catch (error) {
      console.error("Error fetching vault price data:", error);
      throw error;
    }
  },
};

export default yieldMonitorService;