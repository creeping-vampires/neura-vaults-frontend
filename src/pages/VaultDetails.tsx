import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  Suspense,
} from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft,
  TrendingUp,
  DollarSign,
  Clock,
  ExternalLink,
  Target,
  CheckCircle,
  XCircle,
  Loader2,
} from "lucide-react";
import { useMultiVault } from "@/hooks/useMultiVault";
import { usePrice } from "@/hooks/usePrice";
// Removed usePrivy login; wallet connection is derived from useActiveWallet
import { useUserAccess } from "@/hooks/useUserAccess";
import { getExplorerTxUrl } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  XAxis,
  YAxis,
  CartesianGrid,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  Area,
  AreaChart,
} from "recharts";
import { explorerUrl } from "@/utils/constant";
import AgentConsole from "@/components/AgentConsole";
import AccessCodeModal from "@/components/AccessCodeModal";
import { useActiveWallet } from "@/hooks/useActiveWallet";

const VaultActivity = React.lazy(() => import("@/components/VaultActivity"));
import VaultActionPanel from "@/components/VaultActionPanel";

const chartConfig = {
  value: {
    label: "Value",
    color: "#10B981",
  },
  apy: {
    label: "APY",
    color: "#3B82F6",
  },
};

const getPoolName = (address: string, symbol: string): string => {
  const poolNames: { [key: string]: string } = {
    "0xceCcE0EB9DD2Ef7996e01e25DD70e461F918A14b": "Hypurrfi",
    "0x00A89d7a5A02160f20150EbEA7a2b5E4879A1A8b": "Hyperlend",
    [symbol === "USDT0"
      ? "0xFc5126377F0efc0041C0969Ef9BA903Ce67d151e"
      : "0x835FEBF893c6DdDee5CF762B0f8e31C5B06938ab"]: "Felix",
  };

  return (
    poolNames[address] || `Pool ${address.slice(0, 6)}...${address.slice(-4)}`
  );
};

const useCountdown = () => {
  const [timeLeft, setTimeLeft] = useState({ minutes: 0, seconds: 0 });

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date();
      const currentMinutes = now.getMinutes();
      const nextSettlement = new Date(now);

      if (currentMinutes < 30) {
        nextSettlement.setMinutes(30, 0, 0);
      } else {
        nextSettlement.setHours(now.getHours() + 1, 0, 0, 0);
      }

      const difference = nextSettlement.getTime() - now.getTime();

      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((difference % (1000 * 60)) / 1000);

      return { minutes, seconds };
    };

    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 60000); // Update every minute

    setTimeLeft(calculateTimeLeft());
    return () => clearInterval(timer);
  }, []);

  return timeLeft;
};

