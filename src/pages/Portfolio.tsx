import React, { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { DollarSign, ChevronDown, ChevronUp } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useVaultContract } from "@/hooks/useVaultContract";
import { useAccount } from "wagmi";
import { useVaultApi } from "@/hooks/useVaultApi";
import { useWalletConnection } from "@/hooks/useWalletConnection";

const Portfolio = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("positions");
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  const toggleRow = (vaultAddress: string) => {
    setExpandedRow(expandedRow === vaultAddress ? null : vaultAddress);
  };

  const { getAllVaults, getTotalTVL, getTotalUserDeposits, refreshAllData } =
    useVaultContract();

  const {
    get24APY,
    get7APY,
    get30APY,
    getVaultDataByAddress,
    userPoints,
    fetchUserPoints,
  } = useVaultApi();

  const [portfolioData, setPortfolioData] = useState({
    totalBalance: 0,
    totalDeposits: 0,
    totalEarnings: 0,
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
          change24h: 0,
          change7d: 0,
        });
      } catch (error) {
        console.error("Error calculating portfolio data:", error);
      }
    };

    calculatePortfolioData();
  }, [getTotalTVL, getTotalUserDeposits, getAllVaults]);

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
        symbol: vault.symbol,
        name: vault.name || `ai${vault.symbol}`,
        balance: vault.data?.userShares || 0,
        value: vault.data?.userDeposits || 0,
        apy: vault.data?.currentNetAPR || 0,
        earnings: vault.data?.compoundedYield || 0,
        icon: vault.symbol.charAt(0),
        status: "active",
      }));
  }, [getAllVaults]);

  const handlePositionClick = (position: any) => {
    navigate(`/vaults/${position.vaultAddress}`);
  };

  const { isConnecting, connectWithFallback } = useWalletConnection();
  const { address: userAddress } = useAccount();
  const isConnected = Boolean(userAddress);

  useEffect(() => {
    if (isConnected && userAddress) {
      refreshAllData();
      fetchUserPoints(userAddress);
    }
  }, [isConnected, userAddress, refreshAllData, fetchUserPoints]);

  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] px-4">
        <div className="bg-gradient-to-br from-card/50 to-background/50 border border-border rounded-2xl p-8 max-w-sm w-full text-center shadow-lg">
          <h3 className="text-muted-foreground text-md font-medium mb-5">
            Connect your wallet to view your portfolio balance
          </h3>
          <Button
            variant="wallet"
            className="w-40 px-6 py-2"
            onClick={async () => {
              await connectWithFallback("/vaults");
            }}
            disabled={isConnecting}
          >
            {isConnecting ? "Connecting..." : "Connect Wallet"}
          </Button>
        </div>
      </div>
    );
  }
  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      {/* Portfolio Overview Card */}
      <Card className="bg-gradient-to-br from-card/50 to-background/50 border-border shadow-xl select-none relative z-10">
        <CardContent className="p-4 sm:p-6 relative">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 w-full">
              <CardTitle className="text-[#e4dfcb] font-bold sm:text-lg">
                Your Deposits
              </CardTitle>
            </div>
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

            <div className="flex justify-end space-x-6 mt-4">
              <div className="flex flex-col items-center">
                <div className="text-muted-foreground text-xs">
                  Current APY (7d)
                </div>
                <div className="text-foreground font-semibold mt-1 w-fit gap-1 relative group">
                  {get7APY().toFixed(2)}%
                  <div className="absolute top-8 left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-[#262626] rounded-md shadow-lg text-sm invisible opacity-0 group-hover:visible group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap">
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
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
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
                <div className="relative overflow-x-auto sm:overflow-visible">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left text-muted-foreground text-xs font-medium uppercase tracking-wide py-3">
                          Vault
                        </th>
                        <th className="text-center text-muted-foreground text-xs font-medium uppercase tracking-wide py-3">
                          Shares
                        </th>
                        <th className="text-center text-muted-foreground text-xs font-medium uppercase tracking-wide py-3">
                          APY
                        </th>
                        <th className="text-center text-muted-foreground text-xs font-medium uppercase tracking-wide py-3">
                          REWARDS
                        </th>
                        <th className="w-[200px] pl-10 text-left text-muted-foreground text-xs font-medium uppercase tracking-wide py-3">
                          CTA
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {positions.map((position) => {
                        const isExpanded =
                          expandedRow === position.vaultAddress;
                        const allocations =
                          getVaultDataByAddress(position.vaultAddress)
                            ?.allocations || [];
                        const uniqueProtocols = Array.from(
                          new Set(
                            allocations.map((a) => a.protocol.toLowerCase())
                          )
                        );

                        return (
                          <React.Fragment key={position.vaultAddress}>
                            <tr
                              className={`border-b border-border hover:bg-accent/30 cursor-pointer transition-colors select-none ${
                                isExpanded ? "bg-accent/30" : ""
                              }`}
                              onClick={() => toggleRow(position.vaultAddress)}
                            >
                              <td className="py-4">
                                <div className="flex items-center gap-3">
                                  <img
                                    src={`/vaults/${position.symbol}.svg`}
                                    alt={position.name}
                                    className="w-10 h-10 p-1 rounded-full border border-white/50 transform transition-transform duration-200"
                                  />
                                  <div>
                                    <p className="text-foreground font-semibold text-sm">
                                      {position.name}
                                    </p>
                                    <p className="text-muted-foreground text-xs">
                                      {position.symbol}
                                    </p>
                                  </div>
                                </div>
                              </td>
                              <td className="text-center py-4">
                                <span>
                                  ${position?.balance?.toLocaleString()}
                                </span>
                              </td>
                              <td className="text-primary font-semibold py-6 flex items-center justify-center gap-1 relative group">
                                {get7APY().toFixed(2)}%
                                <div className="absolute top-14 left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-[#262626] rounded-md shadow-lg text-sm invisible opacity-0 group-hover:visible group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap">
                                  <div className="absolute top-[-4px] left-1/2 -translate-x-1/2 w-2 h-2 bg-[#262626] rotate-45"></div>
                                  <div className="flex items-center gap-1">
                                    <div className="font-medium text-muted-foreground">
                                      1-Day APY
                                    </div>
                                    <div className="font-medium text-foreground ml-auto">
                                      :
                                    </div>
                                    <div className="font-medium text-foreground ml-1">
                                      {get24APY()
                                        ? `${get24APY().toFixed(2)}%`
                                        : "-"}
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
                                      {get30APY()
                                        ? `${get30APY().toFixed(2)}%`
                                        : "-"}
                                    </div>
                                  </div>
                                </div>
                              </td>
                              <td className="text-center py-4">
                                <div className="flex items-center justify-center gap-1">
                                  {uniqueProtocols.map((reward, idx) => (
                                    <div
                                      key={`${reward}-${idx}`}
                                      className="relative group"
                                    >
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
                                    </div>
                                  ))}
                                </div>
                              </td>
                              <td className="text-center py-4 flex justify-between items-center gap-3 ml-auto">
                                <Button
                                  variant="wallet"
                                  className="m-0 w-auto"
                                  onClick={() => handlePositionClick(position)}
                                >
                                  View Details
                                </Button>
                                {isExpanded ? (
                                  <ChevronUp className="w-6 h-6 mx-auto text-muted-foreground" />
                                ) : (
                                  <ChevronDown className="w-6 h-6 mx-auto text-muted-foreground" />
                                )}
                              </td>
                            </tr>
                            {isExpanded && (
                              <tr className="bg-accent/10 border-b border-border select-none">
                                <td colSpan={5} className="p-0">
                                  <div className="w-[60%] mx-auto p-6 space-y-4 animate-in slide-in-from-top-2 duration-200">
                                    <div className="w-full">
                                      <div>
                                        <h4 className="text-sm font-medium text-muted-foreground mb-3">
                                          Allocations & Rewards
                                        </h4>
                                        <div className="space-y-3">
                                          {uniqueProtocols.map(
                                            (protocol, idx) => {
                                              const protocolKey =
                                                protocol.toUpperCase();
                                              const protocolPoints =
                                                userPoints?.pointsByProtocol?.[
                                                  protocolKey
                                                ];
                                              const hasPoints =
                                                protocolPoints &&
                                                Number(protocolPoints.points) >
                                                  0;

                                              return (
                                                <div
                                                  key={idx}
                                                  className="flex items-center justify-between p-3 rounded-lg bg-background/50 border border-border"
                                                >
                                                  <div className="flex items-center gap-3">
                                                    <img
                                                      src={`/pools/${protocol}.svg`}
                                                      alt={protocol}
                                                      className="w-6 h-6 rounded-full"
                                                      onError={(e) => {
                                                        const target =
                                                          e.target as HTMLImageElement;
                                                        target.style.display =
                                                          "none";
                                                        target.parentElement!.innerHTML = `<div class="w-6 h-6 bg-primary/20 rounded-full flex items-center justify-center text-primary font-bold text-xs">${protocol
                                                          .charAt(0)
                                                          .toUpperCase()}</div>`;
                                                      }}
                                                    />
                                                    <span className="uppercase font-medium text-foreground">
                                                      {protocol}
                                                    </span>
                                                  </div>
                                                  <div className="text-sm">
                                                    {hasPoints ? (
                                                      <span className="text-primary font-medium">
                                                        {Number(
                                                          protocolPoints.points
                                                        ).toFixed(6)}{" "}
                                                        Points
                                                      </span>
                                                    ) : (
                                                      <span className="text-muted-foreground">
                                                        Yield Only
                                                      </span>
                                                    )}
                                                  </div>
                                                </div>
                                              );
                                            }
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })}
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
