import React, { useState, useEffect, useRef } from "react";
import { Circle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "./ui/card";
import { fetchAuditLogs } from "@/services/auditService";
import { AuditLog } from "@/services/config";

interface LogEntry {
  timestamp: string;
  action: string;
  status: string;
  reason: string;
  id: string;
}

const AgentTerminal = ({ currentVaultName }: { currentVaultName: string }) => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  const formatLog = (log: AuditLog): LogEntry => {
    const date = new Date(log.createdAt);
    const formattedDate = date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
      timeZone: "UTC",
    });

    return {
      id: log.id,
      timestamp: `${formattedDate} UTC`.toUpperCase(),
      action: log.taskType.toUpperCase(),
      status: log.status.toUpperCase(),
      reason: log.agentReasoning || log.message || "No details provided",
    };
  };

  const loadLogs = async (isHistory = false) => {
    if (loading || (!hasMore && isHistory) || !currentVaultName) return;

    setLoading(true);
    try {
      const currentOffset = isHistory ? logs.length : 0;
      const limit = 15;
      const response = await fetchAuditLogs(
        currentVaultName,
        limit,
        currentOffset,
      );

      if (response.success && response.data.logs) {
        const newLogs = response.data.logs
          .sort(
            (a, b) =>
              new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
          )
          .map(formatLog);

        setHasMore(response.data.pagination.hasMore);

        if (isHistory) {
          // sorted older logs to existing logs
          setLogs((prev) => [...newLogs, ...prev]);

          // Maintain scroll position
          if (scrollRef.current) {
            const container = scrollRef.current;
            const oldScrollHeight = container.scrollHeight;
            const oldScrollTop = container.scrollTop;

            requestAnimationFrame(() => {
              const newScrollHeight = container.scrollHeight;
              const heightDifference = newScrollHeight - oldScrollHeight;
              container.scrollTop = heightDifference + oldScrollTop;
            });
          }
        } else {
          // Initial load
          setLogs(newLogs);

          // Scroll to bottom on initial load
          if (isInitialLoad) {
            setTimeout(() => {
              if (scrollRef.current) {
                scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
              }
            }, 100);
            setIsInitialLoad(false);
          }
        }
      }
    } catch (error) {
      console.error("Failed to fetch audit logs:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs(false);
  }, [currentVaultName]);

  const handleScroll = () => {
    if (scrollRef.current) {
      const { scrollTop } = scrollRef.current;
      if (scrollTop === 0 && hasMore && !loading) {
        loadLogs(true);
      }
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "REJECTED":
      case "FAILED":
        return "text-destructive";
      case "SKIPPED":
        return "text-yellow-500";
      case "COMPLETED":
      case "SUCCESS":
      default:
        return "text-primary";
    }
  };

  return (
    <Card data-testid="agent-terminal" className="w-full px-0 rounded-xl border border-border bg-gradient-to-br from-card/50 to-background/50 min-h-[360px] text-xs sm:text-sm shadow-xl relative overflow-hidden">
      <CardContent className="p-0 text-muted-foreground">
        <div className="grid grid-cols-1 py-4 px-6 border-b border-border sm:grid-cols-3 gap-y-2 gap-x-4 text-xs font-medium">
          <div className="flex flex-wrap gap-2">
            <span className="text-[#e4dfcb]">Agent:</span>
            <span data-testid="agent-terminal-name" className="text-foreground">Neura AI Yield Optimizer</span>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="text-[#e4dfcb]">Path:</span>
            <span className="text-foreground">
              ~/agents/neura-v2-yield-optimizer
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="text-[#e4dfcb]">Status:</span>
            <span data-testid="agent-terminal-status" className="text-foreground uppercase">Active</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 px-6 text-xs mb-2 mt-1">
          <span className="text-[#e4dfcb]">Thoughts</span>
        </div>

        <div
          ref={scrollRef}
          onScroll={handleScroll}
          data-testid="agent-terminal-logs"
          className="space-y-6 max-h-72 overflow-auto px-6 pt-2 pb-10"
        >
          {loading && logs.length > 0 && (
            <div className="flex justify-center py-2">
              <Loader2 className="w-4 h-4 animate-spin text-primary" />
            </div>
          )}

          {logs.map((log) => (
            <div
              key={log.id}
              data-testid="agent-terminal-log-entry"
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
                    getStatusColor(log.status),
                  )}
                >
                  {log.action}
                </span>
                <span className="text-border">•</span>
                <div
                  className={cn(
                    "flex items-center gap-1.5 font-bold tracking-wide uppercase",
                    getStatusColor(log.status),
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