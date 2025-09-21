import { PublicClient, Address, parseAbi } from 'viem';

export interface BatchCall {
  address: Address;
  abi: readonly any[];
  functionName: string;
  args?: any[];
}

export interface BatchResult {
  success: boolean;
  data: any;
  error?: string;
}

export class BatchRpcClient {
  private publicClient: PublicClient;
  private cache: Map<string, { data: any; timestamp: number; ttl: number }> =
    new Map();
  private pendingBatches: Map<string, Promise<any>> = new Map();
  private cacheCleanupInterval: NodeJS.Timeout | null = null;
  private readonly MAX_CACHE_SIZE = 100;
  private supportsMulticall: boolean | null = null;

  constructor(publicClient: any) {
    // Create a clean public client to avoid type issues
    this.publicClient = {
      ...publicClient,
      account: undefined,
    } as PublicClient;

    // Start cache cleanup interval
    this.startCacheCleanup();
  }

  private startCacheCleanup() {
    // Clean up expired cache entries every 60 seconds
    this.cacheCleanupInterval = setInterval(() => {
      const now = Date.now();
      const keysToDelete: string[] = [];

      for (const [key, entry] of this.cache.entries()) {
        if (now - entry.timestamp > entry.ttl) {
          keysToDelete.push(key);
        }
      }

      keysToDelete.forEach((key) => this.cache.delete(key));

      // If cache is still too large, remove oldest entries
      if (this.cache.size > this.MAX_CACHE_SIZE) {
        const entries = Array.from(this.cache.entries()).sort(
          ([, a], [, b]) => a.timestamp - b.timestamp
        );
        const toRemove = entries.slice(
          0,
          this.cache.size - this.MAX_CACHE_SIZE
        );
        toRemove.forEach(([key]) => this.cache.delete(key));
      }
    }, 60000);
  }

  public destroy() {
    if (this.cacheCleanupInterval) {
      clearInterval(this.cacheCleanupInterval);
      this.cacheCleanupInterval = null;
    }
    this.cache.clear();
    this.pendingBatches.clear();
  }

  /**
   * Batch multiple contract calls into a single multicall
   */
  async batchRead(
    calls: readonly BatchCall[],
    options: { cacheKey?: string; ttl?: number; forceRefresh?: boolean } = {}
  ): Promise<BatchResult[]> {
    const { cacheKey, ttl = 30000, forceRefresh = false } = options;

    // Check cache first
    if (cacheKey && !forceRefresh) {
      const cached = this.cache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < cached.ttl) {
        return cached.data;
      }
    }

    // Check if this batch is already pending
    if (cacheKey && this.pendingBatches.has(cacheKey)) {
      return this.pendingBatches.get(cacheKey)!;
    }

    // Create new batch promise
    const batchPromise = this.executeBatch(calls);

    if (cacheKey) {
      this.pendingBatches.set(cacheKey, batchPromise);
    }

    try {
      const results = await batchPromise;

      // Cache results
      if (cacheKey) {
        this.cache.set(cacheKey, { data: results, timestamp: Date.now(), ttl });
        this.pendingBatches.delete(cacheKey);
      }

      return results;
    } catch (error) {
      if (cacheKey) {
        this.pendingBatches.delete(cacheKey);
      }
      throw error;
    }
  }

  private async executeBatch(
    calls: readonly BatchCall[]
  ): Promise<BatchResult[]> {
    // Check if multicall is supported on this chain
    if (this.supportsMulticall === null) {
      await this.checkMulticallSupport();
    }

    // If multicall is not supported, fall back to individual calls immediately
    if (!this.supportsMulticall) {
      return this.fallbackToIndividual(calls);
    }

    try {
      // Use multicall for better performance with explicit typing
      const contracts = calls.map((call) => ({
        address: call.address as `0x${string}`,
        abi: call.abi as any,
        functionName: call.functionName as string,
        args: (call.args || []) as any[],
      }));

      // @ts-ignore
      const multicallResults = (await this.publicClient.multicall({
        contracts,
        allowFailure: true,
      })) as Array<{
        status: "success" | "failure";
        result?: any;
        error?: any;
      }>;

      return multicallResults.map((result) => {
        if (result.status === "success") {
          return { success: true, data: result.result };
        } else {
          return {
            success: false,
            data: null,
            error: result.error?.message || "Multicall failed",
          };
        }
      });
    } catch (error) {
      console.warn(
        "Multicall failed, falling back to individual calls:",
        error
      );
      // Mark multicall as unsupported for future calls
      this.supportsMulticall = false;
      return this.fallbackToIndividual(calls);
    }
  }

  private async checkMulticallSupport(): Promise<void> {
    try {
      // Get chain ID to check for known chains without multicall3
      const chainId = await this.publicClient.getChainId();

      // Hyper EVM (chain ID 999) doesn't have multicall3 deployed
      if (chainId === 999) {
        this.supportsMulticall = false;
        return;
      }

      // For other chains, try a simple multicall to test support
      const testCall = {
        address: "0x0000000000000000000000000000000000000000" as `0x${string}`,
        abi: [
          {
            name: "balanceOf",
            type: "function",
            inputs: [{ name: "account", type: "address" }],
            outputs: [{ name: "", type: "uint256" }],
          },
        ],
        functionName: "balanceOf",
        args: ["0x0000000000000000000000000000000000000000"],
      };

      // @ts-ignore
      await this.publicClient.multicall({
        contracts: [testCall],
        allowFailure: true,
      });

      this.supportsMulticall = true;
    } catch (error) {
      // If multicall fails, assume it's not supported
      this.supportsMulticall = false;
    }
  }

  private async fallbackToIndividual(
    calls: readonly BatchCall[]
  ): Promise<BatchResult[]> {
    const results = await Promise.allSettled(
      calls.map(async (call) => {
        try {
          const result = await this.publicClient.readContract({
            address: call.address,
            abi: call.abi,
            functionName: call.functionName,
            args: call.args || [],
          });
          return { success: true, data: result };
        } catch (error) {
          return {
            success: false,
            data: null,
            error: error instanceof Error ? error.message : "Unknown error",
          };
        }
      })
    );

    return results.map((result) =>
      result.status === "fulfilled"
        ? result.value
        : { success: false, data: null, error: "Promise rejected" }
    );
  }

  /**
   * Clear cache for specific key or all cache
   */
  clearCache(cacheKey?: string) {
    if (cacheKey) {
      this.cache.delete(cacheKey);
    } else {
      this.cache.clear();
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }
}

let batchClient: BatchRpcClient | null = null;

export const getBatchRpcClient = (publicClient: any) => {
  if (!batchClient) {
    batchClient = new BatchRpcClient(publicClient);
  }
  return batchClient;
};