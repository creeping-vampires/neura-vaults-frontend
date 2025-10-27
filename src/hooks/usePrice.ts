import { useState, useCallback, useEffect, useMemo } from 'react';
import yieldMonitorService from '@/services/vaultService';
import { LatestPriceChartResponse, LatestVaultsResponse, LatestVaultItem, TokenPriceData, LatestPriceChartPoint } from '@/services/config';
import { formatUnits } from 'viem';

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
        
        const transformed = points.map((pt: LatestPriceChartPoint) => {
          const safeBigInt = (v: string | number | undefined | null): bigint | null => {
            try {
              if (v === undefined || v === null) return null;
              if (typeof v === 'number') return BigInt(Math.floor(v));
              const s = String(v).trim();
              if (!/^-?\d+$/.test(s)) return null;
              return BigInt(s);
            } catch {
              return null;
            }
          };

       const computeSharePrice = (): string => {
            const assets = safeBigInt(pt.totalAssets);
            const supply = safeBigInt(pt.totalSupply);
            if (assets !== null && supply !== null && supply > 0n) {
              const scaled = (assets * 10n ** 18n) / supply;
              return formatUnits(scaled, 18);
            }
            
            const sp = pt.sharePrice;
            if (typeof sp === 'string' && sp.length > 0) {
              const spBig = safeBigInt(sp);
              if (spBig !== null) return formatUnits(spBig, 18);
              const parsed = Number(sp.replace(/[^0-9.\-]/g, ''));
              return isNaN(parsed) ? '0' : String(parsed);
            }
            return '0';
          };

          const sharePriceStr = computeSharePrice();
          const sharePriceNum = Number(sharePriceStr);

          return {
            timestamp: Number(pt.timestamp),
            share_price_formatted: isNaN(sharePriceNum)
              ? '0.000000'
              : sharePriceNum.toFixed(6),
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
          sharePriceFormatted: "0.000000",
          totalAssets: "0",
          totalSupply: "0",
          vaultAddress: "",
          token: "",
          protocol: "",
          lastUpdated: "",
        };
      } else {
        // Compute precise share price from BigInt
        let sharePriceStr = "0";
        try {
          const assetsRaw = vaultData.currentData?.totalAssets ?? "0";
          const supplyRaw = vaultData.currentData?.totalSupply ?? "0";
          const assets = BigInt(assetsRaw);
          const supply = BigInt(supplyRaw);
          if (supply > 0n) {
            const scaled = (assets * 10n ** 18n) / supply;
            sharePriceStr = formatUnits(scaled, 18);
          } else {
            sharePriceStr = "0";
          }
        } catch {
          // Fallback to provided sharePrice
          sharePriceStr = vaultData.currentData?.sharePrice ?? "0";
        }

        const apyCandidate =
          vaultData.apy?.apy ?? vaultData.apy?.apy7d ?? vaultData.apy?.apy30d ?? 0;

        const tsSec = Number(vaultData.currentData?.timestamp ?? 0);
        const tsMs = tsSec > 0 ? tsSec * 1000 : 0;
        const lastUpdatedIso = tsMs ? new Date(tsMs).toISOString() : '';

        const protocolName = vaultData.allocations?.[0]?.name || vaultData.allocations?.[0]?.protocol || '';

        next = {
          id: 0,
          currentNetAPR: Number(apyCandidate) || 0,
          sharePrice: sharePriceStr,
          sharePriceFormatted: ((): string => {
            const n = parseFloat(sharePriceStr);
            return isNaN(n) ? "0.000000" : n.toFixed(6);
          })(),
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
    const apys = allVaultData
      .map((item) => item.apy?.apy ?? item.apy?.apy7d ?? item.apy?.apy30d)
      .filter((v) => typeof v === 'number') as number[];
    if (apys.length === 0) return 0;
    const sum = apys.reduce((acc, v) => acc + v, 0);
    return sum / apys.length;
  }, [allVaultData]);

  const getHighest24APY = useCallback(() => {
    const apys = allVaultData
      .map((item) => item.apy?.apy)
      .filter((v) => typeof v === 'number') as number[];
    return apys.length === 0 ? 0 : Math.max(...apys);
  }, [allVaultData]);

  const getHighest7APY = useCallback(() => {
    const apys = allVaultData
      .map((item) => item.apy?.apy7d)
      .filter((v) => typeof v === 'number') as number[];
    return apys.length === 0 ? 0 : Math.max(...apys);
  }, [allVaultData]);

  const get24APY = useCallback(() => {
    const item = allVaultData[0];
    const apy = item?.apy?.apy ?? 0;
    return Number(apy) || 0;
  }, [allVaultData]);

  const get7APY = useCallback(() => {
    const item = allVaultData[0];
    const apy = item?.apy?.apy7d ?? 0;
    return Number(apy) || 0;
  }, [allVaultData]);

  return useMemo(() => ({
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
  }), [
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
  ]);
};

export default usePrice;