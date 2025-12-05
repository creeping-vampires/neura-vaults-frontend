import { useCallback, useMemo, useEffect, useState } from "react";
import {
  usePublicClient,
  useReconnect,
  useWalletClient,
  useAccount,
} from "wagmi";
import { parseUnits, formatUnits, parseAbi, parseAbiItem, Address } from "viem";
import { usePrice } from "@/hooks/usePrice";
import {
  getMultiVaultBatchClient,
  calculateVaultMetrics,
} from "@/utils/multiVaultBatch";
import { VaultData } from "@/types/vault";
import YieldAllocatorVaultABI from "@/utils/abis/YieldAllocatorVault.json";
import { toast } from "@/hooks/use-toast";
import { switchToChain } from "@/lib/utils";
import { hyperliquid } from "@/lib/privyConfig";

// Multi-vault cache to prevent unnecessary re-fetching
let multiVaultCache: {
  data: Record<string, VaultData>;
  timestamp: number;
} | null = null;

const serializeBigInt = (key: string, value: any) => {
  if (typeof value === "bigint") {
    return value.toString();
  }
  return value;
};

const deserializeBigInt = (key: string, value: any) => {
  if (key === "pendingDepositAssets" && typeof value === "string") {
    return BigInt(value);
  }
  return value;
};

