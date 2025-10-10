import { useState, useCallback, useEffect, useMemo } from 'react';
import yieldMonitorService from '@/services/vaultService';
import { PriceChartPoint, PriceChartResponse, VaultPriceResponse, VaultPriceItem, TokenPriceData } from '@/services/config';

export interface PriceData {
  id: number;
  currentNetAPR: number;
  sharePrice: string;
  sharePriceFormatted: string;
  totalAssets: string;
  totalSupply: string;
  vaultAddress: string;
  token: string;
  protocol: string;
  lastUpdated: string;
}

let priceDataCache: PriceData | null = null;
const priceChartCache = new Map<string, TokenPriceData[]>();

export const usePrice = (targetToken?: string) => {
  const [chartData, setChartData] = useState<TokenPriceData[]>([]);
  const [allVaultData, setAllVaultData] = useState<VaultPriceItem[]>([]);
  const [priceData, setPriceData] = useState<PriceData>(
    priceDataCache || {
      id: 0,
      currentNetAPR: 0,
      sharePrice: "0",
      sharePriceFormatted: "0",
      totalAssets: "0",
      totalSupply: "0",
      vaultAddress: "",
      token: "",
      protocol: "",
      lastUpdated: "",
    }
  );

  const [isLoading, setIsLoading] = useState<boolean>(
    priceChartCache.size === 0
  );
  const [isPriceLoading, setIsPriceLoading] = useState<boolean>(
    !priceDataCache
  );
  const [error, setError] = useState<string | null>(null);
  const [priceError, setPriceError] = useState<string | null>(null);

  const fetchPriceChart = useCallback(
    async (params: { days: number; limit: number }) => {
      const key = `${params.days}-${params.limit}`;

      if (priceChartCache.has(key)) {
        setChartData(priceChartCache.get(key) || []);
        setIsLoading(false);
      } else {
        setIsLoading(true);
      }

      try {
        setError(null);
        const response: PriceChartResponse =
          await yieldMonitorService.getPriceChart(params);

        // Process token-based response structure
        // Maintain separate records for each token: [{token: 'USDC', data: [...]}, {token: 'USDT0', data: [...]}]
        const tokenSeparatedData: TokenPriceData[] = [];
        if (response.chart_data && Array.isArray(response.chart_data)) {
          response.chart_data.forEach((tokenData: TokenPriceData) => {
            if (tokenData.data && Array.isArray(tokenData.data)) {
              // Sort each token's data by timestamp
              const sortedTokenData = tokenData.data.sort((a, b) => {
                const timestampA =
                  typeof a.timestamp === "string"
                    ? Date.parse(a.timestamp)
                    : a.timestamp;
                const timestampB =
                  typeof b.timestamp === "string"
                    ? Date.parse(b.timestamp)
                    : b.timestamp;
                return timestampA - timestampB;
              });

              tokenSeparatedData.push({
                token: tokenData.token,
                data: sortedTokenData,
              });
            }
          });
        }

        // Cache and update state with separated token data
        priceChartCache.set(key, tokenSeparatedData);
        setChartData(tokenSeparatedData);
      } catch (err: any) {
        const message =
          err?.response?.data?.detail ||
          err?.message ||
          "Failed to fetch price chart data";
        setError(message);
        console.error("Error fetching price chart data:", err);
        if (!priceChartCache.has(key)) {
          setChartData([]);
        }
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const fetchPriceData = useCallback(async () => {
    try {
      setPriceError(null);
      if (!priceDataCache) {
        setIsPriceLoading(true);
      }

      const response: VaultPriceResponse =
        await yieldMonitorService.getVaultPrice();

      // Store all vault data
      setAllVaultData(response);

      // Select vault data based on target token or use first as default
      let vaultData: VaultPriceItem;
      if (targetToken) {
        vaultData =
          response.find((item) => item.token === targetToken) || response[0];
      } else {
        vaultData = response[0];
      }

      // Fallback if no data found
      if (!vaultData) {
        vaultData = {
          id: 0,
          vault_address: "",
          token: "",
          protocol: "",
          pool_apy: "0",
          share_price: "0",
          share_price_formatted: "0",
          total_assets: "0",
          total_supply: "0",
          apy_24h: 0,
          apy_7d: 0,
          created_at: new Date().toISOString(),
        };
      }

      const next: PriceData = {
        id: vaultData.id,
        currentNetAPR: parseFloat(vaultData.pool_apy),
        sharePrice: vaultData.share_price,
        sharePriceFormatted: vaultData.share_price_formatted,
        totalAssets: vaultData.total_assets,
        totalSupply: vaultData.total_supply,
        vaultAddress: vaultData.vault_address,
        token: vaultData.token,
        protocol: vaultData.protocol,
        lastUpdated: vaultData.created_at,
      };

      priceDataCache = next;
      setPriceData(next);
    } catch (error) {
      console.error("Error fetching price data:", error);
      setPriceError(
        error instanceof Error ? error.message : "Failed to fetch price data"
      );
    } finally {
      setIsPriceLoading(false);
    }
  }, []);

  const refreshPriceData = useCallback(() => {
    fetchPriceData();
  }, [fetchPriceData]);

  useEffect(() => {
    fetchPriceData();
  }, [fetchPriceData]);

  const getVaultDataByToken = useCallback(
    (token: string) => {
      return allVaultData.find((item) => item.token === token);
    },
    [allVaultData]
  );

  const getVaultDataByAddress = useCallback(
    (address: string) => {
      return allVaultData.find((item) => item.vault_address === address);
    },
    [allVaultData]
  );

  const getAverageAPY = useCallback(() => {
    if (!allVaultData || allVaultData.length === 0) {
      return 0;
    }

    const totalAPY = allVaultData.reduce((sum, vault) => {
      const apy = parseFloat(vault.pool_apy) || 0;
      return sum + apy;
    }, 0);

    return totalAPY / allVaultData.length;
  }, [allVaultData]);

  const getHighest24APY = useCallback(() => {
    if (!allVaultData || allVaultData.length === 0) {
      return 0;
    }

    const highestAPY = allVaultData.reduce((max, vault) => {
      const apy = vault.apy_24h || 0;
      return apy > max ? apy : max;
    }, 0);

    return highestAPY;
  }, [allVaultData]);

  const get24APY = useCallback(
    (token: string) => {
      const vaultData = getVaultDataByToken(token);
      const apy = Number(vaultData?.apy_24h || 0);
      return apy;
    },
    [getVaultDataByToken]
  );

  const get7APY = useCallback(
    (token: string): number => {
      const vaultData = getVaultDataByToken(token);
      return Number(vaultData?.apy_7d || 0);
    },
    [getVaultDataByToken]
  );

  const getHighest7APY = useCallback(() => {
    if (!allVaultData || allVaultData.length === 0) {
      return 0;
    }

    const highestAPY = allVaultData.reduce((max, vault) => {
      const apy = vault.apy_7d || 0;
      return apy > max ? apy : max;
    }, 0);

    return highestAPY;
  }, [allVaultData]);

  return useMemo(
    () => ({
      chartData,
      isLoading,
      error,
      fetchPriceChart,
      priceData,
      isPriceLoading,
      priceError,
      refreshPriceData,
      allVaultData,
      getVaultDataByToken,
      getVaultDataByAddress,
      getAverageAPY,
      getHighest24APY,
      getHighest7APY,
      get24APY,
      get7APY,
    }),
    [
      chartData,
      isLoading,
      error,
      fetchPriceChart,
      priceData,
      isPriceLoading,
      priceError,
      refreshPriceData,
      allVaultData,
      getVaultDataByToken,
      getVaultDataByAddress,
      getAverageAPY,
      getHighest24APY,
      getHighest7APY,
      get24APY,
      get7APY,
    ]
  );
};

export default usePrice;