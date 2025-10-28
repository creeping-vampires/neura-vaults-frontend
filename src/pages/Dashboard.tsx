import { useEffect, useMemo, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, DollarSign, Percent, Rocket } from "lucide-react";
import { usePrice } from "@/hooks/usePrice";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import { fetchHypeBalance } from "@/lib/utils";
import { useMultiVault } from "@/hooks/useMultiVault";
import { useActiveWallet } from "@/hooks/useActiveWallet";

const Dashboard = () => {
  const {
    getAllVaults,
    getTotalTVL,
    // usdt0Vault,
    refreshAllData,
  } = useMultiVault();
  const { authenticated, login } = usePrivy();
  const { wallet, userAddress, hasEmailLogin } = useActiveWallet();

  const primaryVault = useMemo(() => {
    const vaults = getAllVaults();
    const usdc = vaults.find((v) => v.symbol === "USDC");
    return usdc || vaults[0];
  }, [getAllVaults]);

  const { get24APY, getHighest7APY } = usePrice();

  const [hypeBalance, setHypeBalance] = useState<number>(0);

  const fetchBalances = useCallback(async () => {
    try {
      if (!authenticated || !userAddress) return;

      const hype = await fetchHypeBalance(userAddress);
      setHypeBalance(hype);
    } catch (err) {
      setHypeBalance(0);
    }
  }, [authenticated, userAddress]);

  useEffect(() => {
    fetchBalances();
    refreshAllData();
  }, [fetchBalances]);

  const [dashboardData, setDashboardData] = useState({
    tvl: 0,
    currentAPY: 0,
    interestEarned: 0,
    totalSupply: 0,
  });

  useEffect(() => {
    const calculateDashboardData = async () => {
      try {
        const allVaults = getAllVaults();

        const tvl = await getTotalTVL();
        // Calculate weighted average APY
        let totalWeightedAPY = 0;
        let totalTVL = 0;
        allVaults.forEach((vault) => {
          const vaultTVL = vault.data?.tvl || 0;
          const vaultAPY = vault.data?.currentNetAPR || 0;
          totalWeightedAPY += vaultTVL * vaultAPY;
          totalTVL += vaultTVL;
        });
        const weightedAverageAPY =
          totalTVL > 0 ? totalWeightedAPY / totalTVL : 0;

        // Calculate total interest earned across all vaults
        const totalInterestEarned = allVaults.reduce((sum, vault) => {
          return sum + (vault.data?.compoundedYield || 0);
        }, 0);

        // Calculate total agent volume (total supply across all vaults)
        const totalAgentVolume = allVaults.reduce((sum, vault) => {
          return sum + (vault.data?.totalSupply || 0);
        }, 0);

        setDashboardData({
          tvl,
          currentAPY: weightedAverageAPY,
          interestEarned: totalInterestEarned,
          totalSupply: totalAgentVolume,
        });
      } catch (error) {
        console.error("Error calculating dashboard data:", error);
        setDashboardData({
          tvl: 0,
          currentAPY: 0,
          interestEarned: 0,
          totalSupply: 0,
        });
      }
    };

    calculateDashboardData();
  }, [getAllVaults, getTotalTVL]);

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6 min-h-screen relative">
      {/* Portfolio Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <Card className="bg-gradient-to-br from-card/50 to-background/50 border-border shadow-xl">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <h3 className="text-muted-foreground text-xs sm:text-sm font-medium">
                Total Value Locked
              </h3>
              <DollarSign className="h-4 w-4 sm:h-5 sm:w-5 text-foreground" />
            </div>
            <div className="w-full flex items-end">
              <div className="space-y-1 sm:space-y-2">
                <p className="text-xl sm:text-2xl font-bold text-foreground">
                  $
                  {dashboardData.tvl.toLocaleString(undefined, {
                    maximumFractionDigits: 4,
                  })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* need to add total volume */}
        <Card className="bg-gradient-to-br from-card/50 to-background/50 border-border shadow-xl">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <h3 className="text-muted-foreground text-xs sm:text-sm font-medium">
                Total Agent Volume
              </h3>
              <Rocket className="h-4 w-4 sm:h-5 sm:w-5 text-foreground" />
            </div>
            <div className="space-y-1 sm:space-y-2">
              <p className="text-xl sm:text-2xl font-bold text-foreground">
                ${" "}
                {dashboardData.totalSupply.toLocaleString(undefined, {
                  maximumFractionDigits: 4,
                })}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-card/50 to-background/50 border-border shadow-xl">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <h3 className="text-muted-foreground text-xs sm:text-sm font-medium">
                Current APY
              </h3>
              <Percent className="h-4 w-4 sm:h-5 sm:w-5 text-foreground" />
            </div>
            <div className="space-y-1 sm:space-y-2">
              <div className="w-fit text-xl sm:text-2xl font-bold text-foreground gap-1 relative group">     {dashboardData.currentAPY.toFixed(2)} %
                <div className="flex items-center gap-1 absolute top-9 left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-[#262626] rounded-md shadow-lg text-sm invisible opacity-0 group-hover:visible group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap">
                  <div className="font-medium text-muted-foreground">
                    7-Day APY
                  </div>
                  <div className="font-medium text-foreground">:</div>
                  <div className="font-medium ml-1 text-foreground">
                    {getHighest7APY() ? `${getHighest7APY().toFixed(2)}%` : "-"}
                  </div>
                  <div className="absolute top-[-4px] left-1/2 -translate-x-1/2 w-2 h-2 bg-[#262626] rotate-45"></div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-card/50 to-background/50 border-border shadow-xl">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <h3 className="text-muted-foreground text-xs sm:text-sm font-medium">
                Interest Earned
              </h3>
              <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-foreground" />
            </div>
            <div className="space-y-1 sm:space-y-2">
              <p className="text-xl sm:text-2xl font-bold text-foreground">
                ${dashboardData.interestEarned.toFixed(4)}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <div className="space-y-4 sm:space-y-6">
        <Card className="bg-gradient-to-br from-card/50 to-background/50 border-border shadow-xl">
          <CardHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-3 sm:pb-4">
            <div className="flex items-center space-x-2">
              <CardTitle className="text-[#e4dfcb] font-bold text-base sm:text-lg">
                Token Balances
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="w-full flex flex-col sm:flex-row gap-4 sm:gap-6 p-4 sm:p-6 pt-0 sm:pt-0">
            {authenticated ? (
              <>
                <div className="w-full to-primary/10 p-3 sm:p-4 rounded-xl border border-border">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
                      {`${primaryVault?.symbol || "Vault"} Balance`}
                    </p>
                    <Badge
                      variant="secondary"
                      className="bg-muted text-muted-foreground border-border text-xs"
                    >
                      Stablecoin
                    </Badge>
                  </div>
                  <p className="text-foreground font-bold text-xl sm:text-2xl">
                    {Number(primaryVault?.data?.assetBalance || 0).toFixed(4)} {primaryVault?.symbol || ""}
                  </p>
                </div>

                {/* <div className="w-full p-3 sm:p-4 rounded-xl border border-border">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
                      USDT0 Balance
                    </p>
                    <Badge
                      variant="secondary"
                      className="bg-muted text-muted-foreground border-border text-xs"
                    >
                      Stablecoin
                    </Badge>
                  </div>
                  <p className="text-foreground font-bold text-xl sm:text-2xl">
                    {usdt0Vault?.assetBalance?.toFixed(4) || "0.0000"} USDT0
                  </p>
                </div> */}

                <div className="w-full p-3 sm:p-4 rounded-xl border border-border">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
                      HYPE Balance
                    </p>
                    <Badge
                      variant="secondary"
                      className="bg-muted text-muted-foreground border-border text-xs"
                    >
                      Native
                    </Badge>
                  </div>
                  <p className="text-foreground font-bold text-xl sm:text-2xl">
                    {hypeBalance.toFixed(4)} HYPE
                  </p>
                </div>
              </>
            ) : (
              <div className="w-full flex flex-col items-center justify-center py-8 space-y-4">
                <div className="text-center">
                  <p className="text-muted-foreground text-sm mb-2">
                    Please log in to view your token balances
                  </p>
                </div>
                <Button
                  onClick={login}
                  variant="wallet"
                  className="w-40 px-6 py-2"
                >
                  <span>Login</span>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-card/50 to-background/50 border-border shadow-xl">
          <CardHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-3 sm:pb-4">
            <div className="flex items-start sm:items-center justify-between gap-2 sm:gap-0">
              <div className="flex items-center space-x-2">
                <CardTitle className="text-[#e4dfcb] font-bold text-base sm:text-lg">
                  Rewards Program
                </CardTitle>
              </div>
              {/* <Badge
                variant="secondary"
                className="bg-muted text-muted-foreground border-border text-xs"
              >
                {rewardsData.length} Programs
              </Badge> */}
            </div>
          </CardHeader>
          <CardContent className="space-y-2 sm:space-y-3 p-4 sm:p-6 pt-0 sm:pt-0">
            <div className="text-center py-8">
              <p className="text-muted-foreground text-lg">Coming Soon</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
