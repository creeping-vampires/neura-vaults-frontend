import React, { createContext, useContext, useState, useCallback, useEffect, useMemo } from "react";
import yieldMonitorService from "@/services/vaultService";
import {
  LatestChartResponse,
  LatestVaultsResponse,
  LatestVaultItem,
  TokenPriceData,
  LatestChartPoint,
  PointsResponse,
} from "@/services/config";

export interface VaultApiContextType {
  chartData: TokenPriceData[];
  isChartLoading: boolean;
  error: string | null;
  fetchChart: (params: {
    timeframe: "7D" | "1M";
    address: string;
  }) => Promise<void>;
  fetchVaultData: () => Promise<void>;
  fetchVolumeSummary: () => Promise<void>;
  isVaultLoading: boolean;
  vaultError: string | null;
  refreshVaultsData: () => void;
  allVaultData: LatestVaultItem[];
  getVaultDataByToken: (token: string) => LatestVaultItem | undefined;
  getVaultDataByAddress: (address: string) => LatestVaultItem | undefined;
  getAverageAPY: () => number;
  getHighest24APY: () => number;
  getHighest7APY: () => number;
  get24APY: () => number;
  get7APY: () => number;
  get30APY: () => number;
  totalVolume: number;
  userPoints: PointsResponse | null;
  fetchUserPoints: (address: string) => Promise<void>;
}

const VaultApiContext = createContext<VaultApiContextType | undefined>(
  undefined
);

