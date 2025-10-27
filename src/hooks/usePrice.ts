import { useState, useCallback, useEffect, useMemo } from 'react';
import yieldMonitorService from '@/services/vaultService';
import { LatestPriceChartResponse, LatestVaultsResponse, LatestVaultItem, TokenPriceData } from '@/services/config';

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
  const [allVaultData, setAllVaultData] = useState<LatestVaultItem[]>([]);
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
    async (params: { timeframe: '7D' | '1M'; address: string }) => {
      const key = `${params.address}|${params.timeframe}`;

      if (priceChartCache.has(key)) {
        setChartData(priceChartCache.get(key) || []);
        setIsLoading(false);
      } else {
        setIsLoading(true);
      }

      try {
        setError(null);
        const response: LatestPriceChartResponse =
          await yieldMonitorService.getPriceChart(params.address, params.timeframe);

        // Transform latest response to the TokenPriceData[] structure expected by UI
        const tokenSeparatedData: TokenPriceData[] = [];
        const points = response?.data?.dataPoints || [];

        const transformed = points.map((pt) => {
          const totalAssetsNum = Number(pt.totalAssets);
          const totalSupplyNum = Number(pt.totalSupply);
          const sharePriceComputed =
            totalSupplyNum > 0 ? totalAssetsNum / totalSupplyNum : 0;

          return {
            timestamp: Number(pt.timestamp),
            share_price_formatted: sharePriceComputed.toFixed(6),
            pool_apy: Number(pt.apy ?? pt.apy7d ?? pt.apy30d ?? 0),
          };
        });

        // Sort by timestamp ascending
        const sortedData = transformed.sort((a, b) => {
          const ta = typeof a.timestamp === 'string' ? Date.parse(a.timestamp) : Number(a.timestamp);
          const tb = typeof b.timestamp === 'string' ? Date.parse(b.timestamp) : Number(b.timestamp);
          return ta - tb;
        });

        // Label series by vault name or address
        const label = response?.data?.vaultName || response?.data?.vaultAddress || 'Vault';
        tokenSeparatedData.push({ token: label, data: sortedData });

        // Cache and update state
        priceChartCache.set(key, tokenSeparatedData);
        setChartData(tokenSeparatedData);
      } catch (err: any) {
        const message =
          err?.response?.data?.detail ||
          err?.message ||
          'Failed to fetch price chart data';
        setError(message);
        console.error('Error fetching price chart data (latest):', err);
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

      const response: LatestVaultsResponse =
        await yieldMonitorService.getVaultPrice();

      const vaults = response?.data ?? [];
      setAllVaultData(vaults);

      // Select vault data based on target token (symbol) or use first as default
      let vaultData: LatestVaultItem | undefined;
      if (targetToken) {
        vaultData = vaults.find((item) => item.symbol === targetToken) || vaults[0];
      } else {
        vaultData = vaults[0];
      }

      // Build PriceData from latest schema
      let next: PriceData;
      if (!vaultData) {
        next = {
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
        };
      } else {
        const totalAssetsNum = Number(vaultData.currentData?.totalAssets ?? 0);
        const totalSupplyNum = Number(vaultData.currentData?.totalSupply ?? 0);
        const sharePriceComputed = totalSupplyNum > 0 ? totalAssetsNum / totalSupplyNum : 0;

        const apyCandidate =
          vaultData.apy?.apy ?? vaultData.apy?.apy7d ?? vaultData.apy?.apy30d ?? 0;

        const tsSec = Number(vaultData.currentData?.timestamp ?? 0);
        const tsMs = tsSec > 0 ? tsSec * 1000 : 0;
        const lastUpdatedIso = tsMs ? new Date(tsMs).toISOString() : '';

        const protocolName = vaultData.allocations?.[0]?.name || vaultData.allocations?.[0]?.protocol || '';

        next = {
          id: 0,
          currentNetAPR: Number(apyCandidate) || 0,
          sharePrice: vaultData.currentData?.sharePrice ?? String(sharePriceComputed),
          sharePriceFormatted: sharePriceComputed.toFixed(6),
          totalAssets: vaultData.currentData?.totalAssets ?? '0',
          totalSupply: vaultData.currentData?.totalSupply ?? '0',
          vaultAddress: vaultData.address,
          token: vaultData.symbol,
          protocol: protocolName,
          lastUpdated: lastUpdatedIso,
        };
      }

      priceDataCache = next;
      setPriceData(next);
    } catch (error) {
      console.error('Error fetching price data:', error);
      setPriceError(
        error instanceof Error ? error.message : 'Failed to fetch price data'
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
      return allVaultData.find((item) => item.symbol === token);
    },
    [allVaultData]
  );

  const getVaultDataByAddress = useCallback(
    (address: string) => {
      return allVaultData.find((item) => item.address === address);
    },
    [allVaultData]
  );

  const getAverageAPY = useCallback(() => {
    if (!allVaultData || allVaultData.length === 0) {
      return 0;
    }

    const totalAPY = allVaultData.reduce((sum, vault) => {
      const apy = Number(vault.apy?.apy ?? 0) || 0;
      return sum + apy;
    }, 0);

    return totalAPY / allVaultData.length;
  }, [allVaultData]);

  const getHighest24APY = useCallback(() => {
    if (!allVaultData || allVaultData.length === 0) {
      return 0;
    }

    const highestAPY = allVaultData.reduce((max, vault) => {
      const apy = Number(vault.apy?.apy ?? 0) || 0;
      return apy > max ? apy : max;
    }, 0);

    return highestAPY;
  }, [allVaultData]);

  const get24APY = useCallback(
    (token: string) => {
      const vaultData = getVaultDataByToken(token);
      const apy = Number(vaultData?.apy?.apy ?? 0);
      return apy;
    },
    [getVaultDataByToken]
  );

  const get7APY = useCallback(
    (token: string): number => {
      const vaultData = getVaultDataByToken(token);
      return Number(vaultData?.apy?.apy7d ?? 0);
    },
    [getVaultDataByToken]
  );

  const getHighest7APY = useCallback(() => {
    if (!allVaultData || allVaultData.length === 0) {
      return 0;
    }

    const highestAPY = allVaultData.reduce((max, vault) => {
      const apy = Number(vault.apy?.apy7d ?? 0) || 0;
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