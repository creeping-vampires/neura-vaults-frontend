import { useCallback, useMemo, useEffect, useState } from 'react';
import { usePublicClient, useWalletClient } from 'wagmi';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { parseUnits, formatUnits, parseAbi, maxUint256 } from 'viem';
import { hyperliquid, publicClient } from '@/lib/privyConfig';
import { VAULTS, VaultType, VAULT_TYPES } from '@/utils/constant';
import { getMultiVaultBatchClient, calculateVaultMetrics } from '@/utils/multiVaultBatch';
import { VaultData, VaultMetrics } from '@/types/vault';
import YieldAllocatorVaultABI from '@/utils/abis/YieldAllocatorVault.json';
import { toast } from '@/hooks/use-toast';
import { switchToChain } from '@/lib/utils';
import { useActiveWallet } from '@/hooks/useActiveWallet';

// Multi-vault cache to prevent unnecessary re-fetching
let multiVaultCache: { data: Record<VaultType, VaultData>; timestamp: number } | null = null;

export const useMultiVault = () => {
  const publicClient = usePublicClient();
  const { data: wagmiWalletClient } = useWalletClient();
  const { wallets } = useWallets();

  // Get cached data if available and not expired (5 minutes)
  const cachedData = useMemo(() => {
    if (multiVaultCache) {
      const isExpired = Date.now() - multiVaultCache.timestamp > 5 * 60 * 1000; // 5 minutes
      if (!isExpired) {
        return multiVaultCache.data;
      }
    }

    // Fallback to localStorage for persistence across sessions
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

  // Initialize vault data with cached data or default empty state
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
        pendingWithdrawersCount: 0,
        isLoading: cachedData ? false : true,
        error: null,
        poolNetAPRs: [],
        poolTVLs: [],
        poolAddresses: [],
        hasPendingDeposit: false,
        hasPendingWithdrawal: false,
      };
    });
    return defaultData;
  }, [cachedData]);

  const [vaultData, setVaultData] =
    useState<Record<VaultType, VaultData>>(initialVaultData);
  const [isLoading, setIsLoading] = useState<boolean>(() => {
    // If we have cached data, don't show loading initially
    return cachedData ? false : true;
  });
  const [error, setError] = useState<string | null>(null);

  // Transaction state management
  const [isTransacting, setIsTransacting] = useState(false);
  const [isDepositTransacting, setIsDepositTransacting] = useState(false);
  const [isWithdrawTransacting, setIsWithdrawTransacting] = useState(false);
  const [transactionHash, setTransactionHash] = useState<string | null>(null);

  const { wallet, userAddress, hasEmailLogin, hasWalletLogin, isPrivyWallet } = useActiveWallet();

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

      // Convert raw data to VaultData format
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
          pendingWithdrawersCount: metrics.pendingWithdrawersCount,
          isLoading: false,
          error: null,
          poolNetAPRs: rawData.poolNetAPRs || [],
          poolTVLs: rawData.poolTVLs || [],
          poolAddresses: rawData.poolAddresses || [],
          hasPendingDeposit:
            (userDataForVault as any)?.hasPendingDeposit || false,
          hasPendingWithdrawal:
            (userDataForVault as any)?.hasPendingWithdrawal || false,
        };
      });

      setVaultData(processedVaultData);

      // Update memory cache
      multiVaultCache = { data: processedVaultData, timestamp: Date.now() };

      // Cache the data in localStorage for persistence across sessions
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
          pendingWithdrawersCount: 0,
          isLoading: false,
          error: errorMessage,
          poolNetAPRs: [],
          poolTVLs: [],
          poolAddresses: [],
          hasPendingDeposit: false,
          hasPendingWithdrawal: false,
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
      // Get total AUM in USD from all vaults using totalAumUsd function
      const totalAumPromises = VAULT_TYPES.map(async (vaultType) => {
        const vaultAddress = VAULTS[vaultType].yieldAllocatorVaultAddress;
        try {
          const totalAumUsd = await publicClient.readContract({
            address: vaultAddress as `0x${string}`,
            abi: YieldAllocatorVaultABI,
            functionName: "totalAumUsd",
            args: [BigInt(3600)],
          });

          // Convert from 1e18 to regular number
          return Number(formatUnits(totalAumUsd as bigint, 18));
        } catch (error) {
          console.warn(`Failed to get totalAumUsd for ${vaultType}:`, error);
          // Fallback to individual vault TVL if totalAumUsd fails
          return vaultData[vaultType]?.tvl || 0;
        }
      });

      const totalAumValues = await Promise.all(totalAumPromises);
      return totalAumValues.reduce((total, aum) => total + aum, 0);
    } catch (error) {
      console.error("Error getting total TVL from totalAumUsd:", error);
      // Fallback to original calculation if everything fails
      return Object.values(vaultData).reduce((total, vault) => {
        return total + (vault?.tvl || 0);
      }, 0);
    }
  }, [vaultData, publicClient]);

  const getTotalUserDeposits = useCallback(() => {
    return Object.values(vaultData).reduce((total, vault) => {
      return total + (vault?.userDeposits || 0);
    }, 0);
  }, [vaultData]);

  const getAverageAPR = useCallback(async () => {
    const vaults = Object.values(vaultData).filter((vault) => vault?.tvl > 0);
    if (vaults.length === 0) return 0;

    const totalWeightedAPR = vaults.reduce((sum, vault) => {
      const tvl = vault?.tvl || 0;
      const apr = vault?.currentNetAPR || 0;
      return sum + apr * tvl;
    }, 0);

    const totalTVL = await getTotalTVL();
    return totalTVL > 0 ? totalWeightedAPR / totalTVL : 0;
  }, [vaultData, getTotalTVL]);

  // Helper function to get wallet client
  const getWalletClient = useCallback(async () => {
    if (wagmiWalletClient) {
      return wagmiWalletClient;
    }

    // Fallback to privy wallet if wagmi client not available
    const privyWallet = isPrivyWallet ? wallet : wallets.find((w) => w.walletClientType === "privy");
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

        // Validate vault interface before proceeding
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

        // Use requestDeposit for ERC-7540 async deposits
        const depositGas = await publicClient.estimateContractGas({
          address: vaultAddress as `0x${string}`,
          abi: YieldAllocatorVaultABI,
          functionName: "requestDeposit",
          args: [amountBigInt, userAddress as `0x${string}`],
          account: userAddress as `0x${string}`,
        });

        const depositTx = await walletClient.writeContract({
          address: vaultAddress as `0x${string}`,
          abi: YieldAllocatorVaultABI,
          functionName: "requestDeposit",
          args: [amountBigInt, userAddress as `0x${string}`],
          chain: hyperliquid,
          account: userAddress as `0x${string}`,
          gas: (depositGas * 200n) / 100n,
        });

        setTransactionHash(depositTx);

        await publicClient.waitForTransactionReceipt({ hash: depositTx });

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

        // Validate vault interface before proceeding
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

        // Get user's current share balance
        const userShares = await publicClient.readContract({
          address: vaultAddress as `0x${string}`,
          abi: YieldAllocatorVaultABI,
          functionName: "balanceOf",
          args: [userAddress as `0x${string}`],
        });

        // Get user's current asset balance (deposits)
        const userAssets = await publicClient.readContract({
          address: vaultAddress as `0x${string}`,
          abi: YieldAllocatorVaultABI,
          functionName: "convertToAssets",
          args: [userShares],
        });

        console.log("userShares", userShares);
        console.log("userAssets", userAssets);

        // For 100% withdrawals (or very close to it), use actual user shares to avoid precision issues
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

        await publicClient.waitForTransactionReceipt({ hash: withdrawTx });

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

  const withdrawPendingDeposit = useCallback(
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

        const withdrawTx = await walletClient.writeContract({
          address: vaultAddress as `0x${string}`,
          abi: YieldAllocatorVaultABI,
          functionName: "withdrawPendingDeposit",
          args: [userAddress as `0x${string}`],
          chain: hyperliquid,
          account: userAddress as `0x${string}`,
        });

        setTransactionHash(withdrawTx);

        await publicClient.waitForTransactionReceipt({ hash: withdrawTx });

        toast({
          variant: "success",
          title: "✅ Pending Deposit Withdrawn",
          description: "Successfully withdrew your pending deposit.",
        });

        await refreshAllData();

        return withdrawTx;
      } catch (error) {
        console.error("Withdraw pending deposit failed:", error);

        toast({
          variant: "destructive",
          title: "❌ Withdraw Pending Deposit Failed",
          description:
            error instanceof Error
              ? error.message
              : "An unexpected error occurred.",
        });

        throw error;
      } finally {
        setIsTransacting(false);
      }
    },
    [getWalletClient, userAddress, refreshAllData]
  );

  // Check withdrawal request function
  const checkWithdrawalRequest = useCallback(
    async (vaultAddress: string) => {
      if (!userAddress) return null;

      try {
        const withdrawalRequest = await publicClient.readContract({
          address: vaultAddress as `0x${string}`,
          abi: YieldAllocatorVaultABI,
          functionName: "withdrawalRequests",
          args: [userAddress as `0x${string}`],
        });

        return withdrawalRequest;
      } catch (error) {
        console.error("Error checking withdrawal request:", error);
        return null;
      }
    },
    [userAddress]
  );

  // Create individual vault hooks for backward compatibility
  const usdeVault = useMemo(
    () => ({
      ...vaultData.USDE,
      refreshData: refreshAllData,
      deposit: (amount: string) =>
        deposit(VAULTS.USDE.yieldAllocatorVaultAddress, amount, "USDE"),
      withdraw: (amount: string) =>
        withdraw(VAULTS.USDE.yieldAllocatorVaultAddress, amount, "USDE"),
      withdrawPendingDeposit: () =>
        withdrawPendingDeposit(VAULTS.USDE.yieldAllocatorVaultAddress),
      checkWithdrawalRequest: () =>
        checkWithdrawalRequest(VAULTS.USDE.yieldAllocatorVaultAddress),
      isDepositTransacting,
      isWithdrawTransacting,
      transactionHash,
    }),
    [
      vaultData.USDE,
      refreshAllData,
      deposit,
      withdraw,
      withdrawPendingDeposit,
      checkWithdrawalRequest,
      isDepositTransacting,
      isWithdrawTransacting,
      transactionHash,
    ]
  );

  // const usdt0Vault = useMemo(
  //   () => ({
  //     ...vaultData.USDT0,
  //     refreshData: refreshAllData,
  //     deposit: (amount: string) => deposit(VAULTS.USDT0.yieldAllocatorVaultAddress, amount, "USDT0"),
  //     withdraw: (amount: string) => withdraw(VAULTS.USDT0.yieldAllocatorVaultAddress, amount, "USDT0"),
  //     withdrawPendingDeposit: () => withdrawPendingDeposit(VAULTS.USDT0.yieldAllocatorVaultAddress),
  //     checkWithdrawalRequest: () => checkWithdrawalRequest(VAULTS.USDT0.yieldAllocatorVaultAddress),
  //     isDepositTransacting,
  //     isWithdrawTransacting,
  //     transactionHash,
  //   }),
  //   [
  //     vaultData.USDT0,
  //     refreshAllData, deposit, withdraw, withdrawPendingDeposit, checkWithdrawalRequest, isDepositTransacting, isWithdrawTransacting, transactionHash]
  // );

  return {
    vaultData,
    isLoading,
    error,
    refreshAllData,
    getVaultByType,
    getAllVaults,
    getTotalTVL,
    getTotalUserDeposits,
    getAverageAPR,
    // Transaction functions
    deposit,
    withdraw,
    withdrawPendingDeposit,
    checkWithdrawalRequest,
    // Transaction state
    isTransacting,
    isDepositTransacting,
    isWithdrawTransacting,
    transactionHash,
    // Individual vault access for backward compatibility
    usdeVault,
    // usdt0Vault,
  };
};