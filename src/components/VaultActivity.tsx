import React, { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ExternalLink } from "lucide-react";
import { getExplorerTxUrl } from "@/lib/utils";
import { fetchVaultActivities } from "@/services/vaultActivityService";
import { LatestVaultActionItem } from "@/services/config";
import { formatUnits } from "viem";
import { usePrice } from "@/hooks/usePrice";

interface VaultActivityProps {
  vaultId?: string;
  currentVault: string; // symbol
}

const VaultActivity: React.FC<VaultActivityProps> = ({
  vaultId,
  currentVault,
}) => {
  // Vault activities state
  const [vaultActivities, setVaultActivities] = useState<
    LatestVaultActionItem[]
  >([]);
  const [activitiesLoading, setActivitiesLoading] = useState(false);
  const [activitiesError, setActivitiesError] = useState<string | null>(null);

  // Fetch vault activities
  const fetchActivities = useCallback(async () => {
    if (!vaultId) return;

    setActivitiesLoading(true);
    setActivitiesError(null);

    try {
      const activities = await fetchVaultActivities(vaultId);
      setVaultActivities(activities);
    } catch (error) {
      console.error("Error fetching vault activities:", error);
      setActivitiesError("Failed to load vault activities");
    } finally {
      setActivitiesLoading(false);
    }
  }, [vaultId]);

  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  const { getVaultDataByAddress } = usePrice();
  const decimals = (() => {
    const info = getVaultDataByAddress?.(vaultId || "");
    return Number((info as any)?.underlyingDecimals ?? 6);
  })();

  const formatTimeAgoFromSeconds = (secondsStr: string) => {
    const ts = Number(secondsStr);
    const now = Math.floor(Date.now() / 1000);
    const diff = now - ts;
    if (diff < 60) return "Just now";
    if (diff < 3600) return `${Math.floor(diff / 60)} minutes ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`;
    return `${Math.floor(diff / 86400)} days ago`;
  };

  return (
    <Card className="bg-gradient-to-br from-card/50 to-background/50 border-border shadow-xl">
      <CardHeader className="pb-3 sm:pb-6">
        <div className="flex items-center justify-between">
          <CardTitle className="text-[#e4dfcb] font-bold sm:text-lg">
            Vault Activity
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-3 max-h-[300px] overflow-y-auto scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
          {activitiesLoading ? (
            <div className="text-muted-foreground text-sm text-center py-4">
              Loading activities...
            </div>
          ) : activitiesError ? (
            <div className="text-red-500 text-sm text-center py-4">
              {activitiesError}
            </div>
          ) : vaultActivities.length === 0 ? (
            <div className="text-muted-foreground text-sm text-center py-4">
              No activities found.
            </div>
          ) : (
            vaultActivities.slice(0, 10).map((activity, i) => {
              const symbolForDecimals =
                currentVault || activity.vaultName || "";
              let amountNum = 0;
              try {
                const raw = BigInt(activity.assets ?? "0");
                amountNum = Number(formatUnits(raw, decimals));
              } catch {
                amountNum =
                  Number(activity.assets || 0) / Math.pow(10, decimals);
              }
              const isWithdraw = activity.actionType === "Withdraw";
              const sign = isWithdraw ? "-" : "+";

              return (
                <div
                  key={`${i}-${activity.blockNumber}-${activity.txHash}`}
                  className="flex items-center justify-between py-1 sm:py-3 border-b border-border/50 last:border-b-0"
                >
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-0.5">
                      {activity.actionType && (
                        <Badge
                          variant="secondary"
                          className={
                            isWithdraw
                              ? "text-xs bg-red-500/10 text-red-600 border-red-500/20"
                              : "text-xs bg-primary/10 text-primary border-primary/20"
                          }
                        >
                          {activity.actionType}
                        </Badge>
                      )}
                      <Badge
                        variant="secondary"
                        className={`text-xs bg-mute-foreground text-foreground border-foreground/20`}
                      >
                        {activity.vaultName || currentVault}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-foreground font-medium text-xs sm:text-sm">
                        <span className={"text-foreground ml-1"}>
                          {sign}{" "}
                          {isFinite(amountNum)
                            ? amountNum.toFixed(2)
                            : activity.assets}{" "}
                          {currentVault}
                        </span>
                      </span>
                      <span className="text-muted-foreground text-xs">
                        {formatTimeAgoFromSeconds(activity.timestamp)}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center relative">
                    {activity.txHash ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        asChild
                        className="ml-1 -mb-0.5"
                      >
                        <a
                          href={getExplorerTxUrl(activity.txHash)}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <ExternalLink className="h-3 w-3 sm:h-4 sm:w-4" />
                        </a>
                      </Button>
                    ) : (
                      <div className="w-11 h-8" />
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default VaultActivity;