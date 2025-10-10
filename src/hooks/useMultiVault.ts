import { useCallback, useMemo, useEffect, useState } from 'react';
import { usePublicClient, useWalletClient } from 'wagmi';
import { useWallets } from "@privy-io/react-auth";
import {
  parseUnits,
  formatUnits,
  parseAbi,
  parseAbiItem,
  maxUint256,
} from "viem";
import { hyperliquid, publicClient } from "@/lib/privyConfig";
import { VAULTS, VaultType, VAULT_TYPES } from "@/utils/constant";
import {
  getMultiVaultBatchClient,
  calculateVaultMetrics,
} from "@/utils/multiVaultBatch";
import { VaultData, VaultMetrics } from "@/types/vault";
import YieldAllocatorVaultABI from "@/utils/abis/YieldAllocatorVault.json";
import { toast } from "@/hooks/use-toast";
import { switchToChain } from "@/lib/utils";
import { useActiveWallet } from "@/hooks/useActiveWallet";

// Multi-vault cache to prevent unnecessary re-fetching
let multiVaultCache: {
  data: Record<VaultType, VaultData>;
  timestamp: number;
} | null = null;

export const useMultiVault = () => {
  const publicClient = usePublicClient();
  const { data: wagmiWalletClient } = useWalletClient();
  const { wallets } = useWallets();

  // Track last deposit request for pending status UI
  const [lastDepositRequestId, setLastDepositRequestId] = useState<
    bigint | null
  >(null);
  const [lastDepositController, setLastDepositController] = useState<
    `0x${string}` | null
  >(null);
  const [lastDepositPendingAssets, setLastDepositPendingAssets] = useState<
    number | null
  >(null);

  // Track last withdraw (redeem) request for pending status UI
  const [lastWithdrawRequestId, setLastWithdrawRequestId] = useState<
    bigint | null
  >(null);
  const [lastWithdrawController, setLastWithdrawController] = useState<
    `0x${string}` | null
  >(null);
  const [lastWithdrawPendingAssets, setLastWithdrawPendingAssets] = useState<
    number | null
  >(null);

// Use cached data if fresh (<5m)
  const cachedData = useMemo(() => {
    if (multiVaultCache) {
      const isExpired = Date.now() - multiVaultCache.timestamp > 5 * 60 * 1000; // 5 minutes
      if (!isExpired) {
        return multiVaultCache.data;
      }
    }

// Fallback to localStorage
    try {
      const cached = localStorage.getItem("multiVaultData");
      if (cached) {
        const parsed = JSON.parse(cached);
        const isExpired = Date.now() - parsed.timestamp > 5 * 60 * 1000; // 5 minutes
        if (!isExpired && parsed.data) {
          // Update memory cache from localStorage
          multiVaultCache = { data: parsed.data, timestamp: parsed.timestamp };
          return parsed.data;
        }
      }
    } catch (error) {
      console.error("Failed to parse cached multi-vault data:", error);
    }
    return null;
  }, []);

// Initialize vault data from cache or defaults
  const initialVaultData: Record<VaultType, VaultData> = useMemo(() => {
    if (cachedData) {
      return cachedData;
    }

    const defaultData: Record<VaultType, VaultData> = {} as any;
    VAULT_TYPES.forEach((type) => {
      defaultData[type] = {
        totalAssets: 0,
        totalSupply: 0,
        currentNetAPR: 0,
        tvl: 0,
        userDeposits: 0,
        userShares: 0,
        compoundedYield: 0,
        assetBalance: 0,
        pricePerShare: 1,
        assetDecimals: 18,
        totalRequestedAssets: 0,
        pendingDepositAssets: 0,
        isLoading: cachedData ? false : true,
        error: null,
        poolNetAPRs: [],
        poolTVLs: [],
        poolAddresses: [],
      };
    });
    return defaultData;
  }, [cachedData]);

  const [vaultData, setVaultData] =
    useState<Record<VaultType, VaultData>>(initialVaultData);
  const [isLoading, setIsLoading] = useState<boolean>(() => {
// Skip initial loading with cache
    return cachedData ? false : true;
  });
  const [error, setError] = useState<string | null>(null);

// Transaction state
  const [isTransacting, setIsTransacting] = useState(false);
  const [isDepositTransacting, setIsDepositTransacting] = useState(false);
  const [isWithdrawTransacting, setIsWithdrawTransacting] = useState(false);
  const [transactionHash, setTransactionHash] = useState<string | null>(null);

  const { wallet, userAddress, hasEmailLogin, hasWalletLogin, isPrivyWallet } =
    useActiveWallet();

  const fetchAllVaultData = useCallback(async () => {
    if (!publicClient) return;

    setIsLoading(true);
    setError(null);

    try {
      const multiVaultClient = getMultiVaultBatchClient(publicClient);
      const { vaultData: rawVaultData, userData } =
        await multiVaultClient.refreshAllData(
          VAULT_TYPES,
          (userAddress as `0x${string}`) || undefined
        );

      // Convert to VaultData
      const processedVaultData: Record<VaultType, VaultData> = {} as any;

      VAULT_TYPES.forEach((type) => {
        const rawData = rawVaultData[type];
        const userDataForVault = userData[type];

        const metrics = calculateVaultMetrics(rawData, userDataForVault);
        processedVaultData[type] = {
          totalAssets: metrics.totalAssets,
          totalSupply: metrics.totalSupply,
          currentNetAPR: metrics.currentNetAPR,
          tvl: metrics.tvl,
          userDeposits: (metrics as any).userDeposits || 0,
          userShares: (metrics as any).userShares || 0,
          compoundedYield: (metrics as any).compoundedYield || 0,
          assetBalance: (metrics as any).assetBalance || 0,
          pricePerShare: (metrics as any).pricePerShare || 1,
          assetDecimals: Number(rawData.assetDecimals),
          totalRequestedAssets: metrics.totalRequestedAssets,
          pendingDepositAssets: metrics.pendingDepositAssets,
          isLoading: false,
          error: null,
          poolNetAPRs: rawData.poolNetAPRs || [],
          poolTVLs: rawData.poolTVLs || [],
          poolAddresses: rawData.poolAddresses || [],
        };
      });

      setVaultData(processedVaultData);

      // Update memory cache
      multiVaultCache = { data: processedVaultData, timestamp: Date.now() };

      // Persist to localStorage
      try {
        localStorage.setItem(
          "multiVaultData",
          JSON.stringify({
            data: processedVaultData,
            timestamp: Date.now(),
          })
        );
      } catch (error) {
        console.error("Failed to cache multi-vault data:", error);
      }
    } catch (error) {
      console.error("Error fetching multi-vault data:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Failed to fetch vault data";
      setError(errorMessage);

      const errorVaultData: Record<VaultType, VaultData> = {} as any;
      VAULT_TYPES.forEach((type) => {
        errorVaultData[type] = {
          totalAssets: 0,
          totalSupply: 0,
          currentNetAPR: 0,
          tvl: 0,
          userDeposits: 0,
          userShares: 0,
          compoundedYield: 0,
          assetBalance: 0,
          pricePerShare: 1,
          assetDecimals: 18,
          totalRequestedAssets: 0,
          pendingDepositAssets: 0,
          isLoading: false,
          error: errorMessage,
          poolNetAPRs: [],
          poolTVLs: [],
          poolAddresses: [],
        };
      });
      setVaultData(errorVaultData);
    } finally {
      setIsLoading(false);
    }
  }, [publicClient, userAddress]);

  const refreshAllData = useCallback(() => {
    fetchAllVaultData();
  }, [publicClient, userAddress]);

  useEffect(() => {
    fetchAllVaultData();
  }, [fetchAllVaultData]);

  const getVaultByType = useCallback(
    (vaultType: VaultType) => {
      return vaultData[vaultType];
    },
    [vaultData]
  );

  const getAllVaults = useCallback(() => {
    return VAULT_TYPES.map((type) => ({
      type,
      config: VAULTS[type],
      data: vaultData[type],
    }));
  }, [vaultData]);

  const getTotalTVL = useCallback(async () => {
    if (!publicClient) return 0;

    try {
      const totals = await Promise.all(
        VAULT_TYPES.map(async (type) => {
          const address = VAULTS[type].yieldAllocatorVaultAddress as `0x${string}`;
          const assets = (await publicClient.readContract({
            address,
            abi: YieldAllocatorVaultABI as any,
            functionName: "totalAssets",
            args: [],
          })) as bigint;
          const decimals = vaultData[type]?.assetDecimals ?? 18;
          return Number(formatUnits(assets, decimals));
        })
      );
      return totals.reduce((sum, v) => sum + v, 0);
    } catch (error) {
      console.error("Error fetching TVL via totalAssets:", error);
      return 0;
    }
  }, [vaultData, publicClient]);

  const getTotalUserDeposits = useCallback(() => {
    return Object.values(vaultData).reduce((total, vault) => {
      return total + (vault?.userDeposits || 0);
    }, 0);
  }, [vaultData]);

  // Watch for settlement events to refresh UI promptly
  useEffect(() => {
    if (!publicClient || !userAddress) return;

    const unsubscribers: (() => void)[] = [];

    try {
      VAULT_TYPES.forEach((type) => {
        const address = VAULTS[type]
          .yieldAllocatorVaultAddress as `0x${string}`;

        const unwatchDeposit = publicClient.watchContractEvent({
          address,
          abi: YieldAllocatorVaultABI as any,
          eventName: "SettleDeposit",
          onLogs: (logs) => {
            if (logs && logs.length > 0) {
              refreshAllData();
              toast({
                variant: "success",
                title: "📦 Deposits Settled",
                description: "New shares may be claimable. Refreshing data...",
              });
            }
          },
        });

        const unwatchRedeem = publicClient.watchContractEvent({
          address,
          abi: YieldAllocatorVaultABI as any,
          eventName: "SettleRedeem",
          onLogs: (logs) => {
            if (logs && logs.length > 0) {
              refreshAllData();
              toast({
                variant: "success",
                title: "💸 Withdrawals Settled",
                description: "Assets may be claimable. Refreshing data...",
              });
            }
          },
        });

        unsubscribers.push(() => {
          try {
            unwatchDeposit();
          } catch {}
          try {
            unwatchRedeem();
          } catch {}
        });
      });
    } catch (e) {
      console.error("Failed to watch settlement events", e);
    }

    return () => {
      unsubscribers.forEach((unsub) => unsub());
    };
  }, [publicClient, userAddress, refreshAllData]);

  // Helpers: claimable amounts
  const getClaimableDepositAmount = useCallback(
    async (vaultAddress: string) => {
      if (!publicClient || !userAddress) return 0;
      try {
        const max = (await publicClient.readContract({
          address: vaultAddress as `0x${string}`,
          abi: YieldAllocatorVaultABI,
          functionName: "maxDeposit",
          args: [userAddress as `0x${string}`],
        })) as bigint;

  // Format by asset decimals
        const asset = (await publicClient.readContract({
          address: vaultAddress as `0x${string}`,
          abi: YieldAllocatorVaultABI,
          functionName: "asset",
        })) as `0x${string}`;
        const decimals = (await publicClient.readContract({
          address: asset,
          abi: parseAbi(["function decimals() view returns (uint8)"]),
          functionName: "decimals",
        })) as number;
        return Number(formatUnits(max, Number(decimals)));
      } catch (e) {
        console.log("error", e);
      }
    },
    [publicClient, userAddress]
  );

  const getClaimableRedeemAmount = useCallback(
    async (vaultAddress: string) => {
      if (!publicClient || !userAddress) return 0;
      try {
        const maxShares = (await publicClient.readContract({
          address: vaultAddress as `0x${string}`,
          abi: YieldAllocatorVaultABI,
          functionName: "maxRedeem",
          args: [userAddress as `0x${string}`],
        })) as bigint;

        const assets = (await publicClient.readContract({
          address: vaultAddress as `0x${string}`,
          abi: YieldAllocatorVaultABI,
          functionName: "convertToAssets",
          args: [maxShares],
        })) as bigint;

        const asset = (await publicClient.readContract({
          address: vaultAddress as `0x${string}`,
          abi: YieldAllocatorVaultABI,
          functionName: "asset",
        })) as `0x${string}`;
        const decimals = (await publicClient.readContract({
          address: asset,
          abi: parseAbi(["function decimals() view returns (uint8)"]),
          functionName: "decimals",
        })) as number;
        return Number(formatUnits(assets, Number(decimals)));
      } catch (e) {
        console.log("error", e);
      }
    },
    [publicClient, userAddress]
  );

  // Wallet client helper
  const getWalletClient = useCallback(async () => {
    if (wagmiWalletClient) {
      return wagmiWalletClient;
    }

  // Fallback to privy wallet
    const privyWallet = isPrivyWallet
      ? wallet
      : wallets.find((w) => w.walletClientType === "privy");
    if (privyWallet) {
      const { createWalletClient, custom } = await import("viem");
      return createWalletClient({
        chain: hyperliquid,
        transport: custom(await privyWallet.getEthereumProvider()),
      });
    }

    throw new Error("No wallet client available");
  }, [wagmiWalletClient, wallets, wallet, isPrivyWallet]);

  // Transaction functions
  const deposit = useCallback(
    async (vaultAddress: string, amount: string, vaultType: VaultType) => {
      const walletClient = await getWalletClient();
      if (!walletClient || !userAddress) {
        throw new Error("Wallet not connected");
      }

      try {
        const chainSwitched = await switchToChain();
        if (!chainSwitched) {
          throw new Error("Failed to switch to Hyper EVM chain");
        }
        setIsDepositTransacting(true);
        setTransactionHash(null);

  // Validate vault interface
        let assetAddress: `0x${string}`;
        try {
          assetAddress = (await publicClient.readContract({
            address: vaultAddress as `0x${string}`,
            abi: YieldAllocatorVaultABI,
            functionName: "asset",
          })) as `0x${string}`;
        } catch (e) {
          throw new Error(
            "Invalid vault address - does not implement vault interface"
          );
        }
        const assetDecimals = await publicClient.readContract({
          address: assetAddress as `0x${string}`,
          abi: parseAbi(["function decimals() view returns (uint8)"]),
          functionName: "decimals",
        });
        const amountBigInt = parseUnits(
          amount,
          Number(assetDecimals as number)
        );

        const currentAllowance = await publicClient.readContract({
          address: assetAddress as `0x${string}`,
          abi: parseAbi([
            "function allowance(address, address) view returns (uint256)",
          ]),
          functionName: "allowance",
          args: [userAddress as `0x${string}`, vaultAddress as `0x${string}`],
        });

        if ((currentAllowance as bigint) < amountBigInt) {
          const approveGas = await publicClient.estimateContractGas({
            address: assetAddress as `0x${string}`,
            abi: parseAbi([
              "function approve(address, uint256) returns (bool)",
            ]),
            functionName: "approve",
            args: [vaultAddress as `0x${string}`, maxUint256],
            account: userAddress as `0x${string}`,
          });

          const approveTx = await walletClient.writeContract({
            address: assetAddress as `0x${string}`,
            abi: parseAbi([
              "function approve(address, uint256) returns (bool)",
            ]),
            functionName: "approve",
            args: [vaultAddress as `0x${string}`, maxUint256],
            chain: hyperliquid,
            account: userAddress as `0x${string}`,
            gas: (approveGas * 200n) / 100n,
          });
          await publicClient.waitForTransactionReceipt({ hash: approveTx });
        }

  // Use requestDeposit (ERC-7540)
        const depositGas = await publicClient.estimateContractGas({
          address: vaultAddress as `0x${string}`,
          abi: YieldAllocatorVaultABI,
          functionName: "requestDeposit",
          args: [
            amountBigInt,
            userAddress as `0x${string}`,
            userAddress as `0x${string}`,
          ],
          account: userAddress as `0x${string}`,
        });

        const depositTx = await walletClient.writeContract({
          address: vaultAddress as `0x${string}`,
          abi: YieldAllocatorVaultABI,
          functionName: "requestDeposit",
          args: [
            amountBigInt,
            userAddress as `0x${string}`,
            userAddress as `0x${string}`,
          ],
          chain: hyperliquid,
          account: userAddress as `0x${string}`,
          gas: (depositGas * 200n) / 100n,
        });

        setTransactionHash(depositTx);

        const receipt = await publicClient.waitForTransactionReceipt({
          hash: depositTx,
        });

  // Read DepositRequest logs
        try {
          const depositRequestEvent = parseAbiItem(
            "event DepositRequest(address indexed controller, address indexed owner, uint256 indexed requestId, address sender, uint256 assets)"
          );

          const depositLogs = await publicClient.getLogs({
            address: vaultAddress as `0x${string}`,
            event: depositRequestEvent,
            args: { owner: userAddress as `0x${string}` },
            fromBlock: receipt.blockNumber,
            toBlock: receipt.blockNumber,
          });

          if (depositLogs && depositLogs.length > 0) {
            const latest = depositLogs[depositLogs.length - 1];
            const extractedRequestId = latest.args.requestId as bigint;
            const extractedController = latest.args.controller as `0x${string}`;

            if (extractedRequestId && extractedController) {
              setLastDepositRequestId(extractedRequestId);
              setLastDepositController(extractedController);

  // Query pending assets
              try {
                const pendingAssets = (await publicClient.readContract({
                  address: vaultAddress as `0x${string}`,
                  abi: YieldAllocatorVaultABI,
                  functionName: "pendingDepositRequest",
                  args: [extractedRequestId, extractedController],
                })) as bigint;
  // Format by asset decimals
                const formatted = Number(
                  formatUnits(pendingAssets, Number(assetDecimals as number))
                );
                setLastDepositPendingAssets(formatted);
              } catch (e) {
                console.warn(
                  "Failed to read pendingDepositRequest for last request",
                  e
                );
                setLastDepositPendingAssets(null);
              }
            }
          } else {
  // No matching logs
            toast({
              variant: "default",
              title: "Deposit Request Submitted",
              description:
                "Unable to locate requestId in logs for this transaction. Pending status may appear after refresh.",
            });
          }
        } catch (e) {
          console.warn("Failed to query DepositRequest logs", e);
        }

        toast({
          variant: "success",
          title: "✅ Deposit Request Submitted",
          description: `Successfully requested deposit of ${amount} ${vaultType}. Your deposit will be processed in the next settlement.`,
        });

        await refreshAllData();

        return depositTx;
      } catch (error) {
        console.error("Deposit failed:", error);

        toast({
          variant: "destructive",
          title: "❌ Deposit Failed",
          description:
            error instanceof Error
              ? error.message
              : "An unexpected error occurred during deposit.",
        });

        throw error;
      } finally {
        setIsDepositTransacting(false);
      }
    },
    [getWalletClient, userAddress, refreshAllData]
  );

  const withdraw = useCallback(
    async (vaultAddress: string, amount: string, vaultType: VaultType) => {
      const walletClient = await getWalletClient();
      if (!walletClient || !userAddress) {
        throw new Error("Wallet not connected");
      }
      try {
        const chainSwitched = await switchToChain();
        if (!chainSwitched) {
          throw new Error("Failed to switch to Hyper EVM chain");
        }
        setIsWithdrawTransacting(true);
        setTransactionHash(null);

  // Validate vault interface
        let assetAddress: `0x${string}`;
        try {
          assetAddress = (await publicClient.readContract({
            address: vaultAddress as `0x${string}`,
            abi: YieldAllocatorVaultABI,
            functionName: "asset",
          })) as `0x${string}`;
        } catch (e) {
          throw new Error(
            "Invalid vault address - does not implement vault interface"
          );
        }
        const assetDecimals = await publicClient.readContract({
          address: assetAddress as `0x${string}`,
          abi: parseAbi(["function decimals() view returns (uint8)"]),
          functionName: "decimals",
        });
        const amountBigInt = parseUnits(
          amount,
          Number(assetDecimals as number)
        );

  // Read share balance
        const userShares = await publicClient.readContract({
          address: vaultAddress as `0x${string}`,
          abi: YieldAllocatorVaultABI,
          functionName: "balanceOf",
          args: [userAddress as `0x${string}`],
        });

  // Read asset balance
        const userAssets = await publicClient.readContract({
          address: vaultAddress as `0x${string}`,
          abi: YieldAllocatorVaultABI,
          functionName: "convertToAssets",
          args: [userShares],
        });

        console.log("userShares", userShares);
        console.log("userAssets", userAssets);

  // For full withdrawals, use actual shares
        const isFullWithdrawal =
          amountBigInt >= ((userAssets as bigint) * 99n) / 100n; // 99% threshold

        const shares = isFullWithdrawal
          ? userShares
          : await publicClient.readContract({
              address: vaultAddress as `0x${string}`,
              abi: YieldAllocatorVaultABI,
              functionName: "convertToShares",
              args: [amountBigInt],
            });

        const requestRedeemGas = await publicClient.estimateContractGas({
          address: vaultAddress as `0x${string}`,
          abi: YieldAllocatorVaultABI,
          functionName: "requestRedeem",
          args: [
            shares,
            userAddress as `0x${string}`,
            userAddress as `0x${string}`,
          ],
          account: userAddress as `0x${string}`,
        });
        const withdrawTx = await walletClient.writeContract({
          address: vaultAddress as `0x${string}`,
          abi: YieldAllocatorVaultABI,
          functionName: "requestRedeem",
          args: [
            shares,
            userAddress as `0x${string}`,
            userAddress as `0x${string}`,
          ],
          chain: hyperliquid,
          account: userAddress as `0x${string}`,
          gas: (requestRedeemGas * 200n) / 100n,
        });

        setTransactionHash(withdrawTx);

        const receipt = await publicClient.waitForTransactionReceipt({
          hash: withdrawTx,
        });

  // Read RedeemRequest logs
        try {
          const redeemRequestEvent = parseAbiItem(
            "event RedeemRequest(address indexed controller, address indexed owner, uint256 indexed requestId, address sender, uint256 shares)"
          );

          const redeemLogs = await publicClient.getLogs({
            address: vaultAddress as `0x${string}`,
            event: redeemRequestEvent,
            args: { owner: userAddress as `0x${string}` },
            fromBlock: receipt.blockNumber,
            toBlock: receipt.blockNumber,
          });

          if (redeemLogs && redeemLogs.length > 0) {
            const latest = redeemLogs[redeemLogs.length - 1];
            const extractedRequestId = latest.args.requestId as bigint;
            const extractedController = latest.args.controller as `0x${string}`;

            if (extractedRequestId && extractedController) {
              setLastWithdrawRequestId(extractedRequestId);
              setLastWithdrawController(extractedController);

  // Query pending shares; convert to assets
              try {
                const pendingShares = (await publicClient.readContract({
                  address: vaultAddress as `0x${string}`,
                  abi: YieldAllocatorVaultABI,
                  functionName: "pendingRedeemRequest",
                  args: [extractedRequestId, extractedController],
                })) as bigint;

                let pendingAssetsFormatted = 0;
                if (pendingShares && pendingShares > 0n) {
                  const pendingAssets = (await publicClient.readContract({
                    address: vaultAddress as `0x${string}`,
                    abi: YieldAllocatorVaultABI,
                    functionName: "convertToAssets",
                    args: [pendingShares],
                  })) as bigint;
                  pendingAssetsFormatted = Number(
                    formatUnits(pendingAssets, Number(assetDecimals as number))
                  );
                }
                setLastWithdrawPendingAssets(pendingAssetsFormatted);
              } catch (e) {
                console.warn(
                  "Failed to read pendingRedeemRequest for last request",
                  e
                );
                setLastWithdrawPendingAssets(null);
              }
            }
          } else {
  // No matching logs
            toast({
              variant: "default",
              title: "Withdrawal Request Submitted",
              description:
                "Unable to locate requestId in logs for this transaction. Pending status may appear after refresh.",
            });
          }
        } catch (e) {
          console.warn("Failed to query RedeemRequest logs", e);
        }

        toast({
          variant: "success",
          title: "✅ Withdrawal Request Submitted",
          description: `Successfully requested withdrawal of ${amount} ${vaultType}. You can claim your withdrawal once it's processed.`,
        });

        await refreshAllData();

        return withdrawTx;
      } catch (error) {
        console.error("Withdrawal failed:", error);

        toast({
          variant: "destructive",
          title: "❌ Withdrawal Failed",
          description:
            error instanceof Error
              ? error.message
              : "An unexpected error occurred during withdrawal.",
        });

        throw error;
      } finally {
        setIsWithdrawTransacting(false);
      }
    },
    [getWalletClient, userAddress, refreshAllData]
  );

  // Post-claim cleanup
  const claimDeposit = useCallback(
    async (vaultAddress: string) => {
      const walletClient = await getWalletClient();
      if (!walletClient || !userAddress) {
        throw new Error("Wallet not connected");
      }
      try {
        const chainSwitched = await switchToChain();
        if (!chainSwitched) {
          throw new Error("Failed to switch to Hyper EVM chain");
        }
        setIsTransacting(true);
        setTransactionHash(null);

        const maxAssets = (await publicClient.readContract({
          address: vaultAddress as `0x${string}`,
          abi: YieldAllocatorVaultABI,
          functionName: "maxDeposit",
          args: [userAddress as `0x${string}`],
        })) as bigint;

        if (maxAssets === 0n) {
          toast({
            variant: "default",
            title: "No Claimable Shares",
            description: "There are no deposit shares to claim right now.",
          });
          return null;
        }

        const gas = await publicClient.estimateContractGas({
          address: vaultAddress as `0x${string}`,
          abi: YieldAllocatorVaultABI,
          functionName: "deposit",
          args: [maxAssets, userAddress as `0x${string}`],
          account: userAddress as `0x${string}`,
        });

        const tx = await walletClient.writeContract({
          address: vaultAddress as `0x${string}`,
          abi: YieldAllocatorVaultABI,
          functionName: "deposit",
          args: [maxAssets, userAddress as `0x${string}`],
          chain: hyperliquid,
          account: userAddress as `0x${string}`,
          gas: (gas * 200n) / 100n,
        });
        setTransactionHash(tx);
        await publicClient.waitForTransactionReceipt({ hash: tx });

        toast({
          variant: "success",
          title: "✅ Shares Claimed",
          description: "Successfully claimed settled deposit shares.",
        });
        setLastDepositRequestId(null);
        await refreshAllData();
        return tx;
      } catch (error) {
        console.error("Claim deposit failed:", error);
        toast({
          variant: "destructive",
          title: "❌ Claim Deposit Failed",
          description:
            error instanceof Error
              ? error.message
              : "Unexpected error occurred.",
        });
        throw error;
      } finally {
        setIsTransacting(false);
      }
    },
    [getWalletClient, userAddress, refreshAllData]
  );

  const claimRedeem = useCallback(
    async (vaultAddress: string) => {
      const walletClient = await getWalletClient();
      if (!walletClient || !userAddress) {
        throw new Error("Wallet not connected");
      }
      try {
        const chainSwitched = await switchToChain();
        if (!chainSwitched) {
          throw new Error("Failed to switch to Hyper EVM chain");
        }
        setIsTransacting(true);
        setTransactionHash(null);

        const maxShares = (await publicClient.readContract({
          address: vaultAddress as `0x${string}`,
          abi: YieldAllocatorVaultABI,
          functionName: "maxRedeem",
          args: [userAddress as `0x${string}`],
        })) as bigint;

        if (maxShares === 0n) {
          toast({
            variant: "default",
            title: "No Claimable Assets",
            description: "There are no withdrawal assets to claim right now.",
          });
          return null;
        }

        const gas = await publicClient.estimateContractGas({
          address: vaultAddress as `0x${string}`,
          abi: YieldAllocatorVaultABI,
          functionName: "redeem",
          args: [
            maxShares,
            userAddress as `0x${string}`,
            userAddress as `0x${string}`,
          ],
          account: userAddress as `0x${string}`,
        });

        const tx = await walletClient.writeContract({
          address: vaultAddress as `0x${string}`,
          abi: YieldAllocatorVaultABI,
          functionName: "redeem",
          args: [
            maxShares,
            userAddress as `0x${string}`,
            userAddress as `0x${string}`,
          ],
          chain: hyperliquid,
          account: userAddress as `0x${string}`,
          gas: (gas * 200n) / 100n,
        });
        setTransactionHash(tx);
        await publicClient.waitForTransactionReceipt({ hash: tx });

        toast({
          variant: "success",
          title: "✅ Assets Claimed",
          description: "Successfully claimed settled withdrawal assets.",
        });
        setLastWithdrawRequestId(null);
        setLastWithdrawController(null);
        setLastWithdrawPendingAssets(null);
        await refreshAllData();
        return tx;
      } catch (error) {
        console.error("Claim redeem failed:", error);
        toast({
          variant: "destructive",
          title: "❌ Claim Withdraw Failed",
          description:
            error instanceof Error
              ? error.message
              : "Unexpected error occurred.",
        });
        throw error;
      } finally {
        setIsTransacting(false);
      }
    },
    [getWalletClient, userAddress, refreshAllData]
  );

  // Individual vault hook
  const usdcVault = useMemo(
    () => ({
      ...vaultData.USDC,
      refreshData: refreshAllData,
      deposit: (amount: string) =>
        deposit(VAULTS.USDC.yieldAllocatorVaultAddress, amount, "USDC"),
      withdraw: (amount: string) =>
        withdraw(VAULTS.USDC.yieldAllocatorVaultAddress, amount, "USDC"),
      claimDeposit: () => claimDeposit(VAULTS.USDC.yieldAllocatorVaultAddress),
      claimRedeem: () => claimRedeem(VAULTS.USDC.yieldAllocatorVaultAddress),
      getClaimableDepositAmount: () =>
        getClaimableDepositAmount(VAULTS.USDC.yieldAllocatorVaultAddress),
      getClaimableRedeemAmount: () =>
        getClaimableRedeemAmount(VAULTS.USDC.yieldAllocatorVaultAddress),
      isDepositTransacting,
      isWithdrawTransacting,
      transactionHash,
      // Last deposit tracking
      lastDepositRequestId,
      lastDepositController,
      lastDepositPendingAssets,
      // Last withdraw tracking
      lastWithdrawRequestId,
      lastWithdrawController,
      lastWithdrawPendingAssets,
    }),
    [
      vaultData.USDC,
      refreshAllData,
      deposit,
      withdraw,
      claimDeposit,
      claimRedeem,
      getClaimableDepositAmount,
      getClaimableRedeemAmount,
      isDepositTransacting,
      isWithdrawTransacting,
      transactionHash,
      lastDepositRequestId,
      lastDepositController,
      lastDepositPendingAssets,
      lastWithdrawRequestId,
      lastWithdrawController,
      lastWithdrawPendingAssets,
    ]
  );


  return {
    vaultData,
    isLoading,
    error,
    refreshAllData,
    getVaultByType,
    getAllVaults,
    getTotalTVL,
    getTotalUserDeposits,
    // Transaction functions
    deposit,
    withdraw,
    claimDeposit,
    claimRedeem,
    getClaimableDepositAmount,
    getClaimableRedeemAmount,
    // Transaction state
    isTransacting,
    isDepositTransacting,
    isWithdrawTransacting,
    transactionHash,
    // Individual vault access
    usdcVault,
  };
};