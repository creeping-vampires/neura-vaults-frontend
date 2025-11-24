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

interface MarketItem {
  address: `0x${string}`;
  depositAPY: number;
  totalDeposits: number;
  name: string;
  symbol: string;
  status?: string;
  rewards?: string[];
}

const Vaults = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");

  const {
    getAllVaults,
    getTotalTVL,
    isLoading: isVaultsLoading,
    error: vaultsError,
  } = useMultiVault();
  const { get24APY, get7APY, get30APY, getVaultDataByAddress } = usePrice();

  const marketData: MarketItem[] = useMemo(() => {
    const allVaults = getAllVaults();
    const vaultItems = allVaults.map(({ address, symbol, name, data }) => ({
      address: address as `0x${string}`,
      depositAPY: data?.currentNetAPR || 0,
      totalDeposits: data?.tvl || 0,
      name: name || `ai${symbol}`,
      symbol,
      // status: symbol === "USDC" ? "active" : "coming-soon",
    }));

    return [...vaultItems];
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
    navigate(`/vaults/${market.address}`);
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
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-card/70 to-background/70 border-border shadow-xl">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <h3 className="text-muted-foreground text-xs sm:text-sm font-medium">
                Current APY (24h)
              </h3>
              <Percent className="h-4 w-4 sm:h-5 sm:w-5 text-foreground" />
            </div>
            <div className="w-fit text-xl sm:text-2xl font-bold text-foreground gap-1 relative group">
              {get24APY().toFixed(2)} %
              <div className="absolute top-9 left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-[#262626] rounded-md shadow-lg text-sm invisible opacity-0 group-hover:visible group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap">
                <div className="absolute top-[-4px] left-1/2 -translate-x-1/2 w-2 h-2 bg-[#262626] rotate-45"></div>
                <div className="flex items-center gap-1">
                  <div className="font-medium text-muted-foreground">
                    7-Day APY
                  </div>
                  <div className="font-medium text-foreground ml-auto">:</div>
                  <div className="font-medium text-foreground ml-1">
                    {get7APY() ? `${get7APY().toFixed(2)}%` : "-"}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <div className="font-medium text-muted-foreground">
                    30-Day APY
                  </div>
                  <div className="font-medium text-foreground ml-auto">:</div>
                  <div className="font-medium text-foreground ml-1">
                    {get30APY() ? `${get30APY().toFixed(2)}%` : "-"}
                  </div>
                </div>
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
              {marketData.length}
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
          <CardTitle className="text-[#e4dfcb] font-bold sm:text-lg">
            Vaults
          </CardTitle>
        </CardHeader>
        <CardContent className="p-2 pt-0 sm:p-6">
          {isVaultsLoading ? (
            <div className="text-muted-foreground text-sm">
              Loading markets...
            </div>
          ) : vaultsError ? (
            <div className="text-destructive text-sm">
              Failed to load markets.
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
                  {filteredMarkets.map((market) => (
                    <tr
                      key={market.address}
                      className="border-b border-border hover:bg-accent/30 cursor-pointer"
                      onClick={() => handleVaultClick(market)}
                    >
                      <td className="py-4">
                        <div className="flex items-center">
                          <div>
                            <div className="font-medium text-foreground">
                              {market.name}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-4">
                        <div className="flex items-center">
                          <div>
                            <div className="font-medium text-muted-foreground">
                              {market.symbol}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="text-center py-4">
                        <span>
                          $
                          {market.totalDeposits.toLocaleString(undefined, {
                            maximumFractionDigits: 2,
                          })}
                        </span>
                      </td>
                      <td className="text-primary font-semibold py-6 flex items-center justify-center gap-1 relative group">
                        {get24APY().toFixed(2)}%
                        <div className="absolute top-12 left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-[#262626] rounded-md shadow-lg text-sm invisible opacity-0 group-hover:visible group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap">
                          <div className="absolute top-[-4px] left-1/2 -translate-x-1/2 w-2 h-2 bg-[#262626] rotate-45"></div>
                          <div className="flex items-center gap-1">
                            <div className="font-medium text-muted-foreground">
                              7-Day APY
                            </div>
                            <div className="font-medium text-foreground ml-auto">
                              :
                            </div>
                            <div className="font-medium text-foreground ml-1">
                              {get7APY() ? `${get7APY().toFixed(2)}%` : "-"}
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
                      </td>
                      <td className="text-center py-4">
                        <div className="flex items-center justify-center gap-1">
                          {(
                            getVaultDataByAddress(market.address)
                              ?.allocations || []
                          )
                            .map((a) => a.protocol.toLowerCase())
                            .map((reward, idx) => (
                              <div
                                key={`${reward}-${idx}`}
                                className="relative group"
                              >
                                <img
                                  src={`/pools/${reward}.svg`}
                                  alt={reward}
                                  className="w-6 h-6 rounded-full border border-white/50 transform hover:scale-110 transition-transform duration-200 cursor-pointer"
                                  onError={(e) => {
                                    const target = e.target as HTMLImageElement;
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
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Vaults;
