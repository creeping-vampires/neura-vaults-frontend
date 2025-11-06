import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DollarSign,
  ArrowUpRight,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  ExternalLink,
  RefreshCw,
  ArrowDownRight,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useMultiVault } from '@/hooks/useMultiVault';
import { useActiveWallet } from '@/hooks/useActiveWallet';
import { usePrice } from "@/hooks/usePrice";
import { useTransactionHistory } from "@/hooks/useTransactionHistory";
import { getExplorerTxUrl } from "@/lib/utils";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid } from "recharts";
import { usePrivy, useWallets } from "@privy-io/react-auth";

const Portfolio = () => {
  const navigate = useNavigate();
  const [selectedTimeframe, setSelectedTimeframe] = useState("7D");
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState("positions");

  const chartConfig = {
    value: {
      label: "Portfolio Value ($)",
      color: "#00d6c1",
    },
  };

  const formatChartDate = (dateString: string, timeframe: string) => {
    const date = new Date(dateString);
    switch (timeframe) {
      case "1D":
        return date.toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
        });
      case "7D":
        return date.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        });
      case "1M":
        return date.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        });
      case "ALL":
        return date.toLocaleDateString("en-US", {
          month: "short",
          year: "2-digit",
        });
      default:
        return date.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        });
    }
  };

  const formatChartValue = (value: number) => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(2)}M`;
    } else if (value >= 1000) {
      return `$${(value / 1000).toFixed(2)}K`;
    }
    return `$${value.toFixed(2)}`;
  };

  const { getAllVaults, getTotalTVL, getTotalUserDeposits, refreshAllData } =
    useMultiVault();

  const { priceData, getHighest7APY, get24APY, get7APY, getVaultDataByAddress } = usePrice();
  const {
    transactions,
    isLoading: isLoadingTransactions,
    error: transactionError,
    hasFetched,
  } = useTransactionHistory();

  // Memoize asset metadata to avoid redundant fetching (dynamic vaults)
  const { assetSymbol, assetDecimals } = useMemo(() => {
    const vaults = getAllVaults();
    // Prefer a vault that has assetDecimals available
    const withDecimals = vaults.find((v) => v.data?.assetDecimals);
    if (withDecimals) {
      return {
        assetSymbol: withDecimals.symbol,
        assetDecimals: withDecimals.data.assetDecimals as number,
      };
    }
    // Fallback to first vault symbol and default decimals
    const first = vaults[0];
    return {
      assetSymbol: first?.symbol || priceData.token || "",
      assetDecimals: 18,
    };
  }, [getAllVaults, priceData.token]);

  // Primary symbol for APY display in overview (fallback to first vault)
  const primarySymbol = useMemo(() => {
    const vaults = getAllVaults();
    return vaults[0]?.symbol || priceData.token;
  }, [getAllVaults, priceData.token]);

  // Lazy load transaction data when transactions tab is selected
  // useEffect(() => {
  //   if (activeTab === "transactions" && !hasFetched) {
  //     refreshHistory();
  //   }
  // }, [activeTab, hasFetched, refreshHistory]);

  const [portfolioData, setPortfolioData] = useState({
    totalBalance: 0,
    totalDeposits: 0,
    totalEarnings: 0,
    currentAPY: 0,
    change24h: 0,
    change7d: 0,
  });

  useEffect(() => {
    const calculatePortfolioData = async () => {
      try {
        const totalBalance = await getTotalTVL();
        const totalDeposits = getTotalUserDeposits();
        const totalEarnings = getAllVaults().reduce((sum, vault) => {
          return sum + (vault.data?.compoundedYield || 0);
        }, 0);

        setPortfolioData({
          totalBalance,
          totalDeposits,
          totalEarnings,
          currentAPY: priceData.currentNetAPR || 0,
          change24h: 0,
          change7d: 0,
        });
      } catch (error) {
        console.error("Error calculating portfolio data:", error);
      }
    };

    calculatePortfolioData();
  }, [
    getTotalTVL,
    getTotalUserDeposits,
    getAllVaults,
    priceData.currentNetAPR,
  ]);

  const positions = useMemo(() => {
    const allVaults = getAllVaults();
    return allVaults
      .filter((vault) => {
        const userDeposits = vault.data?.userDeposits || 0;
        const userShares = vault.data?.userShares || 0;
        return userDeposits > 0 || userShares > 0;
      })
      .map((vault) => ({
        vaultAddress: vault.address,
        asset: vault.symbol,
        name: vault.name || `ai${vault.symbol}`,
        balance: vault.data?.userShares || 0,
        value: vault.data?.userDeposits || 0,
        apy: vault.data?.currentNetAPR || 0,
        earnings: vault.data?.compoundedYield || 0,
        icon: vault.symbol.charAt(0),
        status: "active",
      }));
  }, [getAllVaults]);

  const getTransactionTypeIcon = (type: string) => {
    switch (type) {
      case "deposit":
        return <ArrowUpRight className="h-4 w-4 text-primary" />;
      case "withdraw":
        return <ArrowDownRight className="h-4 w-4 text-primary" />;
    }
  };

  const getTransactionTypeLabel = (type: string) => {
    switch (type) {
      case "deposit":
        return "Deposit";
      case "withdraw":
        return "Withdraw";
      default:
        return type;
    }
  };

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handlePositionClick = (position: any) => {
    navigate(`/vaults/${position.vaultAddress}`);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "SUCCESS":
        return <CheckCircle className="h-4 w-4 text-primary" />;
      case "PENDING":
        return <Clock className="h-4 w-4 text-orange-500" />;
      case "FAILED":
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "SUCCESS":
        return "text-primary";
      case "FAILED":
        return "text-red-500";
      case "PENDING":
        return "text-orange-500";
      default:
        return "text-muted-foreground";
    }
  };

  const generatePerformanceData = useCallback(
    (timeframe: string) => {
      const now = new Date();
      const data = [];
      let baseValue = portfolioData.totalDeposits || 0;
      let dataPoints = 30;
      let intervalMs = 24 * 60 * 60 * 1000;
      let growthRate = 0.08;

      switch (timeframe) {
        case "1D":
          dataPoints = 24;
          intervalMs = 60 * 60 * 1000;
          growthRate = 0.003;
          break;
        case "7D":
          dataPoints = 7;
          intervalMs = 24 * 60 * 60 * 1000;
          growthRate = 0.12;
          break;
        case "1M":
          dataPoints = 30;
          intervalMs = 24 * 60 * 60 * 1000;
          growthRate = 0.08;
          break;
        case "ALL":
          dataPoints = 90;
          intervalMs = 24 * 60 * 60 * 1000;
          growthRate = 0.15;
          break;
      }

      const startValue = baseValue * 0.85;

      for (let i = dataPoints - 1; i >= 0; i--) {
        const date = new Date(now.getTime() - i * intervalMs);
        const progress = (dataPoints - i) / dataPoints;

        const exponentialGrowth = Math.pow(1 + growthRate, dataPoints - i);
        const smoothValue = startValue * exponentialGrowth;

        const fluctuationIntensity = 0.035;
        const smoothedRandom =
          Math.sin((dataPoints - i) * 0.3) * fluctuationIntensity;
        const randomFluctuation = smoothedRandom * smoothValue;

        const minValue = startValue + (baseValue - startValue) * progress * 0.8;
        const value = Math.max(smoothValue + randomFluctuation, minValue);

        data.push({
          date: date.toISOString().split("T")[0],
          value: Math.round(value * 100) / 100,
          timestamp: date.getTime(),
        });
      }

      return data;
    },
    [portfolioData.totalDeposits]
  );

  // Use useMemo for chart data to avoid unnecessary recalculations
  const chartData = useMemo(() => {
    if (portfolioData.totalDeposits) {
      return generatePerformanceData(selectedTimeframe);
    }
    return generatePerformanceData(selectedTimeframe);
  }, [selectedTimeframe, portfolioData.totalDeposits]);

  const { authenticated, login } = usePrivy();
  const { wallet, userAddress, hasEmailLogin } = useActiveWallet();

  useEffect(() => {
    if (authenticated && userAddress) {
      refreshAllData();
    }
  }, [authenticated, userAddress, refreshAllData]);

  if (!authenticated) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] px-4">
        <div className="bg-gradient-to-br from-card/50 to-background/50 border border-border rounded-2xl p-8 max-w-sm w-full text-center shadow-lg">
          <h3 className="text-muted-foreground text-md font-medium mb-5">
            Login to view your portfolio balance
          </h3>
          <Button
            variant="wallet"
            className="w-40 px-6 py-2"
            onClick={async () => {
              try {
                await login();
                if (authenticated) {
                  navigate("/vaults", { replace: true });
                }
              } catch (error) {
                console.error("Login failed:", error);
              }
            }}
          >
            Login
          </Button>
        </div>
      </div>
    );
  }
  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6 min-h-screen">
      {/* Portfolio Overview Card */}
      <Card
        className="bg-gradient-to-br from-card/50 to-background/50 border-border shadow-xl select-none"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <CardContent className="p-4 sm:p-6 relative">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 w-full">
              <CardTitle className="text-[#e4dfcb] font-bold sm:text-lg">
                Your Deposits
              </CardTitle>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-muted-foreground hover:text-foreground p-2"
            >
              {isExpanded ? (
                <ChevronUp className="h-6 w-6" />
              ) : (
                <ChevronDown className="h-6 w-6" />
              )}
            </Button>
          </div>
          <div className="flex justify-between">
            <div className="mt-4">
              <p className="text-3xl font-bold text-foreground">
                $
                {portfolioData.totalDeposits.toLocaleString(undefined, {
                  maximumFractionDigits: 2,
                })}
              </p>
            </div>
            {!isExpanded ? (
              <div className="flex items-center justify-between">
                <div className="flex-1 flex justify-center">
                  <div className="absolute w-80 h-28 top-6">
                    <ChartContainer config={chartConfig}>
                      <AreaChart
                        width={256}
                        height={128}
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
                              offset="0%"
                              stopColor="#00d6c1"
                              stopOpacity={0.4}
                            />
                            <stop
                              offset="50%"
                              stopColor="#00d6c1"
                              stopOpacity={0.2}
                            />
                            <stop
                              offset="100%"
                              stopColor="#00d6c1"
                              stopOpacity={0.05}
                            />
                          </linearGradient>
                        </defs>

                        <Area
                          type="monotone"
                          dataKey="value"
                          stroke="#00d6c1"
                          strokeWidth={2}
                          fill="url(#valueGradientCompact)"
                          connectNulls={true}
                          dot={false}
                        />
                      </AreaChart>
                    </ChartContainer>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-6 mt-6">
                <div className="h-96 w-[600px]">
                  <ChartContainer config={chartConfig}>
                    <AreaChart
                      width={1200}
                      height={384}
                      data={chartData}
                      style={{
                        cursor: "pointer",
                        backgroundBlur: 1,
                      }}
                    >
                      <defs>
                        <linearGradient
                          id="valueGradientCompact"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="0%"
                            stopColor="#00d6c1"
                            stopOpacity={0.3}
                          />
                          <stop
                            offset="100%"
                            stopColor="#00d6c1"
                            stopOpacity={0.05}
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
                        stroke="#9CA3AF"
                        fontSize={12}
                        tickFormatter={(value) =>
                          formatChartDate(value, selectedTimeframe)
                        }
                        axisLine={{ stroke: "#374151", strokeWidth: 1 }}
                        tickLine={{ stroke: "#374151", strokeWidth: 1 }}
                      />
                      <YAxis
                        stroke="#9CA3AF"
                        fontSize={12}
                        tickFormatter={formatChartValue}
                        axisLine={{ stroke: "#374151", strokeWidth: 1 }}
                        tickLine={{ stroke: "#374151", strokeWidth: 1 }}
                        domain={["dataMin * 0.95", "dataMax * 1.05"]}
                        scale="linear"
                      />
                      <ChartTooltip
                        content={({ active, payload, label }) => {
                          if (active && payload && payload.length) {
                            return (
                              <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
                                <p className="text-sm text-muted-foreground mb-1">
                                  {formatChartDate(label, selectedTimeframe)}
                                </p>
                                <p className="text-sm font-medium text-foreground">
                                  Portfolio Value:{" "}
                                  {formatChartValue(payload[0].value as number)}
                                </p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="value"
                        stroke="#00d6c1"
                        strokeWidth={3}
                        fill="url(#valueGradient)"
                        connectNulls={true}
                        dot={false}
                        activeDot={{
                          r: 6,
                          stroke: "#00d6c1",
                          strokeWidth: 2,
                          fill: "#ffffff",
                        }}
                      />
                    </AreaChart>
                  </ChartContainer>
                </div>
              </div>
            )}

            <div className="flex justify-end space-x-6 mt-4">
              <div className="flex flex-col items-center">
                <div className="text-muted-foreground text-xs">Current APY</div>
                <div className="text-foreground font-semibold mt-1 w-fit gap-1 relative group">
                  {get24APY().toFixed(2)}%
                  <div className="flex items-center gap-1 absolute top-9 left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-[#262626] rounded-md shadow-lg text-sm invisible opacity-0 group-hover:visible group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap">
                    <div className="font-medium text-muted-foreground">
                      7-Day APY
                    </div>
                    <div className="font-medium text-foreground">:</div>
                    <div className="font-medium ml-1 text-foreground">
                      {getHighest7APY()
                        ? `${getHighest7APY().toFixed(2)}%`
                        : "-"}
                    </div>
                    <div className="absolute top-[-4px] left-1/2 -translate-x-1/2 w-2 h-2 bg-[#262626] rotate-45"></div>
                  </div>
                </div>
              </div>
              <div className="flex flex-col items-center">
                <div className="text-muted-foreground text-xs">Points</div>
                <div className="text-foreground font-semibold mt-1">
                  {portfolioData.totalEarnings.toFixed(4)}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Portfolio Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        {/* <TabsList className="h-10 sm:h-12 bg-gradient-to-br from-card to-background backdrop-blur-sm border border-border/50 rounded-lg"> */}
        {/* <TabsTrigger
            value="positions"
            className="data-[state=active]:bg-[#262626] data-[state=active]:text-foreground data-[state=active]:shadow-none rounded-md px-2 py-1 sm:px-4 sm:py-2 text-xs sm:text-sm font-medium transition-colors text-muted-foreground hover:text-foreground"
          >
            Positions
          </TabsTrigger> */}
        {/* <TabsTrigger
            value="transactions"
            className="data-[state=active]:bg-[#262626] data-[state=active]:text-foreground data-[state=active]:shadow-none rounded-md px-2 py-1 sm:px-4 sm:py-2 text-xs sm:text-sm font-medium transition-colors text-muted-foreground hover:text-foreground"
          >
            Transactions
          </TabsTrigger> */}
        {/* <TabsTrigger
            value="rewards"
            className="data-[state=active]:bg-[#262626] data-[state=active]:text-foreground data-[state=active]:shadow-none rounded-md px-2 py-1 sm:px-4 sm:py-2 text-xs sm:text-sm font-medium transition-colors text-muted-foreground hover:text-foreground"
          >
            Rewards
          </TabsTrigger> */}
        {/* <TabsTrigger
            value="analytics"
            className="data-[state=active]:bg-[#262626] data-[state=active]:text-foreground data-[state=active]:shadow-none rounded-md px-2 py-1 sm:px-4 sm:py-2 text-xs sm:text-sm font-medium transition-colors text-muted-foreground hover:text-foreground"
          >
            Analytics
          </TabsTrigger> */}
        {/* </TabsList> */}

        <TabsContent value="positions" className="mt-4 sm:mt-6">
          <Card className="bg-gradient-to-br from-card/50 to-background/50 border-border shadow-xl">
            <CardHeader className="px-4 pb-0 pt-4 sm:p-6 sm:pb-0">
              <div className="flex items-center justify-between">
                <CardTitle className="text-[#e4dfcb] font-bold sm:text-lg">
                  Your Positions
                </CardTitle>
                <Badge
                  variant="secondary"
                  className="bg-muted text-muted-foreground border-border"
                >
                  {positions.length} positions
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-2 pt-0 sm:p-6">
              {positions.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-muted rounded-full mx-auto mb-4 flex items-center justify-center">
                    <DollarSign className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-foreground font-semibold text-lg mb-2">
                    No positions yet
                  </h3>
                  <p className="text-muted-foreground mb-6">
                    Start by depositing assets to earn yield and collect reward
                    points
                  </p>
                  <div className="space-x-4">
                    <Button
                      variant="wallet"
                      onClick={() => navigate(`/vaults`)}
                    >
                      Deposit Assets
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="overflow-x-auto sm:overflow-visible">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left text-muted-foreground text-xs font-medium uppercase tracking-wide py-3">
                          Vault
                        </th>
                        {/* <th className="text-left text-muted-foreground text-xs font-medium uppercase tracking-wide py-3">
                          Type
                        </th> */}
                        <th className="text-left text-muted-foreground text-xs font-medium uppercase tracking-wide py-3">
                          Shares
                        </th>
                        <th className="text-left text-muted-foreground text-xs font-medium uppercase tracking-wide py-3">
                          Value
                        </th>
                        <th className="text-left text-muted-foreground text-xs font-medium uppercase tracking-wide py-3">
                          APY
                        </th>
                        <th className="text-left text-muted-foreground text-xs font-medium uppercase tracking-wide py-3">
                          Points
                        </th>
                        <th className="text-left text-muted-foreground text-xs font-medium uppercase tracking-wide py-3">
                          REWARDS
                        </th>
                        {/*<th className="text-right text-muted-foreground text-xs font-medium uppercase tracking-wide py-3">
                          Actions
                        </th>*/}
                      </tr>
                    </thead>
                    <tbody>
                      {positions.map((position, index) => (
                        <tr
                          key={index}
                          className="border-b border-border hover:bg-accent/30 transition-colors cursor-pointer"
                          onClick={() => handlePositionClick(position)}
                        >
                          <td className="py-4">
                            <div className="flex items-center">
                              <div className="w-10 h-10 bg-muted rounded-full mr-3 flex items-center justify-center text-lg">
                                {position.icon}
                              </div>
                              <div>
                                <p className="text-foreground font-semibold text-sm">
                                  {position.name}
                                </p>
                                <p className="text-muted-foreground text-xs">
                                  {position.asset}
                                </p>
                              </div>
                            </div>
                          </td>
                          {/* <td className="text-foreground font-semibold py-4 capitalize">
                            {position.transaction_type}
                          </td> */}
                          <td className="text-foreground font-semibold py-4">
                            {position?.balance?.toLocaleString()}
                          </td>
                          <td className="text-foreground font-semibold py-4">
                            $
                            {position?.value?.toLocaleString(undefined, {
                              maximumFractionDigits: 2,
                            })}
                          </td>
                          <td className="text-primary font-semibold py-6 gap-1 relative group">
                            {get24APY().toFixed(2)}%
                            <div className="flex items-center gap-1 absolute top-14 left-6 -translate-x-1/2 mb-2 px-3 py-2 bg-[#262626] rounded-md shadow-lg text-sm invisible opacity-0 group-hover:visible group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap">
                              <div className="font-medium text-muted-foreground">
                                7-Day APY
                              </div>
                              <div className="font-medium text-foreground">
                                :
                              </div>
                              <div className="font-medium ml-1 text-foreground">
                                {get7APY() ? `${get7APY().toFixed(2)}%` : "-"}
                              </div>
                              <div className="absolute top-[-4px] left-1/2 -translate-x-1/2 w-2 h-2 bg-[#262626] rotate-45"></div>
                            </div>
                          </td>
                          <td className="text-foreground font-semibold py-4">
                            {position?.earnings?.toFixed(4)}
                          </td>
                          <td className="py-4 sm:w-32">
                            <div className="flex space-x-2">
                              {/* {position.asset === "USDC" ? ( */}
                              {(
                                getVaultDataByAddress(position.vaultAddress)
                                  ?.allocations || []
                              )
                                .map((a) => a.protocol.toLowerCase())
                                .map((reward) => (
                                  <div key={reward} className="relative group">
                                    <img
                                      src={`/pools/${reward}.svg`}
                                      alt={reward}
                                      className="w-6 h-6 rounded-full border border-white/50 transform hover:scale-110 transition-transform duration-200 cursor-pointer"
                                      onError={(e) => {
                                        const target =
                                          e.target as HTMLImageElement;
                                        target.style.display = "none";
                                        target.parentElement!.innerHTML = `<div class="w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center text-primary font-bold text-sm">${reward
                                          .charAt(0)
                                          .toUpperCase()}</div>`;
                                      }}
                                    />
                                    <div className="absolute border border-white/30 top-8 uppercase left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-black text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
                                      {reward}
                                    </div>
                                  </div>
                                ))}
                              {/* ) : (
                                <span className="text-muted-foreground">-</span>
                              )} */}
                            </div>
                          </td>
                          <td className="text-right py-4">
                            {/* <div className="space-x-2 space-y-1">
                              <Button
                                size="sm"
                                variant="wallet"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setShowDepositModal(true);
                                }}
                              >
                                Deposit
                              </Button>
                              <Button
                                size="sm"
                                variant="wallet"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setShowWithdrawModal(true);
                                }}
                                disabled={withdrawalRequest !== null}
                              >
                                {withdrawalRequest ? "Pending" : "Withdraw"}
                              </Button>
                            </div> */}
                            {/*<div className="flex space-x-2 justify-end">
                              <Button
                                variant="wallet"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setShowDepositModal(true);
                                }}
                              >
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out" />
                                Deposit
                              </Button>
                              <Button
                                variant="wallet"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setShowWithdrawModal(true);
                                }}
                                disabled={withdrawalRequest !== null}
                              >
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out" />

                                {withdrawalRequest ? "Pending" : "Withdraw"}
                              </Button>
                            </div>*/}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="transactions" className="mt-4 sm:mt-6">
          <Card className="bg-gradient-to-br from-card/50 to-background/50 border-border shadow-xl">
            <CardHeader className="px-4 pb-0 pt-4 sm:p-6 sm:pb-0">
              <div className="flex items-center justify-between">
                <CardTitle className="text-foreground font-bold text-xl">
                  Transaction History
                </CardTitle>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-border text-muted-foreground hover:text-foreground"
                    onClick={(e) => {
                      e.preventDefault();
                      // refreshHistory();
                    }}
                    disabled={isLoadingTransactions}
                  >
                    <RefreshCw
                      className={`h-4 w-4 mr-2 ${
                        isLoadingTransactions ? "animate-spin" : ""
                      }`}
                    />{" "}
                    {isLoadingTransactions ? "Refreshing" : "Refresh"}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-2 pt-0 pb-4 sm:p-6">
              {transactionError ? (
                <div className="text-red-500 text-sm">{transactionError}</div>
              ) : isLoadingTransactions ? (
                <div className="text-muted-foreground text-sm text-center mt-4">
                  Loading transactions...
                </div>
              ) : transactions.length === 0 ? (
                <div className="text-muted-foreground text-sm text-center mt-4">
                  {hasFetched
                    ? "No transactions found. Your on-chain transactions will appear here."
                    : "Click 'Refresh' to load your transaction history."}
                </div>
              ) : (
                <div className="overflow-x-auto sm:overflow-visible">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left text-muted-foreground text-xs font-medium uppercase tracking-wide py-3">
                          Type
                        </th>
                        <th className="text-left text-muted-foreground text-xs font-medium uppercase tracking-wide py-3">
                          Amount
                        </th>
                        <th className="text-left text-muted-foreground text-xs font-medium uppercase tracking-wide py-3">
                          Status
                        </th>
                        <th className="text-left text-muted-foreground text-xs font-medium uppercase tracking-wide py-3">
                          Timestamp
                        </th>
                        <th className="text-right text-muted-foreground text-xs font-medium uppercase tracking-wide py-3">
                          Tx
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {transactions.map((tx) => (
                        <tr
                          key={tx.id}
                          className="border-b border-border hover:bg-muted/50 transition-colors"
                        >
                          <td className="py-3">
                            <div className="flex items-center gap-2">
                              {getTransactionTypeIcon(tx.transaction_type)}
                              <span className="text-foreground text-sm font-medium">
                                {getTransactionTypeLabel(tx.transaction_type)}
                              </span>
                            </div>
                          </td>
                          <td className="py-3 text-foreground font-semibold">
                            {Number(tx?.amount_formatted)?.toFixed(4)}{" "}
                            {assetSymbol}
                          </td>
                          <td className="py-3">
                            <div className="flex items-center gap-2">
                              {getStatusIcon(tx.status)}
                              <span
                                className={`${getStatusColor(
                                  tx.status
                                )} text-sm font-medium capitalize`}
                              >
                                {tx.status}
                              </span>
                            </div>
                          </td>
                          <td className="py-3 text-muted-foreground text-sm">
                            {new Date(tx.created_at).toLocaleDateString(
                              "en-US",
                              {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              }
                            )}
                          </td>
                          <td className="py-3 text-right">
                            <a
                              href={getExplorerTxUrl(tx.transaction_hash)}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center text-xs text-primary hover:underline"
                            >
                              View <ExternalLink className="h-3 w-3 ml-1" />
                            </a>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Portfolio;