export const VaultApiProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [chartData, setChartData] = useState<TokenPriceData[]>([]);
  const [allVaultData, setAllVaultData] = useState<LatestVaultItem[]>([]);
  const [totalVolume, setTotalVolume] = useState<number>(0);

  const [isChartLoading, setIsChartLoading] = useState<boolean>(true);
  const [isVaultLoading, setIsVaultLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [vaultError, setVaultError] = useState<string | null>(null);

  const fetchChart = useCallback(
    async (params: { timeframe: "7D" | "1M"; address: string }) => {
      setIsChartLoading(true);

      try {
        setError(null);
        const response: LatestChartResponse =
          await yieldMonitorService.getChart(params.address, params.timeframe);

        const tokenSeparatedData: TokenPriceData[] = [];
        const points = response?.data?.dataPoints || [];

        const transformed = points.map((pt: LatestChartPoint) => {
          const ts = Number(pt.timestamp);
          let spNum = 0;
          const spRaw: any = (pt as any).sharePrice;
          if (typeof spRaw === "string") {
            const s = spRaw.trim();
            if (/^-?\d+$/.test(s)) {
              spNum = Number(s) / 1e6;
            } else {
              const parsed = parseFloat(s);
              spNum = isNaN(parsed) ? 0 : parsed;
            }
          } else if (typeof spRaw === "number") {
            spNum = spRaw > 1000 ? spRaw / 1e6 : spRaw;
          } else {
            const a = Number(pt.totalAssets);
            const s = Number(pt.totalSupply);
            spNum = s > 0 ? a / s : 0;
          }

          return {
            timestamp: ts,
            share_price_formatted: isFinite(spNum)
              ? spNum.toFixed(6)
              : "0.000000",
            tvl: Number((pt as any).totalAssets) / 1e6,
            apy: Number((pt as any).apy1d),
          };
        });

        const sortedData = transformed.sort(
          (a, b) => Number(a.timestamp) - Number(b.timestamp)
        );
        const label =
          response?.data?.vaultName || response?.data?.vaultAddress || "Vault";
        tokenSeparatedData.push({ token: label, data: sortedData });

        setChartData(tokenSeparatedData);
      } catch (err: any) {
        const message =
          err?.response?.data?.detail ||
          err?.message ||
          "Failed to fetch price chart data";
        setError(message);
        console.error("Error fetching price chart data (latest):", err);
        setChartData([]);
      } finally {
        setIsChartLoading(false);
      }
    },
    []
  );

  const fetchVaultData = useCallback(async () => {
    try {
      setVaultError(null);
      setIsVaultLoading(true);

      const response: LatestVaultsResponse =
        await yieldMonitorService.getVaultDetails();

      const vaults = response?.data ?? [];
      setAllVaultData(vaults);
      setIsVaultLoading(false);
    } catch (error) {
      console.error("Error fetching price data:", error);
      setVaultError(
        error instanceof Error ? error.message : "Failed to fetch price data"
      );
      setIsVaultLoading(false);
    }
  }, []);

  const refreshVaultsData = useCallback(() => {
    fetchVaultData();
  }, [fetchVaultData]);

  const fetchVolumeSummary = useCallback(async () => {
    try {
      const volumeData = await yieldMonitorService.getVolumeSummary();
      if (volumeData.success && volumeData.data?.grandTotal) {
        const vol = parseFloat(
          volumeData.data.grandTotal.totalDepositsFormatted
        );
        setTotalVolume(vol);
      }
    } catch (error) {
      console.error("Error fetching volume summary:", error);
    }
  }, []);

  const initialized = React.useRef(false);

  // Fetch data on mount
  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true;
      fetchVaultData();
      fetchVolumeSummary();
    }
  }, [fetchVaultData, fetchVolumeSummary]);

  const getVaultDataByToken = useCallback(
    (token: string) => {
      return allVaultData.find((item) => item.underlyingSymbol === token);
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
      .filter((v) => typeof v === "number") as number[];
    if (apys.length === 0) return 0;
    const sum = apys.reduce((acc, v) => acc + v, 0);
    return sum / apys.length;
  }, [allVaultData]);

  const getHighest24APY = useCallback(() => {
    const apys = allVaultData
      .map((item) => item.apy?.apy)
      .filter((v) => typeof v === "number") as number[];
    return apys.length === 0 ? 0 : Math.max(...apys);
  }, [allVaultData]);

  const getHighest7APY = useCallback(() => {
    const apys = allVaultData
      .map((item) => item.apy?.apy7d)
      .filter((v) => typeof v === "number") as number[];
    return apys.length === 0 ? 0 : Math.max(...apys);
  }, [allVaultData]);

  const get24APY = useCallback(() => {
    const item = allVaultData[0];
    const apy = item?.apy?.apy1d ?? 0;
    return Number(apy) || 0;
  }, [allVaultData]);

  const get7APY = useCallback(() => {
    const item = allVaultData[0];
    const apy = item?.apy?.apy7d ?? 0;
    return Number(apy) || 0;
  }, [allVaultData]);

  const get30APY = useCallback(() => {
    const item = allVaultData[0];
    const apy = item?.apy?.apy30d ?? 0;
    return Number(apy) || 0;
  }, [allVaultData]);

  const [userPoints, setUserPoints] = useState<PointsResponse | null>(null);

  const fetchUserPoints = useCallback(async (address: string) => {
    try {
      const data = await yieldMonitorService.getPointsByProtocol(address);
      setUserPoints(data);
    } catch (error) {
      console.error("Error fetching user points:", error);
    }
  }, []);

  const value = useMemo(
    () => ({
      chartData,
      isChartLoading,
      error,
      fetchChart,
      fetchVaultData,
      isVaultLoading,
      vaultError,
      refreshVaultsData,
      allVaultData,
      getVaultDataByToken,
      getVaultDataByAddress,
      getAverageAPY,
      getHighest24APY,
      getHighest7APY,
      get24APY,
      get7APY,
      get30APY,
      totalVolume,
      fetchVolumeSummary,
      userPoints,
      fetchUserPoints,
    }),
    [
      chartData,
      isChartLoading,
      error,
      fetchChart,
      fetchVaultData,
      isVaultLoading,
      vaultError,
      refreshVaultsData,
      allVaultData,
      getVaultDataByToken,
      getVaultDataByAddress,
      getAverageAPY,
      getHighest24APY,
      getHighest7APY,
      get24APY,
      get7APY,
      get30APY,
      totalVolume,
      fetchVolumeSummary,
      userPoints,
      fetchUserPoints,
    ]
  );

  return (
    <VaultApiContext.Provider value={value}>
      {children}
    </VaultApiContext.Provider>
  );
};

export const useVaultApi = () => {
  const context = useContext(VaultApiContext);
  if (context === undefined) {
    throw new Error("useVaultApiContext must be used within a VaultApiProvider");
  }
  return context;
};
