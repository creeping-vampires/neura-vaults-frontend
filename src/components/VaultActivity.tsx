import React, { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ExternalLink } from "lucide-react";
import { getExplorerTxUrl } from "@/lib/utils";
import {
  fetchVaultActivities,
  VaultActivity as VaultActivityType,
} from "@/services/vaultActivityService";
import { VAULTS, VaultType } from "@/utils/constant";

interface VaultActivityProps {
  vaultId?: string;
  currentVault: string;
  vaultConfig: {
    type: VaultType;
    config: typeof VAULTS.USDE;
  };
}

const VaultActivity: React.FC<VaultActivityProps> = ({
  vaultId,
  currentVault,
  vaultConfig,
}) => {
  // Vault activities state
  const [vaultActivities, setVaultActivities] = useState<VaultActivityType[]>([]);
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

  // Helper functions
  const getOperationName = (type: string) => {
    switch (type.toLowerCase()) {
      case "deposit":
        return "Deposit";
      case "withdrawal":
        return "Withdrawal";
      default:
        return type.charAt(0).toUpperCase() + type.slice(1);
    }
  };

  const getOperationColor = (type: string) => {
    switch (type.toLowerCase()) {
      case "deposit":
        return "bg-primary/10 text-primary border-primary/20";
      case "withdrawal":
        return "bg-red-500/10 text-orange-500 border-red-500/20";
      default:
        return "bg-blue-500/10 text-blue-500 border-blue-500/20";
    }
  };

  const formatTimeAgo = (timestampStr: string) => {
    const timestamp = new Date(timestampStr).getTime() / 1000;
    const now = Date.now() / 1000;
    const diff = now - timestamp;

    if (diff < 60) return "Just now";
    if (diff < 3600) return `${Math.floor(diff / 60)} minutes ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`;
    return `${Math.floor(diff / 86400)} days ago`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "success":
        return "text-primary";
      case "failed":
        return "text-red-500";
      case "skipped":
        return "text-yellow-500";
      default:
        return "text-gray-500";
    }
  };

  return (
    <Card className="bg-gradient-to-br from-card/50 to-background/50 border-border shadow-xl">
      <CardHeader className="pb-3 sm:pb-6">
        <div className="flex items-center justify-between">
          <CardTitle className="text-foreground font-medium text-base sm:text-lg">
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
            vaultActivities
              .filter(
                (activity) =>
                  activity.status === "success" &&
                  activity.asset_symbol === currentVault
              )
              .sort(
                (a, b) =>
                  new Date(b.created_at).getTime() -
                  new Date(a.created_at).getTime()
              )
              .slice(0, 10)
              .map((activity) => {
                // Get the first transaction hash if available
                const firstTransaction = activity.transactions?.[0];

                return (
                  <div
                    key={activity.id}
                    className="flex items-center justify-between py-1 sm:py-3 border-b border-border/50 last:border-b-0"
                  >
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-0.5">
                        <Badge
                          variant="secondary"
                          className={`text-xs ${getOperationColor(
                            activity.type
                          )}`}
                        >
                          {getOperationName(activity.type)}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-foreground font-medium text-xs sm:text-sm">
                          {activity.total_assets_to_deposit ? (
                            <span className="text-muted-foreground ml-1">
                              {(
                                activity.total_assets_to_deposit /
                                Math.pow(
                                  10,
                                  activity.asset_decimals || 18
                                )
                              ).toFixed(2)}{" "}
                              {activity.asset_symbol ||
                                vaultConfig.config.symbol}
                            </span>
                          ) : (
                            <span className="text-muted-foreground ml-1">
                              {`${activity.from_protocol} → ${activity.to_protocol}`}
                            </span>
                          )}
                        </span>
                        <span className="text-muted-foreground text-xs">
                          {formatTimeAgo(activity.created_at)}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center relative">
                      <span
                        className={`text-xs ${getStatusColor(
                          activity.status
                        )} absolute top-0.5 right-12`}
                      >
                        {activity.status}
                      </span>
                      {firstTransaction?.transaction_hash ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          asChild
                          className="ml-1 -mb-0.5"
                        >
                          <a
                            href={getExplorerTxUrl(
                              "0x" + firstTransaction.transaction_hash
                            )}
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