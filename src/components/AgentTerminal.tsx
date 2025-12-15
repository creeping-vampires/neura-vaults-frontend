import React, { useState, useEffect } from "react";
import { Circle, Terminal as TerminalIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "./ui/card";

interface LogEntry {
  timestamp: string;
  action: string;
  status: string;
  reason: string;
}

const AgentTerminal = ({
  className,
  symbol = "USDC",
}: {
  className?: string;
  symbol?: string;
}) => {
  const [logs, setLogs] = useState<LogEntry[]>([]);

  useEffect(() => {
    setLogs([
      {
        timestamp: "DEC 12, 13:17:28 UTC",
        action: "DEPOSIT",
        status: "COMPLETED",
        reason: `Successfully bridged and deposited 150,000 ${symbol} into Hyperlend Mainnet pool. Transaction verified on-chain (0x7a...9f2). Initial APY locked at 14.2% with auto-compounding enabled.`,
      },
      {
        timestamp: "DEC 12, 14:05:12 UTC",
        action: "REBALANCE",
        status: "REJECTED",
        reason: `Proposed shift of 20% to Hypurrfi/${symbol} (13.1% APY) rejected. Delta APY (+0.42%) insufficient to cover estimated slippage and gas costs (0.6% break-even threshold). Volatility check failed: Target pool TVL fluctuated >15% in last 4h.`,
      },
      {
        timestamp: "DEC 12, 15:17:21 UTC",
        action: "HARVEST",
        status: "COMPLETED",
        reason: `Auto-harvested 450.22 ${symbol} in yield rewards from Hyperlend strategy. Re-invested into base principal to maximize compounding effect. Current effective APY: 14.5%.`,
      },
      {
        timestamp: "DEC 12, 15:45:33 UTC",
        action: "ENTER",
        status: "SKIPPED",
        reason: `Detected new lending pool on Felix/${symbol} with 18% APY. Skipped entry: Pool age (12h) below minimum safety maturity (48h). Audit verification pending. Added to watchlist for next epoch scan.`,
      },
    ]);
  }, [symbol]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "REJECTED":
        return "text-destructive";
      case "SKIPPED":
        return "text-yellow-500";
      case "COMPLETED":
      default:
        return "text-primary";
    }
  };

  return (
    <Card
      className=
        "w-full px-0 rounded-xl border border-border bg-gradient-to-br from-card/50 to-background/50 min-h-[360px] text-xs sm:text-sm shadow-xl"
    >
      <CardContent className="p-0 text-muted-foreground">
        <div className="grid grid-cols-1 py-4 px-6 border-b border-border sm:grid-cols-3 gap-y-2 gap-x-4 text-xs font-medium">
          <div className="flex flex-wrap gap-2">
            <span className="text-[#e4dfcb]">Agent:</span>
            <span className="text-foreground">Neura AI Yield Optimizer</span>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="text-[#e4dfcb]">Path:</span>
            <span className="text-foreground">
              ~/agents/neura-v2-yield-optimizer
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="text-[#e4dfcb]">Status:</span>
            <span className="text-foreground uppercase">Active</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 px-6 text-xs mb-2 mt-1">
          <span className="text-[#e4dfcb]">Thoughts</span>
        </div>

        <div className="space-y-6 max-h-72 overflow-auto px-6 pt-2 pb-10">
          {logs.map((log, index) => (
            <div
              key={index}
              className="space-y-2 animate-in fade-in slide-in-from-bottom-2 duration-500"
            >
              <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs">
                <span className="text-muted-foreground font-medium">
                  [{log.timestamp}]
                </span>
                <span className="text-border">•</span>
                <span
                  className={cn(
                    "font-bold tracking-wide uppercase",
                    getStatusColor(log.status)
                  )}
                >
                  {log.action}
                </span>
                <span className="text-border">•</span>
                <div
                  className={cn(
                    "flex items-center gap-1.5 font-bold tracking-wide uppercase",
                    getStatusColor(log.status)
                  )}
                >
                  <Circle className="w-2 h-2 fill-current" />
                  {log.status}
                </div>
              </div>
              <div className="flex gap-3 pl-1">
                <div className="w-px bg-border shrink-0" />
                <p className="text-foreground/90 leading-relaxed opacity-90">
                  <span className="text-muted-foreground mr-2">↳ reason</span>
                  {log.reason}
                </p>
              </div>
            </div>
          ))}

          <div className="flex items-center gap-2 text-muted-foreground pt-2">
            <span className="text-border">|</span>
            <span>Thoughts Running</span>
            <span className="animate-pulse text-primary">_ _ _</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default AgentTerminal;