export const useMultiVault = () => {
  const publicClient = usePublicClient();
  const { data: wagmiWalletClient } = useWalletClient();
  const { allVaultData } = usePrice();

  const [pendingDepositAssets, setPendingDepositAssets] = useState<bigint>(0n);
  const [pendingRedeemShares, setPendingRedeemShares] = useState<bigint>(0n);
  const [depositEventStatus, setDepositEventStatus] = useState("idle");
  const [withdrawEventStatus, setWithdrawEventStatus] = useState("idle");

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
        const parsed = JSON.parse(cached, deserializeBigInt);
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

  // Initialize vault data from cache or empty
  const initialVaultData: Record<string, VaultData> = useMemo(() => {
    if (cachedData) {
      return cachedData;
    }
    return {};
  }, [cachedData]);

  const [vaultData, setVaultData] =
    useState<Record<string, VaultData>>(initialVaultData);
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

  const { address: userAddress } = useAccount();

  const fetchAllVaultData = useCallback(
    async (silentRefresh = false) => {
      if (!publicClient) return;
      if (!allVaultData || allVaultData.length === 0) {
        // wait for price hook to load vaults
        return;
      }

      // Only show loading indicators for non-silent refreshes
      if (!silentRefresh) {
        setIsLoading(true);
        setError(null);
      }

      try {
        const multiVaultClient = getMultiVaultBatchClient(publicClient);
        const { vaultData: rawVaultData, userData } =
          await multiVaultClient.refreshAllData(
            allVaultData,
            (userAddress as `0x${string}`) || undefined
          );

        // Convert to VaultData keyed by address
        const processedVaultData: Record<string, VaultData> = {} as any;

        // Calculate totals from batch data
        let totalPendingDeposit = 0n;
        let totalPendingRedeem = 0n;

        if (userData) {
          Object.values(userData).forEach((u: any) => {
            totalPendingDeposit += u.pendingDepositAssets || 0n;
            totalPendingRedeem += u.pendingRedeemShares || 0n;
          });
        }

        setPendingDepositAssets(totalPendingDeposit);
        setPendingRedeemShares(totalPendingRedeem);

        Object.entries(rawVaultData).forEach(([address, rawData]) => {
          const apiItem = (allVaultData || []).find(
            (v: any) => v.address?.toLowerCase() === address?.toLowerCase()
          );
          // console.log("apiItem", apiItem);
          // console.log("rawData", rawData);
          const userDataForVault = (userData as any)[address];
          // console.log("userDataForVault", userDataForVault);
          const metrics = calculateVaultMetrics(rawData, userDataForVault);
          processedVaultData[address] = {
            totalAssets: metrics.totalAssets,
            totalSupply: metrics.totalSupply,
            currentNetAPR: metrics.currentNetAPR,
            tvl: metrics.tvl,
            userDeposits: (metrics as any).userDeposits || 0,
            userShares: (metrics as any).userShares || 0,
            compoundedYield: (metrics as any).compoundedYield || 0,
            assetBalance: (metrics as any).assetBalance || 0,
            pricePerShare: (metrics as any).pricePerShare || 1,
            assetAddress: (rawData as any).assetAddress,
            assetDecimals: (apiItem as any)?.underlyingDecimals,
            assetSymbol: (apiItem as any)?.underlyingSymbol,
            vaultDecimals: (rawData as any).vaultDecimals,
            totalRequestedAssets: metrics.totalRequestedAssets,
            pendingDepositAssets: userDataForVault?.pendingDepositAssets || 0n,
            isLoading: false,
            error: null,
            poolNetAPRs: (rawData as any).poolNetAPRs || [],
            poolTVLs: (rawData as any).poolTVLs || [],
          };
        });

        setVaultData(processedVaultData);

        // Update memory cache
        multiVaultCache = { data: processedVaultData, timestamp: Date.now() };

        // Persist to localStorag
        try {
          localStorage.setItem(
            "multiVaultData",
            JSON.stringify(
              {
                data: processedVaultData,
                timestamp: Date.now(),
              },
              serializeBigInt
            )
          );
        } catch (error) {
          console.error("Failed to cache multi-vault data:", error);
        }

        // Schedule silent refresh after successful data fetch (only for non-silent calls)
        if (!silentRefresh && publicClient && allVaultData?.length > 0) {
          const lastSilentRefresh = multiVaultCache?.timestamp || 0;
          const timeSinceLastRefresh = Date.now() - lastSilentRefresh;
          const minRefreshInterval = 30000; // 30 seconds minimum between silent refreshes

          if (timeSinceLastRefresh >= minRefreshInterval) {
            setTimeout(() => {
              if (publicClient && allVaultData?.length > 0) {
                fetchAllVaultData(true).catch((error) => {
                  console.debug("Silent refresh failed:", error);
                });
              }
            }, 5000);
          }
        }
      } catch (error) {
        console.error("Error fetching multi-vault data:", error);
        const errorMessage =
          error instanceof Error ? error.message : "Failed to fetch vault data";

        if (!silentRefresh) {
          setError(errorMessage);

          // Set uniform error state for all known vaults
          const errorVaultData: Record<string, VaultData> = {} as any;
          (allVaultData || []).forEach((v: any) => {
            errorVaultData[v.address] = {
              totalAssets: 0,
              totalSupply: 0,
              currentNetAPR: 0,
              tvl: 0,
              userDeposits: 0,
              userShares: 0,
              compoundedYield: 0,
              assetBalance: 0,
              pricePerShare: 1,
              assetAddress: "0x",
              assetDecimals: 18,
              assetSymbol: "",
              vaultDecimals: 18,
              totalRequestedAssets: 0,
              pendingDepositAssets: 0n,
              isLoading: false,
              error: errorMessage,
              poolNetAPRs: [],
              poolTVLs: [],
            };
          });
          setVaultData(errorVaultData);
        }
      } finally {
        // Only update loading state for non-silent refreshes
        if (!silentRefresh) {
          setIsLoading(false);
        }
      }
    },
    [publicClient, userAddress, allVaultData]
  );

  const refreshAllData = useCallback(() => {
    fetchAllVaultData();
  }, [fetchAllVaultData]);

  useEffect(() => {
    fetchAllVaultData();
  }, [fetchAllVaultData]);

  const getVaultByAddress = useCallback(
    (address: string) => {
      return vaultData[address];
    },
    [vaultData]
  );

  const getAllVaults = useCallback(() => {
    return (allVaultData || []).map((v: any) => ({
      address: v.address,
      symbol: v.underlyingSymbol,
      name: v.name,
      data: vaultData[v.address],
    }));
  }, [vaultData, allVaultData]);

  const getTotalTVL = useCallback(async () => {
    // Sum across computed tvl in state
    return Object.values(vaultData).reduce((sum, v) => sum + (v?.tvl || 0), 0);
  }, [vaultData]);

  const getTotalUserDeposits = useCallback(() => {
    return Object.values(vaultData).reduce((total, v) => {
      return total + (v?.userDeposits || 0);
    }, 0);
  }, [vaultData]);

  const vaultAddresses = useMemo(() => {
    return (allVaultData || [])
      .map((v: any) => v.address)
      .sort()
      .join(",");
  }, [allVaultData]);

  useEffect(() => {
    if (
      !publicClient ||
      !userAddress ||
      !allVaultData ||
      allVaultData.length === 0
    )
      return;

    const unsubscribers: (() => void)[] = [];

    try {
      (allVaultData || []).forEach((v: any) => {
        const address = v.address as `0x${string}`;

        // Settlement: deposits finalized; update pending deposit tracking only
        const unwatchSettleDeposit = publicClient.watchContractEvent({
          address,
          abi: YieldAllocatorVaultABI as any,
          eventName: "SettleDeposit",
          onLogs: (logs) => {},
        });
        // Completion: on-chain balance changes and positions updates
        const unwatchDeposit = publicClient.watchContractEvent({
          address,
          abi: YieldAllocatorVaultABI as any,
          eventName: "Deposit",
          onLogs: (logs) => {
            if (!logs || logs.length === 0) return;

            const owners = logs
              .map((l) => (l as any)?.args?.owner as Address | undefined)
              .filter(Boolean) as Address[];

            // Normalize addresses for comparison
            const normalizedUserAddress = userAddress.toLowerCase();
            const hasMatchingOwner = owners.some(
              (owner) => owner.toLowerCase() === normalizedUserAddress
            );

            if (hasMatchingOwner) {
              console.log(`[MultiVault] Deposit event detected for ${address}`);
              setPendingDepositAssets(0n);
              fetchAllVaultData(true);
              setDepositEventStatus("settled");
              // toast({
              //   variant: "success",
              //   title: "📦 Deposits Settled",
              //   description:
              //     "New shares will be deposited shortly. Refreshing data...",
              // });
            }
          },
        });

        // Settlement: mark redemptions as available; avoid full refresh to minimize re-renders
        const unwatchSettleRedeem = publicClient.watchContractEvent({
          address,
          abi: YieldAllocatorVaultABI as any,
          eventName: "SettleRedeem",
          onLogs: (logs) => {},
        });

        // Completion: withdrawals applied to vault balances
        const unwatchWithdraw = publicClient.watchContractEvent({
          address,
          abi: YieldAllocatorVaultABI as any,
          eventName: "Withdraw",
          onLogs: (logs) => {
            if (!logs || logs.length === 0) return;
            const owners = logs
              .map((l) => (l as any)?.args?.owner as Address | undefined)
              .filter(Boolean) as Address[];

            // Normalize addresses for comparison
            const normalizedUserAddress = userAddress.toLowerCase();
            const hasMatchingOwner = owners.some(
              (owner) => owner.toLowerCase() === normalizedUserAddress
            );

            if (hasMatchingOwner) {
              console.log(
                `[MultiVault] Withdraw event detected for ${address}`
              );
              fetchAllVaultData(true).then(() => {
                setPendingRedeemShares(0n);
                setWithdrawEventStatus("settled");
              });
              // toast({
              //   variant: "success",
              //   title: "💸 Withdrawals Settled",
              //   description: "Assets may be claimable. Refreshing data...",
              // });
            }
          },
        });

        unsubscribers.push(() => {
          try {
            unwatchSettleDeposit();
          } catch {}
          try {
            unwatchDeposit();
          } catch {}
          try {
            unwatchSettleRedeem();
          } catch {}
          try {
            unwatchWithdraw();
          } catch {}
        });
      });
    } catch (e) {
      console.error("Failed to watch settlement events", e);
    }

    return () => {
      unsubscribers.forEach((unsub) => unsub());
    };
  }, [publicClient, userAddress, refreshAllData, vaultAddresses]);

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
        const decimals =
          (vaultData[vaultAddress]?.assetDecimals as number) ?? 6;
        return Number(formatUnits(max, Number(decimals)));
      } catch (e) {
        console.log("error", e);
      }
    },
    [publicClient, userAddress, vaultData]
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
        const decimals =
          (vaultData[vaultAddress]?.assetDecimals as number) ?? 6;
        return Number(formatUnits(assets, Number(decimals)));
      } catch (e) {
        console.log("error", e);
      }
    },
    [publicClient, userAddress, vaultData]
  );

  // Wallet client helper
  const getWalletClient = useCallback(async () => {
    // 1) Prefer wagmi wallet client
    if (wagmiWalletClient) {
      return wagmiWalletClient;
    }

    // 2) Prefer a native browser wallet extension via window.ethereum (Rabby Wallet extension)
    try {
      const eth: any =
        (typeof window !== "undefined" && (window as any).ethereum) || null;
      if (eth) {
        const { createWalletClient, custom } = await import("viem");
        return createWalletClient({
          chain: hyperliquid,
          transport: custom(eth),
        });
      }
    } catch (e) {
      // Ignore and try next fallback
    }

    throw new Error("No wallet client available");
  }, [wagmiWalletClient]);

  // Transaction functions
  const deposit = useCallback(
    async (vaultAddress: string, amount: string) => {
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
        setDepositEventStatus("submitted");
        setTransactionHash(null);

        const assetSymbol = vaultData[vaultAddress]?.assetSymbol;
        let assetAddress: `0x${string}` = vaultData[vaultAddress]?.assetAddress;
        let assetDecimals: number | undefined =
          vaultData[vaultAddress]?.assetDecimals;
        const amountBigInt = parseUnits(amount, Number(assetDecimals));

        const currentAllowance = await publicClient.readContract({
          address: assetAddress as `0x${string}`,
          abi: parseAbi([
            "function allowance(address, address) view returns (uint256)",
          ]),
          functionName: "allowance",
          args: [userAddress as `0x${string}`, vaultAddress as `0x${string}`],
        });

        if ((currentAllowance as bigint) < amountBigInt) {
          console.log(
            `Requesting approval for exact amount: ${amountBigInt.toString()}`
          );

          const approveGas = await publicClient.estimateContractGas({
            address: assetAddress as `0x${string}`,
            abi: parseAbi([
              "function approve(address, uint256) returns (bool)",
            ]),
            functionName: "approve",
            args: [vaultAddress as `0x${string}`, amountBigInt],
            account: userAddress as `0x${string}`,
          });

          const approveTx = await walletClient.writeContract({
            address: assetAddress as `0x${string}`,
            abi: parseAbi([
              "function approve(address, uint256) returns (bool)",
            ]),
            functionName: "approve",
            args: [vaultAddress as `0x${string}`, amountBigInt],
            chain: hyperliquid,
            account: userAddress as `0x${string}`,
            gas: (approveGas * 200n) / 100n,
          });

          const approveReceipt = await publicClient.waitForTransactionReceipt({
            hash: approveTx,
          });

          if (approveReceipt.status !== "success") {
            throw new Error("Token approval transaction failed on-chain");
          }

          // Verify the approval matches the requested amount
          const verifiedAllowance = await publicClient.readContract({
            address: assetAddress as `0x${string}`,
            abi: parseAbi([
              "function allowance(address, address) view returns (uint256)",
            ]),
            functionName: "allowance",
            args: [userAddress as `0x${string}`, vaultAddress as `0x${string}`],
          });

          if ((verifiedAllowance as bigint) < amountBigInt) {
            throw new Error(
              "Approval verification failed: Insufficient allowance after approval"
            );
          }
        }

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
              // Query pending assets and update state
              try {
                const pendingAssets = (await publicClient.readContract({
                  address: vaultAddress as `0x${string}`,
                  abi: YieldAllocatorVaultABI,
                  functionName: "pendingDepositRequest",
                  args: [extractedRequestId, extractedController],
                })) as bigint;

                setPendingDepositAssets(pendingAssets);
              } catch (e) {
                console.warn(
                  "Failed to read pendingDepositRequest for last request",
                  e
                );
                setPendingDepositAssets(0n);
              }
            }
          }
        } catch (e) {
          console.warn("Failed to query DepositRequest logs", e);
        }

        // toast({
        //   variant: "success",
        //   title: "✅ Deposit Request Submitted",
        //   description: `Successfully requested deposit of ${amount} ${assetSymbol}. Your deposit will be processed in the next settlement.`,
        // });

        await refreshAllData();

        return depositTx;
      } catch (error) {
        console.error("Deposit failed:", error);
        setDepositEventStatus("failed");

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
    [
      getWalletClient,
      userAddress,
      refreshAllData,
      publicClient,
      allVaultData,
      vaultData,
    ]
  );

  const withdraw = useCallback(
    async (vaultAddress: string, amount: string) => {
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
        setWithdrawEventStatus("submitted");
        setTransactionHash(null);

        const assetSymbol = vaultData[vaultAddress]?.assetSymbol;
        let assetDecimals: number | undefined =
          vaultData[vaultAddress]?.assetDecimals;
        const amountBigInt = parseUnits(amount, Number(assetDecimals));

        const shares = (await publicClient.readContract({
          address: vaultAddress as `0x${string}`,
          abi: YieldAllocatorVaultABI,
          functionName: "convertToShares",
          args: [amountBigInt],
        })) as bigint;

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

          // After successful withdrawal, check for pending redeem request
          try {
            const pendingShares = (await publicClient.readContract({
              address: vaultAddress as `0x${string}`,
              abi: YieldAllocatorVaultABI,
              functionName: "pendingRedeemRequest",
              args: [0n, userAddress], // requestId: 0, controller: userAddress
            })) as bigint;

            setPendingRedeemShares(pendingShares);
          } catch (e) {
            console.warn("Failed to check pendingRedeemRequest", e);
            setPendingRedeemShares(0n);
          }
        } catch (e) {
          console.warn("Failed to query RedeemRequest logs", e);
        }

        toast({
          variant: "success",
          title: "✅ Withdrawal Request Submitted",
          description: `Successfully requested withdrawal of ${amount} ${assetSymbol}. You can claim your withdrawal once it's processed.`,
        });

        await refreshAllData();

        return withdrawTx;
      } catch (error) {
        console.error("Withdrawal failed:", error);
        setWithdrawEventStatus("failed");

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
    [getWalletClient, userAddress, refreshAllData, publicClient, allVaultData]
  );

  // Allow user to cancel an active deposit request if contract permits
  const cancelDepositRequest = useCallback(
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

        const gas = await publicClient.estimateContractGas({
          address: vaultAddress as `0x${string}`,
          abi: YieldAllocatorVaultABI,
          functionName: "cancelRequestDeposit",
          account: userAddress as `0x${string}`,
        });

        const tx = await walletClient.writeContract({
          address: vaultAddress as `0x${string}`,
          abi: YieldAllocatorVaultABI,
          functionName: "cancelRequestDeposit",
          chain: hyperliquid,
          account: userAddress as `0x${string}`,
          gas: (gas * 200n) / 100n,
        });
        setTransactionHash(tx);
        await publicClient.waitForTransactionReceipt({ hash: tx });

        toast({
          variant: "success",
          title: "✅ Deposit Request Canceled",
          description: "Your pending deposit request has been canceled.",
        });

        // Refresh pending deposit state after cancel
        await refreshAllData();
        return tx;
      } catch (error: any) {
        const msg = error?.message || String(error);
        if (msg?.includes("RequestNotCancelable")) {
          toast({
            variant: "default",
            title: "Cannot Cancel",
            description:
              "This deposit request is no longer cancelable. It may be in processing.",
          });
        } else {
          toast({
            variant: "destructive",
            title: "❌ Cancel Failed",
            description: msg,
          });
        }
        throw error;
      } finally {
        setIsTransacting(false);
      }
    },
    [getWalletClient, userAddress, refreshAllData, publicClient]
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
        const receipt = await publicClient.waitForTransactionReceipt({
          hash: tx,
        });

        if (receipt.status === "success") {
          console.log("Claim redeem successful, setting status to settled");
          setWithdrawEventStatus("settled");
        }

        // toast({
        //   variant: "success",
        //   title: "✅ Assets Claimed",
        //   description: "Successfully claimed settled withdrawal assets.",
        // });

        // After claiming, check for any remaining pending redeem request
        try {
          const pendingShares = (await publicClient.readContract({
            address: vaultAddress as `0x${string}`,
            abi: YieldAllocatorVaultABI,
            functionName: "pendingRedeemRequest",
            args: [0n, userAddress], // requestId: 0, controller: userAddress
          })) as bigint;

          setPendingRedeemShares(pendingShares || 0n);
        } catch (e) {
          console.warn("Failed to check pendingRedeemRequest after claim", e);
          setPendingRedeemShares(0n);
        }

        await fetchAllVaultData(true);
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
    [getWalletClient, userAddress, refreshAllData, publicClient]
  );

  return {
    vaultData,
    isLoading,
    error,
    refreshAllData,
    getVaultByAddress,
    getAllVaults,
    getTotalTVL,
    getTotalUserDeposits,
    // Transaction functions
    deposit,
    withdraw,
    cancelDepositRequest,
    claimRedeem,
    getClaimableDepositAmount,
    getClaimableRedeemAmount,
    // Transaction state
    isTransacting,
    isDepositTransacting,
    isWithdrawTransacting,
    transactionHash,
    // Pending trxns tracking
    pendingDepositAssets,
    pendingRedeemShares,
    depositEventStatus,
    setDepositEventStatus,
    withdrawEventStatus,
    setWithdrawEventStatus,
  };
};
