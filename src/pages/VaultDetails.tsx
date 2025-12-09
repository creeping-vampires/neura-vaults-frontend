import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  Suspense,
  } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft,
  TrendingUp,
  DollarSign,
  Clock,
  Target,
  Loader2,
} from "lucide-react";
import { useVaultContract } from "@/hooks/useVaultContract";
import { useVaultApi } from "@/hooks/useVaultApi";
import { useUserAccess } from "@/hooks/useUserAccess";
import { useToast } from "@/hooks/use-toast";
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
import ChatBot from "@/components/ChatBot";
import yieldMonitorService from "@/services/vaultService";
import {
  VaultAllocationsResponse,
  TokenPriceData,
  LatestChartPoint,
} from "@/services/config";
import AccessCodeModal from "@/components/AccessCodeModal";
import { useAccount } from "wagmi";

const VaultActivity = React.lazy(() => import("@/components/VaultActivity"));
import VaultActionPanel from "@/components/VaultActionPanel";
import { formatUnits } from "viem";

const chartConfig = {
  value: {
    label: "Value",
    color: "#8884d8",
  },
  apy: {
    label: "APY",
    color: "#3B82F6",
  },
  tvl: {
    label: "TVL",
    color: "#00d6c1",
  },
};

const VaultDetails = () => {
  const { toast } = useToast();
  const { vaultId } = useParams();
  const navigate = useNavigate();

  const {
    getTotalTVL,
    getVaultByAddress,
    refreshAllData,
    deposit,
    withdraw,
    isDepositTransacting,
    isWithdrawTransacting,
    depositEventStatus,
    setDepositEventStatus,
    withdrawEventStatus,
    setWithdrawEventStatus,
    cancelDepositRequest,
    claimRedeem,
    getClaimableDepositAmount,
    getClaimableRedeemAmount,
    pendingDepositAssets,
    pendingRedeemShares,
  } = useVaultContract();

  const vaultData = useMemo(
    () => getVaultByAddress(vaultId),
    [getVaultByAddress, vaultId]
  );

  const { hasAccess } = useUserAccess();
  const [txCanceled, setTxCanceled] = useState(false);
  const [claimInProgress, setClaimInProgress] = useState(false);

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
    chartData: ChartData,
    isChartLoading: chartLoading,
    error: chartError,
    fetchChart,
    isVaultLoading,
    get24APY,
    get7APY,
    get30APY,
    getVaultDataByAddress,
  } = useVaultApi();

  const [selectedTimeframe, setSelectedTimeframe] = useState<"7D" | "1M">("7D");
  const [chartData, setChartData] = useState([]);

  const [currentVaultSymbol, setCurrentVaultSymbol] = useState("");
  const [currentAssetSymbol, setCurrentAssetSymbol] = useState("");
  const [currentVaultName, setCurrentVaultName] = useState("");

  useEffect(() => {
    if (!vaultId) return;
    const currentVaultData = getVaultDataByAddress(vaultId);
    setCurrentVaultSymbol(currentVaultData?.symbol);
    setCurrentAssetSymbol(currentVaultData?.underlyingSymbol);
    setCurrentVaultName(currentVaultData?.name);
  }, [vaultId, getVaultDataByAddress]);

  const { address: userAddress } = useAccount();

  const [allocationsLoading, setAllocationsLoading] = useState(false);
  const [allocationsError, setAllocationsError] = useState<string | null>(null);
  const [allocationsData, setAllocationsData] =
    useState<VaultAllocationsResponse | null>(null);

  useEffect(() => {
    if (!selectedTimeframe || !vaultId) {
      return;
    }

    fetchChart({ address: vaultId, timeframe: selectedTimeframe });
  }, [selectedTimeframe, vaultId, fetchChart]);

  useEffect(() => {
    const run = async () => {
      if (!vaultId) return;
      setAllocationsLoading(true);
      setAllocationsError(null);
      try {
        const res = await yieldMonitorService.getVaultAllocations(vaultId);
        setAllocationsData(res);
      } catch (err: unknown) {
        let msg = "Failed to load allocations";
        setAllocationsError(msg);
        setAllocationsData(null);
      } finally {
        setAllocationsLoading(false);
      }
    };
    run();
  }, [vaultId]);

  useEffect(() => {
    if (!ChartData || ChartData.length === 0) {
      setChartData([]);
      return;
    }

    const allTransformed: {
      date: number;
      value: number;
      tvl: number;
      apy: number;
    }[] = [];

    const relevantTokenData = ChartData;
    relevantTokenData.forEach((tokenData: TokenPriceData) => {
      const points = tokenData.data || [];

      let processedPoints = points;
      if (points.length > 500) {
        const step = Math.ceil(points.length / 500);
        processedPoints = points.filter(
          (_, index: number) => index % step === 0
        );
      }

      const tokenTransformed = processedPoints
        ?.map((point) => {
          const tsRaw = point.timestamp;
          const tsNum =
            typeof tsRaw === "number" ? tsRaw : Date.parse(tsRaw as string);
          const ts = isNaN(tsNum)
            ? Date.now()
            : tsNum < 1e12
            ? tsNum * 1000
            : tsNum;

          const spRaw = point.share_price_formatted;
          let valueNum: number = 0;
          if (typeof spRaw === "string") {
            const parsed = parseFloat(spRaw.replace(/[^0-9.-]/g, ""));
            valueNum = isNaN(parsed) ? 0 : parsed;
          } else if (typeof spRaw === "number") {
            valueNum = spRaw;
          }

          const formattedValue = isNaN(valueNum)
            ? 0
            : parseFloat(valueNum.toFixed(8));

          return {
            date: ts,
            value: formattedValue,
            tvl: point.tvl || 0,
            apy: point.apy || 0,
          };
        })
        .filter((d) => typeof d.date === "number" && !isNaN(d.date));

      if (tokenTransformed) {
        allTransformed.push(...tokenTransformed);
      }
    });
    allTransformed.sort((a, b) => a.date - b.date);

    setChartData(allTransformed);
  }, [ChartData]);

  const [showAccessCodeModal, setShowAccessCodeModal] = useState(false);

  const [claimableDepositAssets, setClaimableDepositAssets] =
    useState<number>(0);
  const [claimableWithdrawAssets, setClaimableWithdrawAssets] =
    useState<number>(0);

  const refreshClaimableDeposit = useCallback(async () => {
    try {
      const amount = await getClaimableDepositAmount?.(vaultId);
      setClaimableDepositAssets(amount || 0);
    } catch {
      // console.log("error refreshing withdraw claimable", e);
    }
  }, [getClaimableDepositAmount, vaultId]);

  const refreshClaimableWithdraw = useCallback(async () => {
    try {
      const amount = await getClaimableRedeemAmount?.(vaultId);
      setClaimableWithdrawAssets(amount || 0);
      // console.log("amount", amount);
    } catch {
      // console.log("error refreshing withdraw claimable", e);
    }
  }, [getClaimableRedeemAmount, vaultId]);

  const isLocalAuth = localStorage.getItem("auth") === "true";
  const isConnected = isLocalAuth || Boolean(userAddress);

  useEffect(() => {
    refreshClaimableDeposit();
    refreshClaimableWithdraw();
  }, [vaultId, isConnected, refreshClaimableDeposit, refreshClaimableWithdraw]);

  useEffect(() => {
    if (depositEventStatus === "settled") {
      setClaimableDepositAssets(0);
    }
  }, [depositEventStatus, refreshClaimableDeposit]);

  useEffect(() => {
    if (withdrawEventStatus === "settled") {
      setClaimableWithdrawAssets(0);
    }
  }, [withdrawEventStatus, refreshClaimableWithdraw]);

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

  const dynamicPoolData = useMemo(() => {
    const d = allocationsData?.data[0]?.allocations || [];
    if (!d || d.length === 0) return [];
    return d.map((a) => {
      const n = a.protocol;
      const pct = Number(a.percentage) || 0;
      const bal = (() => {
        const b = Number(
          formatUnits(BigInt(a.balance), vaultData?.assetDecimals)
        );
        return isNaN(b) ? 0 : b;
      })();
      const color =
        n === "safe"
          ? "#00d6c1"
          : n === "felix"
          ? "#b8b9be"
          : n === "hypurrFinance"
          ? "#3B82F6"
          : "#F59E0B";
      return { name: n, value: parseFloat(pct.toFixed(1)), tvl: bal, color };
    });
  }, [allocationsData, vaultData?.assetDecimals]);

  return (
    <div className="container mx-auto p-4 sm:p-6 sm:pt-4 max-w-7xl relative">
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
                {currentAssetSymbol}
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
                  Settlement in progress—your shares will arrive shortly.
                </p>
              </div>
              <div className="ml-auto flex items-center gap-2">
                {pendingDepositAssets > 0n && (
                  <Button
                    size="sm"
                    variant="wallet"
                    className="text-xs border border-primary/40 hover:border-primary"
                    onClick={async () => {
                      try {
                        await cancelDepositRequest?.(vaultId);
                        setTxCanceled(true);
                        await refreshAllData?.();
                      } catch (error: unknown) {
                        toast({
                          variant: "destructive",
                          title: "Cancel Failed",
                          description:
                            "Unable to cancel the pending deposit at this time.",
                        });
                      }
                    }}
                    disabled={claimableDepositAssets > 0}
                  >
                    Cancel
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
                  Settlement in progress—assets will be available to claim
                  shortly.
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
                    setClaimInProgress(true);
                    await claimRedeem?.(vaultId);
                    setClaimableWithdrawAssets(0);
                    toast({
                      title: "Settlement complete",
                      description: `Your Withdraw request has settled on-chain.`,
                    });
                    refreshAllData?.();
                  } catch (error: unknown) {
                    console.error("Error claiming withdraw:", error);
                    toast({
                      variant: "destructive",
                      title: "Claim Failed",
                      description:
                        (error instanceof Error
                          ? error.message
                          : String(error)) ||
                        "Unable to claim withdrawal assets. Please try again.",
                    });
                  } finally {
                    setClaimInProgress(false);
                  }
                }}
                size="sm"
                variant="wallet"
                disabled={claimInProgress}
                className="text-xs border-2 border-primary/60 hover:border-primary transition-all duration-300 relative overflow-hidden w-28"
              >
                {claimInProgress ? "Withdrawing..." : "Withdraw Assets"}
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
                <p className="text-xl sm:text-2xl font-bold text-foreground">
                  $
                  {totalAUM.toLocaleString(undefined, {
                    maximumFractionDigits: 4,
                  })}
                </p>
                <div className="flex items-center mt-1">
                  <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 text-primary mr-1" />
                  <span className="text-primary text-xs sm:text-sm font-medium">
                    {isVaultLoading ? "Loading..." : get7APY().toFixed(2)}% APY
                    (7d)
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
                      <div className="absolute top-7 left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-[#262626] rounded-md shadow-lg text-sm invisible opacity-0 group-hover:visible group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap">
                        <div className="absolute top-[-4px] left-1/2 -translate-x-1/2 w-2 h-2 bg-[#262626] rotate-45"></div>
                        <div className="flex items-center gap-1">
                          <div className="font-medium text-muted-foreground">
                            1-Day APY
                          </div>
                          <div className="font-medium text-foreground ml-auto">
                            :
                          </div>
                          <div className="font-medium text-foreground ml-1">
                            {get24APY() ? `${get24APY().toFixed(2)}%` : "-"}
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <div className="font-medium text-muted-foreground">
                            30-Day APY
                          </div>
                          <div className="font-medium text-foreground ml-auto">
                            :
                          </div>
                          <div className="font-medium text-foreground ml-1">
                            {get30APY() ? `${get30APY().toFixed(2)}%` : "-"}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
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
                      {vaultData.userDeposits.toFixed(4)} {currentVaultSymbol}
                    </p>
                    {/* <div className="flex items-center mt-1">
                      <span className="text-muted-foreground text-xs sm:text-sm font-medium">
                        aiUSDT: {vaultData.userShares?.toFixed(4) || "0.0000"}
                      </span>
                    </div> */}

                    {/* {vaultData.compoundedYield > 0 && (
                      <div className="flex items-center mt-1">
                        <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 text-primary mr-1" />
                        <span className="text-primary text-xs sm:text-sm font-medium">
                          +{vaultData.compoundedYield.toFixed(4)} yield
                        </span>
                      </div>
                    )} */}
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
            <Tabs defaultValue="tvl" className="w-full">
              <CardHeader className="pb-2 sm:pb-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <TabsList className="bg-gradient-to-br from-card to-background backdrop-blur-sm border border-border/80 rounded-lg">
                    <TabsTrigger
                      value="tvl"
                      className="data-[state=active]:bg-[#262626] data-[state=active]:text-foreground data-[state=active]:shadow-none rounded-md px-2 py-1 sm:px-4 text-xs sm:text-sm font-medium transition-colors text-muted-foreground hover:text-foreground"
                    >
                      TVL
                    </TabsTrigger>
                    <TabsTrigger
                      value="sharePrice"
                      className="data-[state=active]:bg-[#262626] data-[state=active]:text-foreground data-[state=active]:shadow-none rounded-md px-2 py-1 sm:px-4 text-xs sm:text-sm font-medium transition-colors text-muted-foreground hover:text-foreground"
                    >
                      Share Price
                    </TabsTrigger>
                    <TabsTrigger
                      value="apy"
                      className="data-[state=active]:bg-[#262626] data-[state=active]:text-foreground data-[state=active]:shadow-none rounded-md px-2 py-1 sm:px-4 text-xs sm:text-sm font-medium transition-colors text-muted-foreground hover:text-foreground"
                    >
                      APY
                    </TabsTrigger>
                  </TabsList>
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
                    <>
                      <TabsContent value="tvl" className="mt-4">
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
                                id="tvlGradient"
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
                              domain={["auto", "auto"]}
                              tickCount={6}
                              tickFormatter={(value) => {
                                if (value >= 1e9)
                                  return (value / 1e9).toFixed(2) + "B";
                                if (value >= 1e6)
                                  return (value / 1e6).toFixed(2) + "M";
                                if (value >= 1e3)
                                  return (value / 1e3).toFixed(2) + "K";
                                return value.toFixed(0);
                              }}
                            />
                            <ChartTooltip
                              content={
                                <ChartTooltipContent
                                  formatter={(value, name) => {
                                    if (name === "tvl") {
                                      const numValue =
                                        typeof value === "number"
                                          ? value
                                          : parseFloat(String(value));
                                      return [
                                        `$${numValue.toLocaleString()}`,
                                        ` ${currentAssetSymbol}`,
                                      ];
                                    }
                                    return [value, name];
                                  }}
                                />
                              }
                              labelFormatter={(label) => `TVL`}
                            />
                            <Area
                              type="monotone"
                              dataKey="tvl"
                              stroke="#00d6c1"
                              strokeWidth={2.5}
                              fill="url(#tvlGradient)"
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
                      </TabsContent>

                      <TabsContent value="sharePrice" className="mt-4">
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
                                  stopColor="#8884d8"
                                  stopOpacity={0.3}
                                />
                                <stop
                                  offset="95%"
                                  stopColor="#8884d8"
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
                                  formatter={(value, name) => {
                                    if (name === "value") {
                                      const numValue =
                                        typeof value === "number"
                                          ? value
                                          : parseFloat(String(value));
                                      const label = ` ${currentAssetSymbol}`;
                                      return [numValue?.toFixed(4), label];
                                    }
                                    return [value, name];
                                  }}
                                />
                              }
                              labelFormatter={(label, payload) => {
                                return `Share Price`;
                              }}
                            />
                            <Area
                              type="monotone"
                              dataKey="value"
                              stroke="#8884d8"
                              strokeWidth={2.5}
                              fill="url(#valueGradient)"
                              connectNulls={true}
                              dot={false}
                              activeDot={{
                                r: 4,
                                stroke: "#8884d8",
                                strokeWidth: 2,
                                fill: "#8884d8",
                              }}
                            />
                          </AreaChart>
                        </ChartContainer>
                      </TabsContent>

                      <TabsContent value="apy" className="mt-4">
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
                                id="apyGradient"
                                x1="0"
                                y1="0"
                                x2="0"
                                y2="1"
                              >
                                <stop
                                  offset="5%"
                                  stopColor="#3B82F6"
                                  stopOpacity={0.3}
                                />
                                <stop
                                  offset="95%"
                                  stopColor="#3B82F6"
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
                              domain={["auto", "auto"]}
                              tickCount={6}
                              tickFormatter={(value) => `${value?.toFixed(2)}%`}
                            />
                            <ChartTooltip
                              content={
                                <ChartTooltipContent
                                  formatter={(value, name) => {
                                    if (name === "apy") {
                                      const numValue =
                                        typeof value === "number"
                                          ? value
                                          : parseFloat(String(value));
                                      return [`${numValue.toFixed(2)}%`, ""];
                                    }
                                    return [value, name];
                                  }}
                                />
                              }
                              labelFormatter={(label) => `APY`}
                            />
                            <Area
                              type="monotone"
                              dataKey="apy"
                              stroke="#3B82F6"
                              strokeWidth={2.5}
                              fill="url(#apyGradient)"
                              connectNulls={true}
                              dot={false}
                              activeDot={{
                                r: 4,
                                stroke: "#3B82F6",
                                strokeWidth: 2,
                                fill: "#3B82F6",
                              }}
                            />
                          </AreaChart>
                        </ChartContainer>
                      </TabsContent>
                    </>
                  )}
                </div>
              </CardContent>
            </Tabs>
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
                      Autonomous Liquidity {currentAssetSymbol} is a tokenized
                      AI yield optimization strategy that maximizes
                      risk-adjusted returns on stablecoin investments across
                      numerous DeFi protocols. By continuously scanning the
                      DeFi.
                    </p>

                    {/* <div className="space-y-2 sm:space-y-3 pt-3 sm:pt-4">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground text-xs sm:text-sm">
                          Total Pending Deposits
                        </span>
                        <span className="text-foreground font-medium text-xs sm:text-sm">
                          {vaultData.pendingDepositAssets?.toFixed(4) || "0.00"}{" "}
                          {currentAssetSymbol}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground text-xs sm:text-sm">
                          Total Pending Withdrawals
                        </span>
                        <span className="text-foreground font-medium text-xs sm:text-sm">
                          {vaultData.totalRequestedAssets?.toFixed(4) || "0.00"}{" "}
                          {currentAssetSymbol}
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
                    currentVault={currentAssetSymbol}
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
                                  className="min-w-9 h-9 rounded-full border transform hover:scale-110 transition-transform duration-200 cursor-pointer"
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
                  {allocationsLoading ? (
                    <div className="flex items-center justify-center h-[300px]">
                      <Loader2 className="h-8 w-8 animate-spin" />
                    </div>
                  ) : allocationsError ? (
                    <div className="text-center py-8">
                      <p className="text-muted-foreground">
                        {allocationsError}
                      </p>
                    </div>
                  ) : allocationsData?.data[0]?.allocations &&
                    allocationsData.data[0].allocations.length > 0 ? (
                    <>
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
                                <ChartTooltip
                                  content={<ChartTooltipContent />}
                                />
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
                            Allocation Details
                          </h3>
                          <div className="space-y-3">
                            {dynamicPoolData.map((item, index) => (
                              <div
                                key={index}
                                className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                              >
                                <div className="flex items-center space-x-3">
                                  <img
                                    src={
                                      item.name === "safe"
                                        ? "/logo.webp"
                                        : `/pools/${item.name.toLowerCase()}.svg`
                                    }
                                    alt={item.name}
                                    className="min-w-9 h-9 rounded-full border transform hover:scale-110 transition-transform duration-200 cursor-pointer"
                                    onError={(e) => {
                                      const target =
                                        e.target as HTMLImageElement;
                                      target.style.display = "none";
                                      target.parentElement!.innerHTML = `<div class="w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center text-primary font-bold text-sm">${item.name
                                        .charAt(0)
                                        .toUpperCase()}</div>`;
                                    }}
                                  />
                                  <div>
                                    <span className="text-foreground font-medium block capitalize">
                                      {item.name === "safe"
                                        ? "Safe (Idle)"
                                        : item.name === "hypurrFinance"
                                        ? "HypurrFi"
                                        : item.name}
                                    </span>
                                    <span className="text-xs text-muted-foreground">
                                      Balance: ${item.tvl.toFixed(2)}
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
                    </>
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-muted-foreground">
                        No allocation data available.
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
              currentAssetSymbol={currentAssetSymbol}
              availableAssetBalance={vaultData?.assetBalance}
              availableUserDeposits={vaultData?.userDeposits}
              vaultId={vaultId}
              refreshData={refreshAllData}
              isConnected={isConnected}
              hasAccess={hasAccess}
              txCanceled={txCanceled}
              onRequireAccess={() => setShowAccessCodeModal(true)}
              deposit={deposit}
              withdraw={withdraw}
              isDepositTransacting={isDepositTransacting}
              isWithdrawTransacting={isWithdrawTransacting}
              depositEventStatus={depositEventStatus}
              setDepositEventStatus={setDepositEventStatus}
              withdrawEventStatus={withdrawEventStatus}
              setWithdrawEventStatus={setWithdrawEventStatus}
              pendingDepositAssets={pendingDepositAssets}
              pendingRedeemShares={pendingRedeemShares}
              claimableDepositAssets={claimableDepositAssets}
              claimableWithdrawAssets={claimableWithdrawAssets}
              assetDecimals={vaultData?.assetDecimals}
              vaultDecimals={vaultData?.vaultDecimals}
            />

            <Card className="bg-gradient-to-br from-card/50 to-background/50 border-border shadow-xl h-[55px]">
              <CardContent className="py-3 px-3 sm:py-4 sm:px-4">
                <div className="flex items-center justify-start gap-3">
                  <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-foreground" />
                  <h3 className="text-muted-foreground text-xs sm:text-sm font-medium">
                    Settles Every 30–60 Minutes
                  </h3>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <ChatBot />

      <AccessCodeModal
        isOpen={showAccessCodeModal}
        onClose={() => setShowAccessCodeModal(false)}
        hasAccess={hasAccess}
      />
    </div>
  );
};

export default VaultDetails;
