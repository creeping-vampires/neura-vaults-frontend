import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  BarChart3,
  DollarSign,
  Percent,
  Search,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useMultiVault } from "@/hooks/useMultiVault";
import { usePrice } from "@/hooks/usePrice";
import PythAttribution from "@/components/shared/PythAttribution";

interface MarketItem {
  address: `0x${string}`;
  depositAPY: number;
  totalDeposits: number;
  name: string;
  symbol: string;
  status?: string;
  rewards?: string[];
}

const Markets = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  // const [selectedCategory, setSelectedCategory] = useState("all");
  // const [activeFilter, setActiveFilter] = useState("all");

  const {
    getAllVaults,
    getTotalTVL,
    // usdcVault,
    // refreshAllData,
  } = useMultiVault();
  const {
    // priceData,
    // isPriceLoading,
    // getAverageAPY,
    // getHighest24APY,
    getHighest7APY,
    // getVaultDataByToken,
    get24APY,
    get7APY,
  } = usePrice();
  const [loading, setLoading] = useState<boolean>(false);
  // const [txError, setTxError] = useState<string | null>(null);
  // const [assetSymbol, setAssetSymbol] = useState<string>("USDC");
  // const [assetDecimals, setAssetDecimals] = useState<number>(18);

  // useEffect(() => {
  //   const run = async () => {
  //     try {
  //       const assetAddress = await publicClient.readContract({
  //         address: VAULTS.USDC.yieldAllocatorVaultAddress as `0x${string}`,
  //         abi: YieldAllocatorVaultABI as any,
  //         functionName: "asset",
  //         args: [],
  //       });
  //       const [symbol, decimals] = await Promise.all([
  //         publicClient
  //           .readContract({
  //             address: assetAddress as `0x${string}`,
  //             abi: parseAbi(["function symbol() view returns (string)"]),
  //             functionName: "symbol",
  //           })
  //           .catch(() => "ASSET"),
  //         publicClient
  //           .readContract({
  //             address: assetAddress as `0x${string}`,
  //             abi: parseAbi(["function decimals() view returns (uint8)"]),
  //             functionName: "decimals",
  //           })
  //           .catch(() => 18),
  //       ]);
  //       setAssetSymbol(typeof symbol === "string" ? symbol : "ASSET");
  //       setAssetDecimals(
  //         typeof decimals === "number" ? decimals : Number(decimals)
  //       );
  //     } catch {
  //       setAssetSymbol("USDC");
  //       setAssetDecimals(18);
  //     }
  //   };
  //   run();
  // }, []);

  const marketData: MarketItem[] = useMemo(() => {
    const allVaults = getAllVaults();
    const vaultItems = allVaults.map(({ type, config, data }) => ({
      address: config.yieldAllocatorVaultAddress as `0x${string}`,
      depositAPY: data?.currentNetAPR || 0,
      totalDeposits: data?.tvl || 0,
      name: `ai${config.symbol}`,
      symbol: config.symbol,
      status: config.symbol === "USDC" ? "active" : "coming-soon",
    }));

    const usdt0Item: MarketItem = {
      address: "0x0000000000000000000000000000000000000001" as `0x${string}`,
      depositAPY: 0,
      totalDeposits: 0,
      name: "aiUSDT0",
      symbol: "USDT0",
      status: "coming-soon",
    };
    const hypeItem: MarketItem = {
      address: "0x0000000000000000000000000000000000000000" as `0x${string}`,
      depositAPY: 0,
      totalDeposits: 0,
      name: "aiHYPE",
      symbol: "HYPE",
      status: "coming-soon",
    };

    return [...vaultItems, usdt0Item, hypeItem];
  }, [getAllVaults]);

  const filteredMarkets = marketData.filter((market) => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch =
      market.address.toLowerCase().includes(searchLower) ||
      market.symbol.toLowerCase().includes(searchLower);
    return matchesSearch;
  });

  const [totalDeposits, setTotalDeposits] = useState(0);

  useEffect(() => {
    const calculateTotalDeposits = async () => {
      try {
        // Use getTotalTVL function for accurate AUM calculation
        const total = await getTotalTVL();
        setTotalDeposits(total);
      } catch (error) {
        console.error("Error calculating total deposits:", error);
        setTotalDeposits(0);
      }
    };

    calculateTotalDeposits();
  }, [getTotalTVL]);

  const handleVaultClick = (market: MarketItem) => {
    // Only allow clicking on USDC vault
    if (market.symbol === "USDC" && market.status === "active") {
      navigate(`/vaults/${market.address}`);
    }
  };
  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6 min-h-screen">
      {/* Market Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        <Card className="bg-gradient-to-br from-card/70 to-background/70 border-border shadow-xl">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <h3 className="text-muted-foreground text-xs sm:text-sm font-medium">
                Total Value Locked
              </h3>
              <DollarSign className="h-4 w-4 sm:h-5 sm:w-5 text-foreground" />
            </div>
            <p className="text-xl sm:text-2xl font-bold text-foreground">
              $
              {totalDeposits.toLocaleString(undefined, {
                maximumFractionDigits: 4,
              })}
            </p>

            <PythAttribution variant="compact" className="mt-2" />
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-card/70 to-background/70 border-border shadow-xl">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <h3 className="text-muted-foreground text-xs sm:text-sm font-medium">
                Current APY
              </h3>
              <Percent className="h-4 w-4 sm:h-5 sm:w-5 text-foreground" />
            </div>
            <div className="w-fit text-xl sm:text-2xl font-bold text-foreground gap-1 relative group">
              12.75 %
              <div className="flex items-center gap-1 absolute top-9 left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-[#262626] rounded-md shadow-lg text-sm invisible opacity-0 group-hover:visible group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap">
                <div className="font-medium text-muted-foreground">
                  7-Day APY
                </div>
                <div className="font-medium text-foreground">:</div>
                <div className="font-medium ml-1 text-foreground">0.39%</div>
                <div className="absolute top-[-4px] left-1/2 -translate-x-1/2 w-2 h-2 bg-[#262626] rotate-45"></div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-card/70 to-background/70 border-border shadow-xl">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <h3 className="text-muted-foreground text-xs sm:text-sm font-medium">
                Number of Pools
              </h3>
              <BarChart3 className="h-4 w-4 sm:h-5 sm:w-5 text-foreground" />
            </div>
            <p className="text-xl sm:text-2xl font-bold text-foreground">
              {/* {
                marketData.filter((market) => market.status !== "Coming Soon")
                  .length
              } */}
              1
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="bg-gradient-to-br from-card/70 to-background/70 relative w-full sm:w-96">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            type="text"
            placeholder="Search by pool name or address..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 w-full"
          />
        </div>
      </div>

      {/* Markets Table */}
      <Card className="bg-gradient-to-br from-card/50 to-background/50 border-border shadow-xl">
        <CardHeader className="pl-4 pb-0 pt-4 sm:p-6 sm:pb-0">
          <CardTitle className="text-foreground font-bold text-lg sm:text-xl">
            Vaults
          </CardTitle>
        </CardHeader>
        <CardContent className="p-2 pt-0 sm:p-6">
          {loading ? (
            <div className="text-muted-foreground text-sm">
              Loading markets...
            </div>
          ) : marketData.length === 0 ? (
            <div className="text-muted-foreground text-sm">
              No markets found.
            </div>
          ) : (
            <div className="relative overflow-x-auto sm:overflow-visible">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left text-muted-foreground text-xs font-medium uppercase tracking-wide py-3">
                      Vault
                    </th>
                    <th className="text-left text-muted-foreground text-xs font-medium uppercase tracking-wide py-3">
                      Asset
                    </th>
                    <th className="text-center text-muted-foreground text-xs font-medium uppercase tracking-wide py-3">
                      TVL
                    </th>
                    <th className="text-center text-muted-foreground text-xs font-medium uppercase tracking-wide py-3">
                      APY
                    </th>
                    <th className="text-center text-muted-foreground text-xs font-medium uppercase tracking-wide py-3">
                      REWARDS
                    </th>
                    <th className="text-right text-muted-foreground text-xs font-medium uppercase tracking-wide py-3">
                      {/* Actions */}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMarkets.map((market, i) => {
                    const isClickable =
                      market.symbol === "USDC" && market.status === "active";
                    const isComingSoon = market.status === "coming-soon";
                    return (
                      <tr
                        key={market.address}
                        className={`border-b border-border ${
                          isClickable
                            ? "hover:bg-accent/30 cursor-pointer"
                            : isComingSoon
                            ? "opacity-60 cursor-not-allowed"
                            : "cursor-default"
                        }`}
                        onClick={() => handleVaultClick(market)}
                      >
                        <td className="py-4">
                          <div className="flex items-center">
                            <div>
                              <div
                                className={`font-medium ${
                                  isClickable
                                    ? "text-muted-foreground"
                                    : "text-muted-foreground/70"
                                }`}
                              >
                                {market.name}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="py-4">
                          <div className="flex items-center">
                            <div>
                              <div
                                className={`font-medium ${
                                  isClickable
                                    ? "text-muted-foreground"
                                    : "text-muted-foreground/70"
                                }`}
                              >
                                {market.symbol}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="text-center py-4">
                          {isComingSoon ? (
                            <span className={isClickable ? "" : "opacity-70"}>
                              $0
                            </span>
                          ) : (
                            <span className={isClickable ? "" : "opacity-70"}>
                              $
                              {market.totalDeposits.toLocaleString(undefined, {
                                maximumFractionDigits: 2,
                              })}
                            </span>
                          )}
                        </td>
                        <td
                          className={`text-primary font-semibold py-6 flex items-center justify-center gap-1 relative group ${
                            isClickable ? "" : "opacity-70"
                          }`}
                        >
                          {isComingSoon ? "0" : "12.75"}%
                          {!isComingSoon && (
                            <div className="flex items-center gap-1 absolute top-14 left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-[#262626] rounded-md shadow-lg text-sm invisible opacity-0 group-hover:visible group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap">
                              <div className="font-medium text-muted-foreground">
                                7-Day APY
                              </div>
                              <div className="font-medium text-foreground">
                                :
                              </div>
                              <div className="font-medium ml-1 text-foreground">
                                0.39%
                              </div>
                              <div className="absolute top-[-4px] left-1/2 -translate-x-1/2 w-2 h-2 bg-[#262626] rotate-45"></div>
                            </div>
                          )}
                        </td>
                        <td className="text-center py-4">
                          {isComingSoon ? (
                            <span className="text-xs bg-primary/20 text-primary border border-primary px-2 py-1 rounded-full font-medium mt-1 inline-block">
                              Coming Soon
                            </span>
                          ) : (
                            <div
                              className={`flex items-center justify-center gap-1 ${
                                isClickable ? "" : "opacity-70"
                              }`}
                            >
                              {["hypurrfi", "hyperlend", "felix"].map(
                                (reward, idx) => (
                                  <div key={idx} className="relative group">
                                    <img
                                      src={`/pools/${reward}.svg`}
                                      alt={reward}
                                      className="w-6 h-6 rounded-full border border-white/50 transform hover:scale-110 transition-transform duration-200 cursor-pointer"
                                    />
                                    <div className="absolute border border-white/30 top-8 uppercase left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-black text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
                                      {reward}
                                    </div>
                                  </div>
                                )
                              )}
                            </div>
                          )}
                        </td>
                        {/* <td className="text-right sm:w-28">
                          {isComingSoon && (
                            <span className="text-xs bg-primary/20 text-primary border border-primary px-2 py-1 rounded-full font-medium">
                              Coming Soon
                            </span>
                          )}
                        </td> */}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Markets;
