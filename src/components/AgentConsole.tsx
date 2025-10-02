import React, { useState, useEffect, useRef } from "react";
import { X } from "lucide-react";
import { useLocation } from "react-router-dom";
  import { fetchVaultActivities } from "@/services/vaultActivityService";

  interface StrategySummaryItem {
    id: string;
    summary: string;
    timestamp: string;
    rebalanceType: string;
    fromProtocol: string;
    toProtocol: string;
  }

  interface AgentData {
    id: string;
    content: string;
    timestamp: string;
    nextRunTime?: string;
    strategySummaries?: StrategySummaryItem[];
  }

  interface AgentConsoleProps {
    vaultId?: string;
    currentVault: string;
  }

  const AgentConsole: React.FC<AgentConsoleProps> = ({
    vaultId,
    currentVault,
  }) => {
    const location = useLocation();
    const [isOpen, setIsOpen] = useState(false);
    const [agentData, setAgentData] = useState<AgentData | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    const isAiUSDeVault = location.pathname.includes("/vaults/");

    const scrollToBottom = () => {
      const container = scrollContainerRef.current;
      if (container) {
        container.scrollTo({
          top: container.scrollHeight,
          behavior: "smooth",
        });
      }
    };

    const fetchAgentData = async () => {
      try {
        setIsLoading(true);

        // Try to get latest agent thought first
        // const latestThought = await agentService.getLatestAgentThought();

        // Fetch vault activities to get all strategy summaries
        let strategySummaries: StrategySummaryItem[] = [];
        if (vaultId) {
          try {
            const activities = await fetchVaultActivities(vaultId);
            strategySummaries = activities
              .filter(
                (activity) =>
                  activity.type === "rebalance" &&
                  activity.strategy_summary &&
                  activity.status === "success" &&
                  activity.asset_symbol === currentVault
              )
              .map((activity) => ({
                id: activity.id,
                summary: activity.strategy_summary!,
                timestamp: activity.created_at,
                rebalanceType: `${activity.from_protocol} → ${activity.to_protocol}`,
                fromProtocol: activity.from_protocol || "",
                toProtocol: activity.to_protocol || "",
              }));

            strategySummaries.sort(
              (a, b) =>
                new Date(a.timestamp).getTime() -
                new Date(b.timestamp).getTime()
            );
          } catch (activityError) {
            console.warn("Could not fetch vault activities:", activityError);
          }
        }

        // if (latestThought) {
        //   setAgentData({
        //     id: latestThought.thoughtId.toString(),
        //     content: latestThought.thought,
        //     timestamp: latestThought.createdAt,
        //     strategySummaries,
        //   });
        // } else
        if (strategySummaries.length > 0) {
          // Use latest rebalance strategy summary as primary content if no agent thought
          const latestRebalance =
            strategySummaries[strategySummaries.length - 1];
          setAgentData({
            id: `rebalance_${latestRebalance.id}`,
            content: latestRebalance.summary,
            timestamp: latestRebalance.timestamp,
            strategySummaries,
          });
        } 
      } catch (error) {
        console.error("Error fetching agent data:", error);
        // Fallback data
        setAgentData({
          id: "autonomous_trader_fallback",
          content:
            "An error occurred while fetching agent data. Please try again later.",
          timestamp: new Date().toISOString(),
        });
      } finally {
        setIsLoading(false);
      }
    };

    // Fetch agent data when component mounts and console opens
    useEffect(() => {
      if (isOpen && isAiUSDeVault) {
        fetchAgentData();
      }
    }, [isOpen, isAiUSDeVault]);

    // Scroll to bottom when console opens or when data changes
    useEffect(() => {
      if (isOpen) {
        // Small delay to ensure DOM is updated
        setTimeout(scrollToBottom, 100);
      }
    }, [isOpen, agentData]);

    // Don't render if not on aiUSDe vault page
    if (!isAiUSDeVault) {
      return null;
    }

    const NeuraLogo = () => (
      <div className="w-8 h-8 rounded-full flex items-center justify-center overflow-hidden">
        <img
          src="/logo.webp"
          alt="Neura Vault"
          className="w-full h-full object-contain"
        />
      </div>
    );

    const formatTime = (timestamp: string) => {
      const date = new Date(timestamp);
      return date.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
      });
    };

    const formatRelativeTime = (timestamp: string) => {
      const now = new Date();
      const date = new Date(timestamp);
      const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

      if (diffInSeconds < 60) {
        return "just now";
      } else if (diffInSeconds < 3600) {
        const minutes = Math.floor(diffInSeconds / 60);
        return `${minutes} minute${minutes > 1 ? "s" : ""} ago`;
      } else if (diffInSeconds < 86400) {
        const hours = Math.floor(diffInSeconds / 3600);
        return `${hours} hour${hours > 1 ? "s" : ""} ago`;
      } else if (diffInSeconds < 2592000) {
        const days = Math.floor(diffInSeconds / 86400);
        return `${days} day${days > 1 ? "s" : ""} ago`;
      } else {
        const months = Math.floor(diffInSeconds / 2592000);
        return `${months} month${months > 1 ? "s" : ""} ago`;
      }
    };

    if (!isOpen) {
      return (
        <div className="fixed bottom-6 right-6 z-50">
          <button
            onClick={() => setIsOpen(true)}
            className="bg-[#0A0A0A] border border-primary p-3 rounded-full shadow-lg transition-all duration-300 hover:scale-110"
          >
            <NeuraLogo />
          </button>
        </div>
      );
    }

    return (
      <div className="fixed bottom-6 right-6 z-50">
        <div className="bg-[#0A0A0A]/95 backdrop-blur-sm border border-[#404040] rounded-lg shadow-2xl overflow-hidden w-[440px]">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-[#404040]">
            <div className="flex items-center gap-3">
              <NeuraLogo />
              <div>
                <h3 className="text-[#FAFAFA] font-semibold text-sm">
                  Agent Console
                </h3>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 hover:bg-[#262626] rounded transition-colors"
            >
              <X className="h-4 w-4 text-[#A1A1A1]" />
            </button>
          </div>

          {/* Content */}
          <div ref={scrollContainerRef} className="pt-4 px-4 mb-4 max-h-[360px] overflow-auto scroll-smooth">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="text-[#A1A1A1] text-sm">
                  Loading agent data...
                </div>
              </div>
            ) : agentData?.strategySummaries?.length > 0 ? (
              <div className="space-y-3">
                {agentData.strategySummaries.map((strategySummary, index) => (
                  <div
                    key={strategySummary.id}
                    className="bg-[#0F0F0F] p-3 rounded-lg border border-[#404040]"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[#A1A1A1] text-xs font-mono">
                        {strategySummary.rebalanceType}
                      </span>
                      <span className="text-[#737373] text-xs">
                        {formatRelativeTime(strategySummary.timestamp)}
                      </span>
                    </div>
                    <p className="text-[#E5E5E5] text-xs leading-relaxed">
                      {strategySummary.summary}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <NeuraLogo />
                <p className="text-[#A1A1A1] mt-4 text-sm">
                  No agent thoughts are available at this time. The autonomous
                  agent will analyze market conditions and provide insights when
                  new opportunities arise.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

export default AgentConsole;