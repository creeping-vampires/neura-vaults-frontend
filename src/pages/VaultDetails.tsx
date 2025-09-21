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
  ExternalLink,
  Target,
  CheckCircle,
  XCircle,
  Loader2,
} from "lucide-react";
import { useMultiVault } from "@/hooks/useMultiVault";
import { useWhitelist } from "@/hooks/useWhitelist";
import { usePrice } from "@/hooks/usePrice";
import { getExplorerTxUrl, formatAddress } from "@/lib/utils";
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
import { Input } from "@/components/ui/input";
import { explorerUrl, VAULTS, VaultType } from "@/utils/constant";
import AgentConsole from "@/components/AgentConsole";
import PythAttribution from "@/components/shared/PythAttribution";

const VaultActivity = React.lazy(() => import("@/components/VaultActivity"));

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

// Helper function to get vault configuration by address
const getVaultConfig = (vaultAddress: string) => {
  for (const [key, config] of Object.entries(VAULTS)) {
    if (
      config.yieldAllocatorVaultAddress.toLowerCase() ===
      vaultAddress.toLowerCase()
    ) {
      return { type: key as VaultType, config };
    }
  }
  // Default to USDE if not found
  return { type: "USDE" as VaultType, config: VAULTS.USDE };
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
  const { vaultId } = useParams();
  const navigate = useNavigate();

  // Get vault configuration based on the vault address from URL
  const vaultConfig = vaultId
    ? getVaultConfig(vaultId)
    : { type: "USDE" as VaultType, config: VAULTS.USDE };

  const multiVaultData = useMultiVault();
  const { getTotalTVL } = multiVaultData;

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

  // Get the specific vault data based on vaultId
  const getVaultDataByAddress = (address: string) => {
    if (address === VAULTS.USDE.yieldAllocatorVaultAddress) {
      return multiVaultData.usdeVault;
    }
    // else if (address === VAULTS.USDT0.yieldAllocatorVaultAddress) {
    //   return multiVaultData.usdt0Vault;
    // }
    // Default to USDE vault if address not found
    return multiVaultData.usdeVault;
  };

  const vaultDataObject = vaultId
    ? getVaultDataByAddress(vaultId)
    : multiVaultData.usdeVault;

  const {
    deposit,
    withdraw,
    withdrawPendingDeposit,
    isDepositTransacting,
    isWithdrawTransacting,
    refreshData,
    ...vaultData
  } = vaultDataObject;
  const countdown = useCountdown();

  const { getWhitelistedPools } = useWhitelist();
  const {
    chartData: priceChartData,
    isLoading: chartLoading,
    error: chartError,
    fetchPriceChart,
    priceData,
    isPriceLoading,
    priceError,
    getVaultDataByToken,
    get24APY,
    get7APY,
  } = usePrice();

  const [selectedTimeframe, setSelectedTimeframe] = useState("1D");
  const [chartData, setChartData] = useState([]);

  const currentVault = vaultConfig.config.symbol;

  useEffect(() => {
    if (!selectedTimeframe || !vaultId) {
      return;
    }

    let days = 7;
    let limit = 7;
    switch (selectedTimeframe) {
      case "1D":
        days = 24;
        limit = 24;
        break;
      case "7D":
        days = 7;
        limit = 7;
        break;
      case "1M":
        days = 30;
        limit = 30;
        break;
      case "ALL":
        days = 365;
        limit = 365;
        break;
      default:
        days = 30;
        limit = 100;
    }
    fetchPriceChart({ days, limit });
  }, [selectedTimeframe]);

  useEffect(() => {
    if (!priceChartData || priceChartData.length === 0) {
      setChartData([]);
      return;
    }

    const allTransformed = [];

    const relevantTokenData = priceChartData.filter(
      (tokenData) => tokenData.token === currentVault
    );

    relevantTokenData.forEach((tokenData) => {
      const tokenTransformed = tokenData.data
        ?.map((point) => {
          const tsRaw = point.timestamp as number | string;
          const tsNum =
            typeof tsRaw === "number" ? tsRaw : Date.parse(tsRaw as string);
          const ts = isNaN(tsNum)
            ? Date.now()
            : tsNum < 1e12
            ? tsNum * 1000
            : tsNum;

          const valueRaw = point.share_price_formatted as number | string;
          const valueNum =
            typeof valueRaw === "string"
              ? parseFloat(valueRaw.replace(/[^0-9.\-]/g, ""))
              : Number(valueRaw);

          const apyRaw = point.pool_apy as number | string;
          const apyNum =
            typeof apyRaw === "string"
              ? parseFloat(apyRaw.replace(/[^0-9.\-]/g, ""))
              : Number(apyRaw);

          const formattedValue = isNaN(valueNum)
            ? 0
            : parseFloat(valueNum?.toFixed(6));
          const formattedApy = isNaN(apyNum)
            ? undefined
            : parseFloat(apyNum?.toFixed(4));

          return {
            date: ts,
            value: formattedValue,
            apy: formattedApy,
            share_price_formatted: formattedValue?.toFixed(6),
            pool_apy: formattedApy ? formattedApy?.toFixed(4) : undefined,
            token: tokenData.token, // Preserve token information
          } as any;
        })
        .filter((d) => typeof d.date === "number" && !isNaN(d.date));

      if (tokenTransformed) {
        allTransformed.push(...tokenTransformed);
      }
    });

    allTransformed.sort((a, b) => a.date - b.date);

    setChartData(allTransformed);
  }, [priceChartData]);

  const [activeTab, setActiveTab] = useState<"deposit" | "withdraw">("deposit");
  const [inputAmount, setInputAmount] = useState<string>("");
  const [whitelistedPools, setWhitelistedPools] = useState<string[]>([]);

  // Pending transactions state
  interface PendingTransaction {
    id: string;
    type: "deposit" | "withdraw";
    amount: string;
    hash?: string;
    status: "pending" | "confirmed" | "failed";
    timestamp: number;
    autoRemoveTimer?: NodeJS.Timeout;
  }

  const [latestTransactions, setLatestTransactions] = useState<
    PendingTransaction[]
  >([]);
  const [transactionMonitors, setTransactionMonitors] = useState<
    Map<string, NodeJS.Timeout>
  >(new Map());

  // Polling for deposit & withdraw status
  useEffect(() => {
    if (!vaultData?.hasPendingDeposit && !vaultData?.hasPendingWithdrawal) {
      return;
    }

    const pollDepositWithdrawStatus = setInterval(() => {
      refreshData();
    }, 60000); // Poll every minute (60,000 ms)

    return () => {
      clearInterval(pollDepositWithdrawStatus);
    };
  }, [
    vaultData?.hasPendingDeposit,
    vaultData?.hasPendingWithdrawal,
    refreshData,
  ]);

  const addPendingTransaction = useCallback(
    (type: "deposit" | "withdraw", amount: string, hash?: string) => {
      const id = `${type}-${Date.now()}-${Math.random()
        .toString(36)
        .substr(2, 9)}`;
      const newTransaction: PendingTransaction = {
        id,
        type,
        amount,
        hash,
        status: "pending",
        timestamp: Date.now(),
      };

      setLatestTransactions((prev) => [...prev, newTransaction]);

      if (hash) {
        startTransactionMonitoring(id, hash);
      }

      return id;
    },
    []
  );

  const updateTransactionStatus = useCallback(
    (id: string, status: "pending" | "confirmed" | "failed", hash?: string) => {
      setLatestTransactions((prev) =>
        prev.map((tx) => {
          if (tx.id === id) {
            const updatedTx = { ...tx, status, ...(hash && { hash }) };

            if (status === "confirmed" || status === "failed") {
              const timer = setTimeout(() => {
                setLatestTransactions((current) =>
                  current.filter((t) => t.id !== id)
                );
                // Clean up monitor
                const monitor = transactionMonitors.get(id);
                if (monitor) {
                  clearInterval(monitor);
                  setTransactionMonitors((prev) => {
                    const newMap = new Map(prev);
                    newMap.delete(id);
                    return newMap;
                  });
                }
              }, 300000);

              updatedTx.autoRemoveTimer = timer;
            }

            return updatedTx;
          }
          return tx;
        })
      );
    },
    [transactionMonitors]
  );

  const startTransactionMonitoring = useCallback(
    (id: string, hash: string) => {
      const monitor = setInterval(async () => {
        try {
          if (window.ethereum) {
            const provider = new (await import("ethers")).BrowserProvider(
              window.ethereum
            );
            const receipt = await provider.getTransactionReceipt(hash);

            if (receipt) {
              const status = receipt.status === 1 ? "confirmed" : "failed";

              updateTransactionStatus(id, status);

              // Handle success/failure actions
              if (status === "confirmed") {
                // Use functional update to get current state
                setLatestTransactions((currentTransactions) => {
                  const transaction = currentTransactions.find(
                    (tx) => tx.id === id
                  );
                  if (transaction) {
                    toast({
                      title: `✅ ${
                        transaction.type === "deposit"
                          ? "Deposit"
                          : "Withdrawal"
                      } Successful`,
                      description: `Successfully ${
                        transaction.type === "deposit"
                          ? "deposited"
                          : "withdrew"
                      } ${transaction.amount} ${vaultConfig.config.symbol}.`,
                    });

                    refreshData();
                  }
                  return currentTransactions;
                });
              }

              clearInterval(monitor);
              setTransactionMonitors((prev) => {
                const newMap = new Map(prev);
                newMap.delete(id);
                return newMap;
              });
            }
          }
        } catch (error) {
          console.error("Error monitoring transaction:", error);
        }
      }, 3000);

      setTransactionMonitors((prev) => new Map(prev.set(id, monitor)));
    },
    [updateTransactionStatus, refreshData]
  );

  useEffect(() => {
    return () => {
      latestTransactions.forEach((tx) => {
        if (tx.autoRemoveTimer) {
          clearTimeout(tx.autoRemoveTimer);
        }
      });
      transactionMonitors.forEach((monitor) => {
        clearInterval(monitor);
      });
    };
  }, [latestTransactions, transactionMonitors]);

  const timeframes = ["1D", "7D", "1M", "ALL"];

  useEffect(() => {
    const fetchWhitelistedPools = async () => {
      try {
        const pools = await getWhitelistedPools();
        const filteredPools = pools.filter((pool, i) =>
          vaultConfig.config.symbol === "USDe"
            ? i !== pools.length - 1
            : i !== 2
        );
        setWhitelistedPools(filteredPools);
      } catch (error) {
        console.error("Error fetching whitelisted pools:", error);
      }
    };

    fetchWhitelistedPools();
  }, []);

  // Calculate pool composition data from vaultData
  const dynamicPoolData = useMemo(() => {
    if (
      !vaultData.poolAddresses ||
      !vaultData.poolTVLs ||
      vaultData.poolAddresses.length === 0
    ) {
      return [];
    }

    const vaultSymbol =
      Object.entries(VAULTS).find(
        ([_, config]) =>
          config.yieldAllocatorVaultAddress.toLowerCase() ===
          vaultId?.toLowerCase()
      )?.[0] || "USDE";

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

  const handleDeposit = async (amount: string) => {
    let depositId: string | null = null;

    try {
      depositId = addPendingTransaction("deposit", amount);

      const depositTx = await deposit(amount);

      if (depositId) {
        updateTransactionStatus(depositId, "confirmed", depositTx);
        startTransactionMonitoring(depositId, depositTx);
      }
    } catch (e: any) {
      if (depositId) {
        updateTransactionStatus(depositId, "failed");
      }
    }
  };

  const handleWithdraw = async (amount: string) => {
    let withdrawId: string | null = null;

    try {
      withdrawId = addPendingTransaction("withdraw", amount);

      const withdrawTx = await withdraw(amount);

      if (withdrawId) {
        updateTransactionStatus(withdrawId, "confirmed", withdrawTx);
        startTransactionMonitoring(withdrawId, withdrawTx);
      }
    } catch (e: any) {
      if (withdrawId) {
        updateTransactionStatus(withdrawId, "failed");
      }
    }
  };

  const formatCurrency = (value: number) => {
    if (!value || isNaN(value)) return "$0.00";
    if (value >= 1e12) return `$${(value / 1e12)?.toFixed(2)}T`;
    if (value >= 1e9) return `$${(value / 1e9)?.toFixed(2)}B`;
    if (value >= 1e6) return `$${(value / 1e6)?.toFixed(2)}M`;
    if (value >= 1e3) return `$${(value / 1e3)?.toFixed(2)}K`;
    return `$${value?.toFixed(2)}`;
  };

  const handlePercentageClick = (percent: number) => {
    const maxAmount =
      activeTab === "deposit"
        ? vaultData?.assetBalance || 0
        : vaultData?.userDeposits || 0;
    const amount = ((maxAmount * percent) / 100).toString();
    setInputAmount(amount);
  };

  const handleAction = async () => {
    if (!inputAmount || parseFloat(inputAmount) <= 0) return;

    try {
      if (activeTab === "deposit") {
        await handleDeposit(inputAmount);
      } else {
        await handleWithdraw(inputAmount);
      }
      setInputAmount("");
    } catch (e: any) {}
  };

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
            <h1 className="text-lg sm:text-2xl font-medium text-foreground font-libertinus">
              {vaultConfig.config.name} Vault
            </h1>
            <div className="flex items-center space-x-2 mt-0.5">
              <Badge
                variant="secondary"
                className="bg-primary/10 text-primary border-primary/20 text-xs"
              >
                {vaultConfig.config.symbol}
              </Badge>
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          {/* Pending Deposits Section */}
          {vaultData?.hasPendingDeposit && (
            <Card className="bg-gradient-to-br from-card/50 to-background/50 mt-3 p-3 border border-primary/20 rounded-md flex items-center gap-3">
              <div className="">
                <span className="text-primary text-sm font-medium">
                  Pending Deposit
                </span>
                <p className="text-xs text-muted-foreground">
                  Your deposit will be processed in the next settlement
                </p>
              </div>
              <Button
                onClick={async () => {
                  try {
                    await withdrawPendingDeposit();
                    refreshData();
                  } catch (error) {
                    console.error("Error withdrawing pending deposit:", error);
                  }
                }}
                size="sm"
                variant="outline"
                className="text-xs border-primary/20 hover:bg-primary/10"
              >
                Cancel Pending Deposit
              </Button>
            </Card>
          )}
          {vaultData?.hasPendingWithdrawal && (
            <Card className="bg-gradient-to-br from-card/50 to-background/50 mt-3 p-3 border border-primary/20 rounded-md flex items-center gap-3">
              <div className="">
                <span className="text-primary text-sm font-medium">
                  Pending Withdrawal
                </span>
                <p className="text-xs text-muted-foreground">
                  Your withdrawal is being processed automatically
                </p>
              </div>
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
                    Total AUM in USD
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

                    <PythAttribution variant="compact" className="mt-1" />
                    <div className="flex items-center mt-1">
                      <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 text-primary mr-1" />
                      <span className="text-primary text-xs sm:text-sm font-medium">
                        {isPriceLoading
                          ? "Loading..."
                          : get24APY(vaultId).toFixed(2)}
                        % APY (24h)
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
                              {get7APY(vaultId)
                                ? get7APY(vaultId).toFixed(2)
                                : "-"}
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
                <CardTitle className="text-foreground font-medium text-base sm:text-lg">
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
                          return selectedTimeframe === "1D"
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
                        domain={["dataMin - 0.00001", "dataMax + 0.00001"]}
                        tickCount={6}
                        tickFormatter={(value) => value?.toFixed(6)}
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
                                return [numValue?.toFixed(6), label];
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
                    <CardTitle className="text-foreground font-medium text-base sm:text-lg">
                      About this Vault
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 sm:space-y-4 pt-0">
                    <p className="text-muted-foreground text-xs sm:text-sm leading-relaxed">
                      Autonomous Liquidity {vaultConfig.config.symbol} is a
                      tokenized AI yield optimization strategy that maximizes
                      risk-adjusted returns on stablecoin investments across
                      numerous DeFi protocols. By continuously scanning the
                      DeFi.
                    </p>

                    <div className="space-y-2 sm:space-y-3 pt-3 sm:pt-4">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground text-xs sm:text-sm">
                          Total Pending Deposits
                        </span>
                        <span className="text-foreground font-medium text-xs sm:text-sm">
                          {vaultData.pendingDepositAssets?.toFixed(2) || "0.00"}{" "}
                          {vaultConfig.config.symbol}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground text-xs sm:text-sm">
                          Total Pending Withdrawals
                        </span>
                        <span className="text-foreground font-medium text-xs sm:text-sm">
                          {vaultData.totalRequestedAssets?.toFixed(2) || "0.00"}{" "}
                          {vaultConfig.config.symbol}
                        </span>
                      </div>
                      {/* <div className="flex items-center justify-between">
                        <span className="text-muted-foreground text-xs sm:text-sm">
                          Performance Fee
                        </span>
                        <span className="text-foreground font-medium text-xs sm:text-sm">
                          10.00%
                        </span>
                      </div> */}
                    </div>

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
                          <CardTitle className="text-foreground font-medium text-base sm:text-lg">
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
                    vaultConfig={vaultConfig}
                  />
                </Suspense>
              </div>
            </TabsContent>

            <TabsContent value="pools" className="mt-4 sm:mt-6">
              <Card className="bg-gradient-to-br from-card/50 to-background/50 border-border shadow-xl">
                <CardHeader>
                  <CardTitle className="text-foreground font-medium text-base sm:text-lg">
                    Whitelisted Pools
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {whitelistedPools.length > 0 ? (
                      whitelistedPools.map((poolAddress, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-4 bg-gradient-to-r from-card/30 to-background/30 rounded-lg border border-border/50"
                        >
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-secondary rounded-full flex items-center justify-center">
                              <img
                                src={`/pools/${getPoolName(
                                  poolAddress,
                                  vaultConfig.config.symbol
                                ).toLowerCase()}.svg`}
                                alt={getPoolName(
                                  poolAddress,
                                  vaultConfig.config.symbol
                                )}
                                className="min-w-9 h-9 rounded-full border border-white/50 transform hover:scale-110 transition-transform duration-200 cursor-pointer"
                              />
                            </div>
                            <div>
                              <p className="text-foreground font-medium">
                                {getPoolName(
                                  poolAddress,
                                  vaultConfig.config.symbol
                                )}
                              </p>
                              <p className="text-muted-foreground text-sm">
                                {poolAddress}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Badge
                              variant="secondary"
                              className="bg-primary/20 text-primary border-primary/30"
                            >
                              Active
                            </Badge>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                window.open(
                                  `${explorerUrl}/address/${poolAddress}`,
                                  "_blank"
                                )
                              }
                              className="text-muted-foreground hover:text-foreground"
                            >
                              View on Explorer
                            </Button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8">
                        <p className="text-muted-foreground">
                          No whitelisted pools found for this vault.
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="composition" className="mt-4 sm:mt-6">
              <Card className="bg-gradient-to-br from-card/50 to-background/50 border-border shadow-xl">
                <CardHeader>
                  <CardTitle className="text-foreground font-medium text-base sm:text-lg">
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
            <Card
              className="bg-gradient-to-br from-card/50 to-background/50 border-border shadow-xl sm:min-h-[435px]"
              style={{
                height: "calc(100vh - 315px)",
              }}
            >
              <CardContent className="p-4 pt-2">
                <div className="flex mb-4 border-b border-border">
                  <button
                    onClick={() => setActiveTab("deposit")}
                    className={`flex-1 py-3 px-4 text-base font-medium transition-all duration-200 relative ${
                      activeTab === "deposit"
                        ? "text-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Deposit
                    {activeTab === "deposit" && (
                      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />
                    )}
                  </button>
                  <button
                    onClick={() => setActiveTab("withdraw")}
                    className={`flex-1 py-3 px-4 text-base font-medium transition-all duration-200 relative ${
                      activeTab === "withdraw"
                        ? "text-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Withdraw
                    {activeTab === "withdraw" && (
                      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />
                    )}
                  </button>
                </div>

                {/* Withdrawal Status */}

                <div className="mt-4 mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-muted-foreground text-sm">
                      Available
                    </span>
                    <span className="text-foreground font-medium">
                      {activeTab === "deposit"
                        ? `${vaultData?.assetBalance?.toFixed(2) || "0.00"} ${
                            vaultConfig.config.symbol
                          }`
                        : `${vaultData?.userDeposits?.toFixed(2) || "0.00"} ${
                            vaultConfig.config.symbol
                          }`}
                    </span>
                  </div>
                </div>

                <div className="flex gap-2 mb-4">
                  {[25, 50, 75, 100].map((percent) => (
                    <button
                      key={percent}
                      onClick={() => handlePercentageClick(percent)}
                      className="flex-1 py-2 px-3 text-xs font-medium rounded-md bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                    >
                      {percent}%
                    </button>
                  ))}
                </div>

                <div className="">
                  <div className="relative">
                    <Input
                      type="number"
                      min="0"
                      value={inputAmount}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (value === "" || Number(value) >= 0) {
                          setInputAmount(value);
                        }
                      }}
                      placeholder="Enter amount"
                      className="w-full h-12 px-4 py-3 bg-gradient-to-br from-card to-background border border-border rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-foreground text-sm">
                      {vaultConfig.config.symbol}
                    </span>
                  </div>
                </div>

                <Button
                  onClick={handleAction}
                  disabled={
                    activeTab === "deposit"
                      ? isDepositTransacting
                      : isWithdrawTransacting ||
                        !inputAmount ||
                        parseFloat(inputAmount) <= 0
                  }
                  className="w-full mt-4"
                  variant="wallet"
                >
                  {activeTab === "deposit"
                    ? isDepositTransacting
                      ? "Depositing..."
                      : "Deposit"
                    : activeTab === "withdraw" &&
                      (isWithdrawTransacting ? "Withdrawing..." : "Withdraw")}
                </Button>

                {latestTransactions.length > 0 && (
                  <div className="mt-2 space-y-1">
                    <h4 className="text-sm font-medium text-muted-foreground mb-2">
                      Latest Transactions
                    </h4>
                    <div
                      className="space-y-2 overflow-y-auto scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent"
                      style={{
                        height: "calc(100vh - 635px)",
                      }}
                    >
                      {latestTransactions
                        .filter(
                          (tx) =>
                            tx.type === "deposit" || tx.type === "withdraw"
                        )
                        .map((tx) => {
                          const getTransactionIcon = () => {
                            if (tx.status === "confirmed")
                              return (
                                <CheckCircle className="h-4 w-4 text-primary" />
                              );
                            if (tx.status === "failed")
                              return (
                                <XCircle className="h-4 w-4 text-red-500" />
                              );
                            return (
                              <Loader2 className="h-4 w-4 text-orange-400 animate-spin" />
                            );
                          };

                          const getStatusText = () => {
                            if (tx.status === "confirmed") return "Confirmed";
                            if (tx.status === "failed") return "Failed";
                            return "Pending";
                          };

                          const getStatusColor = () => {
                            if (tx.status === "confirmed")
                              return "text-primary";
                            if (tx.status === "failed") return "text-red-500";
                            return "text-orange-400";
                          };

                          return (
                            <div
                              key={tx.id}
                              className="flex items-center justify-between p-2 py-1 bg-card/50 rounded-md border border-border/50"
                            >
                              <div className="flex items-center space-x-2">
                                {getTransactionIcon()}
                                <div className="flex flex-col">
                                  <span className="text-xs font-medium text-foreground capitalize">
                                    {tx.type}{" "}
                                    {tx.amount &&
                                      `${parseFloat(tx.amount).toFixed(4)} ${
                                        vaultConfig.config.symbol
                                      }`}
                                  </span>
                                  <span
                                    className={`text-xs ${getStatusColor()}`}
                                  >
                                    {getStatusText()}
                                  </span>
                                </div>
                              </div>
                              {tx.hash && (
                                <a
                                  href={getExplorerTxUrl(tx.hash)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                                >
                                  <ExternalLink className="h-3 w-3" />
                                </a>
                              )}
                            </div>
                          );
                        })}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-card/50 to-background/50 border-border shadow-xl h-[180px]">
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center justify-between mb-3 sm:mb-4">
                  <h3 className="text-muted-foreground text-xs sm:text-sm font-medium">
                    Next vault settlement
                  </h3>
                  <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-foreground" />
                </div>
                <p className="text-base sm:text-lg font-bold text-foreground">
                  {countdown.minutes} Minutes
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
    </div>
  );
};

export default VaultDetails;