const VaultDetails = () => {
  const { minutes } = useCountdown();
  const { vaultId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const multiVaultData = useMultiVault();
  const { getTotalTVL, getVaultClientByAddress } = multiVaultData;

  // Use dynamic vault client based on route address
  const vaultDataObject = useMemo(
    () => getVaultClientByAddress(vaultId || ""),
    [getVaultClientByAddress, vaultId]
  );
  const {
    deposit,
    withdraw,
    claimRedeem,
    getClaimableDepositAmount,
    getClaimableRedeemAmount,
    isDepositTransacting,
    isWithdrawTransacting,
    refreshData,
    pendingDepositAssets,
    pendingRedeemShares,
    ...vaultData
  } = vaultDataObject;

  const { hasAccess } = useUserAccess();
  const [txCanceled,setTxCanceled] = useState(false);

  const [totalAUM, setTotalAUM] = useState(0);

  useEffect(() => {
    const calculateTotalAUM = async () => {
      try {
        const total = await getTotalTVL();
        setTotalAUM(total);
      } catch (error) {
        console.error("Error calculating total AUM:", error);
        setTotalAUM(0);
      }
    };

    calculateTotalAUM();
  }, [getTotalTVL]);

  const {
    chartData: priceChartData,
    isLoading: chartLoading,
    error: chartError,
    fetchPriceChart,
    isPriceLoading,
    get24APY,
    get7APY,
    // Add dynamic vault helpers
    allVaultData,
    getVaultDataByAddress,
    priceData,
  } = usePrice();

  const [selectedTimeframe, setSelectedTimeframe] = useState<"7D" | "1M">("7D");
  const [chartData, setChartData] = useState([]);

  // Derive current vault symbol dynamically from live data
  const currentVault =
    (vaultId && getVaultDataByAddress(vaultId)?.symbol) ||
    priceData.token ||
    "";
  const currentVaultName =
    (vaultId && getVaultDataByAddress(vaultId)?.name) ||
    currentVault ||
    "Vault";

  const { userAddress } = useActiveWallet();

  useEffect(() => {
    if (!selectedTimeframe || !vaultId) {
      return;
    }

    fetchPriceChart({ address: vaultId, timeframe: selectedTimeframe });
  }, [selectedTimeframe, vaultId, fetchPriceChart]);

  useEffect(() => {
    if (!priceChartData || priceChartData.length === 0) {
      setChartData([]);
      return;
    }

    const allTransformed = [];

    const relevantTokenData = priceChartData;

    relevantTokenData.forEach((tokenData) => {
      const points = (tokenData as any).dataPoints || tokenData.data || [];
      const tokenTransformed = points
        ?.map((point: any) => {
          const tsRaw = point.timestamp as number | string;
          const tsNum =
            typeof tsRaw === "number" ? tsRaw : Date.parse(tsRaw as string);
          const ts = isNaN(tsNum)
            ? Date.now()
            : tsNum < 1e12
            ? tsNum * 1000
            : tsNum;

          // Focus only on share price and timestamp
          const spRaw = point.share_price_formatted ?? point.sharePrice;
          let valueNum: number = 0;

          if (typeof spRaw === "string") {
            const parsed = parseFloat(spRaw.replace(/[^0-9.\-]/g, ""));
            valueNum = isNaN(parsed) ? 0 : parsed;
          } else if (typeof spRaw === "number") {
            valueNum = spRaw;
          } else if (
            point.totalAssets !== undefined &&
            point.totalSupply !== undefined
          ) {
            const totalAssetsNum = Number(point.totalAssets);
            const totalSupplyNum = Number(point.totalSupply);
            valueNum = totalSupplyNum > 0 ? totalAssetsNum / totalSupplyNum : 0;
          }

          const formattedValue = isNaN(valueNum)
            ? 0
            : parseFloat(valueNum.toFixed(8));

          return {
            date: ts,
            value: formattedValue,
          } as any;
        })
        .filter((d: any) => typeof d.date === "number" && !isNaN(d.date));

      if (tokenTransformed) {
        allTransformed.push(...tokenTransformed);
      }
    });

    allTransformed.sort((a, b) => a.date - b.date);

    setChartData(allTransformed);
  }, [priceChartData]);

  const [showAccessCodeModal, setShowAccessCodeModal] = useState(false);

  const [claimableDepositAssets, setClaimableDepositAssets] =
    useState<number>(0);
  const [claimableWithdrawAssets, setClaimableWithdrawAssets] =
    useState<number>(0);

  const refreshClaimableDeposit = useCallback(async () => {
    try {
      const amount = await getClaimableDepositAmount?.();
      setClaimableDepositAssets(amount || 0);
    } catch (e) {
      console.log("error refreshing withdraw claimable", e);
    }
  }, [getClaimableDepositAmount]);

  const refreshClaimableWithdraw = useCallback(async () => {
    try {
      const amount = await getClaimableRedeemAmount?.();
      setClaimableWithdrawAssets(amount || 0);
    } catch (e) {
      console.log("error refreshing withdraw claimable", e);
    }
  }, [getClaimableRedeemAmount]);

  // Initial refresh and on vault/auth changes
  const isConnected = Boolean(userAddress);
  useEffect(() => {
    refreshClaimableDeposit();
    refreshClaimableWithdraw();
  }, [vaultId, isConnected, refreshClaimableWithdraw]);

  useEffect(() => {
    if (pendingRedeemShares > 0n) {
      refreshClaimableWithdraw();
      const t = setInterval(() => {
        refreshClaimableWithdraw();
      }, 30000);
      return () => clearInterval(t);
    }
  }, [pendingRedeemShares, refreshClaimableWithdraw]);

  useEffect(() => {
    if (pendingDepositAssets > 0n) {
      refreshClaimableDeposit();
      const t = setInterval(() => {
        refreshClaimableDeposit();
      }, 30000);
      return () => clearInterval(t);
    }
  }, [pendingDepositAssets, refreshClaimableDeposit]);

  const timeframes = ["7D", "1M"] as const;

  // Calculate pool composition data from vaultData
  const dynamicPoolData = useMemo(() => {
    if (
      !vaultData.poolAddresses ||
      !vaultData.poolTVLs ||
      vaultData.poolAddresses.length === 0
    ) {
      return [];
    }

    const vaultSymbol = currentVault || "USDC";

    const validPools = vaultData.poolAddresses
      .map((address, index) => {
        const poolName = getPoolName(address, vaultSymbol);
        if (!["Felix", "Hypurrfi", "Hyperlend"].includes(poolName)) {
          return null;
        }
        return {
          address,
          tvl: vaultData.poolTVLs[index] || 0,
          apr: vaultData.poolNetAPRs[index] || 0,
          poolName,
        };
      })
      .filter((pool) => pool !== null);

    const totalTVL = validPools.reduce((sum, pool) => sum + pool!.tvl, 0);

    return validPools.map((pool) => {
      const percentage = totalTVL > 0 ? (pool!.tvl / totalTVL) * 100 : 0;
      return {
        name: pool!.poolName,
        value: parseFloat(percentage.toFixed(1)),
        tvl: pool!.tvl,
        apr: pool!.apr,
        color:
          pool!.poolName === "Felix"
            ? "#10B981"
            : pool!.poolName === "Hypurrfi"
            ? "#3B82F6"
            : "#F59E0B",
      };
    });
  }, [
    vaultData.poolAddresses,
    vaultData.poolTVLs,
    vaultData.poolNetAPRs,
    vaultId,
  ]);

  return (
    <div className="container mx-auto p-4 sm:p-6 max-w-7xl">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 sm:mb-6 gap-3">
        <div className="flex items-center space-x-3 sm:space-x-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="hover:bg-accent flex-shrink-0"
          >
            <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
          </Button>
          <div>
            <h1 className="text-lg sm:text-2xl font-medium text-[#e4dfcb] font-libertinus whitespace-nowrap">
              {currentVaultName} Vault
            </h1>
            <div className="flex items-center space-x-2 mt-0.5">
              <Badge
                variant="secondary"
                className="bg-primary/10 text-primary border-primary/20 text-xs"
              >
                {currentVault}
              </Badge>
            </div>
          </div>
        </div>
        <div className="flex gap-3">
          {/* Pending Deposits Section */}
          {(pendingDepositAssets > 0n || claimableDepositAssets > 0) && (
            <Card className="bg-gradient-to-br from-card/50 to-background/50 mt-3 px-3 pt-1 pb-1.5 border border-primary/20 rounded-md flex items-center gap-3 relative overflow-hidden">
              <div className="absolute bottom-0 left-0 h-0.5 w-full bg-primary/20 overflow-hidden">
                <div className="h-full bg-primary/60 animate-progress" />
              </div>
              <div className="">
                <span className="text-primary text-sm font-medium">
                  Pending Deposit
                </span>
                <p className="text-xs text-muted-foreground">
                  Deposit settlement in progress. Shares will be available
                  shortly after confirmation.
                </p>
              </div>
              {/* Cancel / Claim UX */}
              <div className="ml-auto flex items-center gap-2">
                {pendingDepositAssets > 0n && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-xs border border-primary/40 hover:border-primary"
                    onClick={async () => {
                      try {
                        const vc = multiVaultData.getVaultClientByAddress(vaultId || "");
                        await vc.cancelDepositRequest?.();
                        setTxCanceled(true);
                        await refreshData?.();
                        await multiVaultData.refreshAllData?.();
                      } catch (error: any) {
                        toast({
                          variant: "destructive",
                          title: "Cancel Failed",
                          description: error?.message || "Unable to cancel pending deposit.",
                        });
                      }
                    }}
                  >
                    Cancel
                  </Button>
                )}
                {claimableDepositAssets > 0 && (
                  <Button
                    size="sm"
                    variant="wallet"
                    className="text-xs border-2 border-primary/60 hover:border-primary"
                    onClick={async () => {
                      try {
                        const vc = multiVaultData.getVaultClientByAddress(vaultId || "");
                        await vc.claimDeposit?.();
                        await refreshData?.();
                        await multiVaultData.refreshAllData?.();
                      } catch (error: any) {
                        toast({
                          variant: "destructive",
                          title: "Claim Failed",
                          description: error?.message || "Unable to claim deposit shares.",
                        });
                      }
                    }}
                  >
                    Claim Shares
                  </Button>
                )}
              </div>
            </Card>
          )}

          {/* Pending Withdrawals Section */}
          {pendingRedeemShares > 0n && claimableWithdrawAssets === 0 && (
            <Card className="bg-gradient-to-br from-card/50 to-background/50 mt-3 px-3 pt-1 pb-1.5 border border-primary/20 rounded-md flex items-center gap-3 relative overflow-hidden">
              <div className="absolute bottom-0 left-0 h-0.5 w-full bg-primary/20 overflow-hidden">
                <div className="h-full bg-primary/60 animate-progress" />
              </div>
              <div className="">
                <span className="text-primary text-sm font-medium">
                  Pending Withdrawal
                </span>
                <p className="text-xs text-muted-foreground">
                  Withdrawal settlement in progress. Please wait for
                  confirmation, then withdraw your assets.
                </p>
              </div>
            </Card>
          )}

          {claimableWithdrawAssets > 0 && (
            <Card className="bg-gradient-to-br from-card/50 to-background/50 mt-3 px-3 py-1 border border-primary/20 rounded-md flex items-center gap-3">
              <div className="">
                <span className="text-primary text-sm font-medium">
                  Pending Withdrawal
                </span>
                <p className="text-xs text-muted-foreground">
                  Your withdrawal is ready—claim your assets to withdraw
                </p>
              </div>
              <Button
                onClick={async () => {
                  try {
                    await claimRedeem?.();
                    await refreshClaimableWithdraw();
                    refreshData();
                  } catch (error: any) {
                    console.error("Error claiming withdraw:", error);
                    toast({
                      variant: "destructive",
                      title: "Claim Failed",
                      description:
                        error?.message ||
                        "Unable to claim withdrawal assets. Please try again.",
                    });
                  }
                }}
                size="sm"
                variant="wallet"
                className="text-xs border-2 border-primary/60 hover:border-primary transition-all duration-300 relative overflow-hidden"
              >
                Withdraw Assets
              </Button>
            </Card>
          )}
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-4 sm:gap-6 -mt-2">
        <div className="flex-1 space-y-4 sm:space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-6">
            <Card className="bg-gradient-to-br from-card/50 to-background/50 border-border shadow-xl min-h-[140px] sm:h-[170px] z-10">
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center justify-between mb-3 sm:mb-4">
                  <h3 className="text-muted-foreground text-xs sm:text-sm font-medium">
                    Total Value Locked
                  </h3>
                  <DollarSign className="h-4 w-4 sm:h-5 sm:w-5 text-foreground" />
                </div>
                {vaultData?.isLoading ? (
                  <div className="text-muted-foreground text-sm">
                    Loading...
                  </div>
                ) : vaultData?.error ? (
                  <div className="text-red-500 text-sm">{vaultData.error}</div>
                ) : (
                  <>
                    <p className="text-xl sm:text-2xl font-bold text-foreground">
                      $
                      {totalAUM.toLocaleString(undefined, {
                        maximumFractionDigits: 4,
                      })}
                    </p>
                    <div className="flex items-center mt-1">
                      <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 text-primary mr-1" />
                      <span className="text-primary text-xs sm:text-sm font-medium">
                        {isPriceLoading ? "Loading..." : get24APY().toFixed(2)}%
                        APY (24h)
                      </span>
                      <div className="flex items-center gap-1 relative">
                        <div className="h-6 w-6 group relative flex items-center justify-center rounded-md">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="text-foreground"
                          >
                            <circle cx="12" cy="12" r="10" />
                            <path d="M12 16v-4" />
                            <path d="M12 8h.01" />
                          </svg>
                          <div className="flex items-center gap-1 absolute top-8 left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-[#262626] rounded-md shadow-lg text-sm invisible opacity-0 group-hover:visible group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap">
                            <div className="font-medium text-muted-foreground">
                              7-Day APY
                            </div>
                            <div className="font-medium text-foreground">:</div>
                            <div className="font-medium ml-1 text-foreground">
                              {get7APY() ? get7APY().toFixed(2) : "-"}
                            </div>
                            <div className="absolute top-[-4px] left-1/2 -translate-x-1/2 w-2 h-2 bg-[#262626] rotate-45"></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-card/50 to-background/50 border-border shadow-xl min-h-[140px] sm:h-[170px]">
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center justify-between mb-3 sm:mb-4">
                  <h3 className="text-muted-foreground text-xs sm:text-sm font-medium">
                    Your Position
                  </h3>
                  <Target className="h-4 w-4 sm:h-5 sm:w-5 text-foreground" />
                </div>
                {vaultData?.userDeposits && vaultData.userDeposits > 0 ? (
                  <>
                    <p className="text-xl sm:text-2xl font-bold text-foreground">
                      {vaultData.userDeposits.toFixed(4)}
                    </p>
                    <div className="flex items-center mt-1">
                      <span className="text-muted-foreground text-xs sm:text-sm font-medium">
                        Shares: {vaultData.userShares?.toFixed(4) || "0.0000"}
                      </span>
                    </div>

                    {vaultData.compoundedYield > 0 && (
                      <div className="flex items-center mt-1">
                        <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 text-primary mr-1" />
                        <span className="text-primary text-xs sm:text-sm font-medium">
                          +{vaultData.compoundedYield.toFixed(4)} yield
                        </span>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <p className="text-base sm:text-lg font-bold text-foreground">
                      No position available yet
                    </p>
                    <p className="text-muted-foreground text-xs sm:text-sm mt-2">
                      Make a deposit to start building your position.
                    </p>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          <Card className="bg-gradient-to-br from-card/50 to-background/50 border-border shadow-xl">
            <CardHeader className="pb-2 sm:pb-6">
              <div className="flex flex-row items-start sm:items-center justify-between gap-3">
                <CardTitle className="text-[#e4dfcb] font-bold sm:text-lg">
                  Performance
                </CardTitle>
                <div className="flex items-center space-x-1 sm:space-x-2 overflow-x-auto w-full sm:w-auto">
                  {timeframes.map((timeframe) => (
                    <Button
                      key={timeframe}
                      variant={
                        selectedTimeframe === timeframe ? "default" : "ghost"
                      }
                      size="sm"
                      onClick={() => setSelectedTimeframe(timeframe)}
                      className="text-xs flex-shrink-0 px-2 sm:px-3"
                    >
                      {timeframe}
                    </Button>
                  ))}
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="h-full w-full sm:px-10">
                {chartLoading ? (
                  <div className="flex items-center justify-center h-64">
                    <div className="text-muted-foreground">
                      Loading performance data...
                    </div>
                  </div>
                ) : chartError ? (
                  <div className="flex items-center justify-center h-64">
                    <div className="text-muted-foreground">
                      Failed to load performance data
                    </div>
                  </div>
                ) : chartData.length === 0 ? (
                  <div className="flex items-center justify-center h-64">
                    <div className="text-muted-foreground">
                      No performance data available
                    </div>
                  </div>
                ) : (
                  <ChartContainer config={chartConfig}>
                    <AreaChart
                      data={chartData}
                      style={{
                        cursor: "pointer",
                        backgroundBlur: 1,
                      }}
                    >
                      <defs>
                        <linearGradient
                          id="valueGradient"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="5%"
                            stopColor="#00d6c1"
                            stopOpacity={0.3}
                          />
                          <stop
                            offset="95%"
                            stopColor="#00d6c1"
                            stopOpacity={0}
                          />
                        </linearGradient>
                      </defs>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="#374151"
                        opacity={0.2}
                      />
                      <XAxis
                        dataKey="date"
                        stroke="#404040"
                        fontSize={12}
                        tickFormatter={(value) => {
                          const date = new Date(value);
                          return selectedTimeframe === "7D"
                            ? date.toLocaleTimeString("en-US", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : date.toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                              });
                        }}
                      />
                      <YAxis
                        stroke="#404040"
                        fontSize={12}
                        domain={["dataMin * 0.999", "dataMax * 1.001"]}
                        tickCount={6}
                        tickFormatter={(value) => value?.toFixed(4)}
                      />
                      <ChartTooltip
                        content={
                          <ChartTooltipContent
                            formatter={(value, name, props) => {
                              if (name === "value") {
                                const numValue =
                                  typeof value === "number"
                                    ? value
                                    : parseFloat(String(value));
                                const label = `${currentVault} Share Price`;
                                return [numValue?.toFixed(4), label];
                              }
                              return [value, name];
                            }}
                          />
                        }
                        labelFormatter={(label, payload) => {
                          return `${currentVault} - Share Price`;
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="value"
                        stroke="#00d6c1"
                        strokeWidth={2.5}
                        fill="url(#valueGradient)"
                        connectNulls={true}
                        dot={false}
                        activeDot={{
                          r: 4,
                          stroke: "#00d6c1",
                          strokeWidth: 2,
                          fill: "#00d6c1",
                        }}
                      />
                    </AreaChart>
                  </ChartContainer>
                )}
              </div>
            </CardContent>
          </Card>

          <Tabs defaultValue="details" className="w-full">
            <TabsList className="h-10 sm:h-12 bg-gradient-to-br from-card to-background backdrop-blur-sm border border-border/50 rounded-lg">
              <TabsTrigger
                value="details"
                className="data-[state=active]:bg-[#262626] data-[state=active]:text-foreground data-[state=active]:shadow-none rounded-md px-2 py-1 sm:px-4 sm:py-2 text-xs sm:text-sm font-medium transition-colors text-muted-foreground hover:text-foreground"
              >
                Details
              </TabsTrigger>
              <TabsTrigger
                value="pools"
                className="data-[state=active]:bg-[#262626] data-[state=active]:text-foreground data-[state=active]:shadow-none rounded-md px-2 py-1 sm:px-4 sm:py-2 text-xs sm:text-sm font-medium transition-colors text-muted-foreground hover:text-foreground"
              >
                Whitelisted Pools
              </TabsTrigger>
              <TabsTrigger
                value="composition"
                className="data-[state=active]:bg-[#262626] data-[state=active]:text-foreground data-[state=active]:shadow-none rounded-md px-2 py-1 sm:px-4 sm:py-2 text-xs sm:text-sm font-medium transition-colors text-muted-foreground hover:text-foreground"
              >
                Composition
              </TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="mt-4 sm:mt-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                <Card className="bg-gradient-to-br from-card/50 to-background/50 border-border shadow-xl">
                  <CardHeader className="pb-3 sm:pb-6">
                    <CardTitle className="text-[#e4dfcb] font-bold sm:text-lg">
                      About this Vault
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 sm:space-y-4 pt-0">
                    <p className="text-muted-foreground text-xs sm:text-sm leading-relaxed">
                      Autonomous Liquidity {currentVault} is a tokenized AI
                      yield optimization strategy that maximizes risk-adjusted
                      returns on stablecoin investments across numerous DeFi
                      protocols. By continuously scanning the DeFi.
                    </p>

                    {/* <div className="space-y-2 sm:space-y-3 pt-3 sm:pt-4">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground text-xs sm:text-sm">
                          Total Pending Deposits
                        </span>
                        <span className="text-foreground font-medium text-xs sm:text-sm">
                          {vaultData.pendingDepositAssets?.toFixed(4) || "0.00"}{" "}
                          {currentVault}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground text-xs sm:text-sm">
                          Total Pending Withdrawals
                        </span>
                        <span className="text-foreground font-medium text-xs sm:text-sm">
                          {vaultData.totalRequestedAssets?.toFixed(4) || "0.00"}{" "}
                          {currentVault}
                        </span>
                      </div>
                    </div> */}

                    <div className="pt-3 sm:pt-4">
                      <h4 className="text-foreground font-medium mb-2 sm:mb-3 text-sm">
                        Allowed Protocols
                      </h4>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs sm:text-sm">
                          <span className="text-muted-foreground">
                            Felix, Hypurrfi & Hyperlend
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Suspense
                  fallback={
                    <Card className="bg-gradient-to-br from-card/50 to-background/50 border-border shadow-xl">
                      <CardHeader className="pb-3 sm:pb-6">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-[#e4dfcb] font-bold sm:text-lg">
                            Vault Activity
                          </CardTitle>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="text-muted-foreground text-sm text-center py-4">
                          Loading activities...
                        </div>
                      </CardContent>
                    </Card>
                  }
                >
                  <VaultActivity
                    vaultId={vaultId}
                    currentVault={currentVault}
                  />
                </Suspense>
              </div>
            </TabsContent>

            <TabsContent value="pools" className="mt-4 sm:mt-6">
              <Card className="bg-gradient-to-br from-card/50 to-background/50 border-border shadow-xl">
                <CardHeader>
                  <CardTitle className="text-[#e4dfcb] font-bold sm:text-lg">
                    Active Pools
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {(() => {
                      const currentVaultData = vaultId
                        ? getVaultDataByAddress(vaultId)
                        : null;
                      const allocations = currentVaultData?.allocations || [];

                      return allocations.length > 0 ? (
                        allocations.map((allocation, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-between p-4 bg-gradient-to-r from-card/30 to-background/30 rounded-lg border border-border/50"
                          >
                            <div className="flex items-center space-x-3">
                              <div className="w-8 h-8 bg-secondary rounded-full flex items-center justify-center">
                                <img
                                  src={`/pools/${allocation.protocol.toLowerCase()}.svg`}
                                  alt={allocation.protocol}
                                  className="min-w-9 h-9 rounded-full border border-white/50 transform hover:scale-110 transition-transform duration-200 cursor-pointer"
                                  onError={(e) => {
                                    const target = e.target as HTMLImageElement;
                                    target.style.display = "none";
                                    target.parentElement!.innerHTML = `<div class="w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center text-primary font-bold text-sm">${allocation.protocol
                                      .charAt(0)
                                      .toUpperCase()}</div>`;
                                  }}
                                />
                              </div>
                              <div>
                                <p className="text-foreground font-medium">
                                  {allocation.name}
                                </p>
                                {/* <p className="text-muted-foreground text-sm">
                                  {allocation.protocol}
                                </p> */}
                              </div>
                            </div>
                            <div className="flex items-center space-x-3">
                              <div className="text-right">
                                <p className="text-foreground font-medium">
                                  {allocation.currentAPY.toFixed(2)}% APY
                                </p>
                                <p className="text-muted-foreground text-sm">
                                  Current Rate
                                </p>
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-8">
                          <p className="text-muted-foreground">
                            No protocol allocations found for this vault.
                          </p>
                        </div>
                      );
                    })()}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="composition" className="mt-4 sm:mt-6">
              <Card className="bg-gradient-to-br from-card/50 to-background/50 border-border shadow-xl">
                <CardHeader>
                  <CardTitle className="text-[#e4dfcb] font-bold sm:text-lg">
                    Portfolio Composition
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {vaultData.isLoading ? (
                    <div className="flex items-center justify-center h-[300px]">
                      <Loader2 className="h-8 w-8 animate-spin" />
                    </div>
                  ) : vaultData.poolAddresses &&
                    vaultData.poolAddresses.length > 0 ? (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-8">
                      <div>
                        <h3 className="text-foreground font-medium mb-4">
                          By Protocol
                        </h3>
                        <div className="h-[250px]">
                          <ChartContainer
                            config={chartConfig}
                            className="w-full h-full"
                          >
                            <RechartsPieChart>
                              <ChartTooltip content={<ChartTooltipContent />} />
                              <Pie
                                data={dynamicPoolData}
                                dataKey="value"
                                nameKey="name"
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={120}
                              >
                                {dynamicPoolData.map((entry, index) => (
                                  <Cell
                                    key={`cell-${index}`}
                                    fill={entry.color}
                                  />
                                ))}
                              </Pie>
                            </RechartsPieChart>
                          </ChartContainer>
                        </div>
                      </div>
                      <div>
                        <h3 className="text-foreground font-medium mb-4">
                          Pool Details
                        </h3>
                        <div className="space-y-3">
                          {dynamicPoolData.map((item, index) => (
                            <div
                              key={index}
                              className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                            >
                              <div className="flex items-center space-x-3">
                                <div
                                  className="w-4 h-4 rounded-full"
                                  style={{ backgroundColor: item.color }}
                                />
                                <div>
                                  <span className="text-foreground font-medium block">
                                    {item.name}
                                  </span>
                                  <span className="text-xs text-muted-foreground">
                                    TVL: ${item.tvl.toFixed(2)}
                                  </span>
                                </div>
                              </div>
                              <div className="text-right">
                                <span className="text-foreground font-medium block">
                                  {item.value}%
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-muted-foreground">
                        No pool composition data available.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        <div className="w-full lg:w-80 flex-shrink-0 space-y-4 sm:space-y-6">
          <div className="sticky top-6 space-y-4 sm:space-y-6">
            <VaultActionPanel
              currentVault={currentVault}
              availableAssetBalance={vaultData?.assetBalance}
              availableUserDeposits={vaultData?.userDeposits}
              deposit={deposit}
              withdraw={withdraw}
              isDepositTransacting={isDepositTransacting}
              isWithdrawTransacting={isWithdrawTransacting}
              vaultId={vaultId}
              refreshData={refreshData}
              isConnected={isConnected}
              hasAccess={hasAccess}
              txCanceled={txCanceled}
              onRequireAccess={() => setShowAccessCodeModal(true)}
              pendingDepositAssets={pendingDepositAssets}
              pendingRedeemShares={pendingRedeemShares}
              claimableDepositAssets={claimableDepositAssets}
              claimableWithdrawAssets={claimableWithdrawAssets}
            />

            <Card className="bg-gradient-to-br from-card/50 to-background/50 border-border shadow-xl h-[115px]">
              <CardContent className="py-3 px-4 sm:py-4 sm:px-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-muted-foreground text-xs sm:text-sm font-medium">
                    Next vault settlement
                  </h3>
                  <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-foreground" />
                </div>
                <p className="text-base sm:text-lg font-bold text-foreground">
                  {minutes} Minutes
                </p>
                <p className="text-xs text-muted-foreground mt-0.5 sm:mt-1">
                  Settlement: Every 30 minutes
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <AgentConsole vaultId={vaultId} currentVault={currentVault} />

      <AccessCodeModal
        isOpen={showAccessCodeModal}
        onClose={() => setShowAccessCodeModal(false)}
        hasAccess={hasAccess}
      />
    </div>
  );
};

export default VaultDetails;
