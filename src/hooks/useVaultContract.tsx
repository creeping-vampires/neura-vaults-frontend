import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useMemo,
} from "react";
import {
  usePublicClient,
  useAccount,
  useWriteContract,
  useReadContracts,
} from "wagmi";
import {
  parseUnits,
  formatUnits,
  parseAbi,
  parseAbiItem,
  Address,
  erc20Abi,
} from "viem";
import { calculateVaultMetrics } from "@/utils/vaultMetrics";
import { VaultData } from "@/types/vault";
import YieldAllocatorVaultABI from "@/utils/abis/YieldAllocatorVault.json";
import { useToast, toast } from '@/hooks/use-toast';
import { switchToChain } from "@/lib/utils";
import { hyperliquid } from "@/lib/privyConfig";
import { useVaultApi } from "./useVaultApi";

export interface VaultContractContextType {
  vaultData: Record<string, VaultData>;
  isLoading: boolean;
  error: string | null;
  refreshAllData: (silentRefresh?: boolean) => Promise<void>;
  getVaultByAddress: (address: string) => VaultData | undefined;
  getAllVaults: () => {
    address: string;
    symbol: string;
    name: string;
    data: VaultData;
  }[];
  getTotalTVL: () => Promise<number>;
  getTotalUserDeposits: () => number;
  deposit: (vaultAddress: string, amount: string) => Promise<`0x${string}`>;
  withdraw: (vaultAddress: string, amount: string) => Promise<`0x${string}`>;
  cancelDepositRequest: (vaultAddress: string) => Promise<`0x${string}`>;
  claimRedeem: (vaultAddress: string) => Promise<`0x${string}` | null>;
  getClaimableDepositAmount: (vaultAddress: string) => Promise<number>;
  getClaimableRedeemAmount: (vaultAddress: string) => Promise<number>;
  isTransacting: boolean;
  isDepositTransacting: boolean;
  isWithdrawTransacting: boolean;
  transactionHash: string | null;
  pendingDepositAssets: bigint;
  pendingRedeemShares: bigint;
  depositEventStatus: string;
  setDepositEventStatus: (status: string) => void;
  withdrawEventStatus: string;
  setWithdrawEventStatus: (status: string) => void;
}

const VaultContractContext = createContext<
  VaultContractContextType | undefined
>(undefined);

export const VaultContractProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const {toast}=useToast()
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();
  const { allVaultData } = useVaultApi();

  const [pendingDepositAssets, setPendingDepositAssets] = useState<bigint>(0n);
  const [pendingRedeemShares, setPendingRedeemShares] = useState<bigint>(0n);
  const [depositEventStatus, setDepositEventStatus] = useState("idle");
  const [withdrawEventStatus, setWithdrawEventStatus] = useState("idle");

  const [vaultData, setVaultData] = useState<Record<string, VaultData>>({});
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Transaction state
  const [isTransacting, setIsTransacting] = useState(false);
  const [isDepositTransacting, setIsDepositTransacting] = useState(false);
  const [isWithdrawTransacting, setIsWithdrawTransacting] = useState(false);
  const [transactionHash, setTransactionHash] = useState<string | null>(null);

  const { address: userAddress } = useAccount();

  // 1. Prepare contracts for Vault Data
  const vaultContracts = useMemo(() => {
    if (!allVaultData || allVaultData.length === 0) return [];
    return allVaultData.flatMap((v: any) => [
      {
        address: v.address as `0x${string}`,
        abi: parseAbi(["function totalAssets() view returns (uint256)"]),
        functionName: "totalAssets",
      },
      {
        address: v.address as `0x${string}`,
        abi: parseAbi(["function totalSupply() view returns (uint256)"]),
        functionName: "totalSupply",
      },
      {
        address: v.address as `0x${string}`,
        abi: parseAbi(["function decimals() view returns (uint8)"]),
        functionName: "decimals",
      },
      {
        address: v.address as `0x${string}`,
        abi: parseAbi(["function asset() view returns (address)"]),
        functionName: "asset",
      },
    ]);
  }, [allVaultData]);

  // @ts-ignore
  const { data: vaultResults, isLoading: isVaultsLoading, refetch: refetchVaults } = useReadContracts({ contracts: vaultContracts as any, query: { enabled: !!vaultContracts.length, staleTime: 30_000, refetchInterval: 30_000, }, }) as any;

  // 2. Process Vault Data & Prepare User Data Contracts
  const { processedVaults, userContracts } = useMemo(() => {
    if (!vaultResults || !allVaultData)
      return { processedVaults: {}, userContracts: [] };

    const processed: Record<string, any> = {};
    const userCalls: any[] = [];

    allVaultData.forEach((v: any, i: number) => {
      const base = i * 4;
      const totalAssets = vaultResults[base]?.result as bigint;
      const totalSupply = vaultResults[base + 1]?.result as bigint;
      const vaultDecimals = vaultResults[base + 2]?.result as number;
      const assetAddress = vaultResults[base + 3]?.result as `0x${string}`;

      if (totalAssets === undefined || !assetAddress) return;

      processed[v.address] = {
        symbol: v.underlyingSymbol,
        name: v.name,
        vaultAddress: v.address,
        totalAssets,
        totalSupply,
        vaultDecimals,
        assetAddress,
        assetDecimals: v.underlyingDecimals ?? 6,
        poolNetAPRs: [],
        poolTVLs: [],
      };

      if (userAddress) {
        userCalls.push(
          {
            address: v.address as `0x${string}`,
            abi: parseAbi([
              "function balanceOf(address) view returns (uint256)",
            ]),
            functionName: "balanceOf",
            args: [userAddress],
          },
          {
            address: assetAddress,
            abi: parseAbi([
              "function balanceOf(address) view returns (uint256)",
            ]),
            functionName: "balanceOf",
            args: [userAddress],
          },
          {
            address: assetAddress,
            abi: parseAbi([
              "function allowance(address, address) view returns (uint256)",
            ]),
            functionName: "allowance",
            args: [userAddress, v.address],
          },
          {
            address: v.address as `0x${string}`,
            abi: YieldAllocatorVaultABI,
            functionName: "pendingDepositRequest",
            args: [0n, userAddress],
          },
          {
            address: v.address as `0x${string}`,
            abi: YieldAllocatorVaultABI,
            functionName: "pendingRedeemRequest",
            args: [0n, userAddress],
          },
          {
            address: v.address as `0x${string}`,
            abi: YieldAllocatorVaultABI,
            functionName: "maxDeposit",
            args: [userAddress],
          },
          {
            address: v.address as `0x${string}`,
            abi: YieldAllocatorVaultABI,
            functionName: "maxRedeem",
            args: [userAddress],
          }
        );
      }
    });

    return { processedVaults: processed, userContracts: userCalls };
  }, [vaultResults, allVaultData, userAddress]);
  
  // 3. Fetch User Data

  const { data: userResults, isLoading: isUserLoading, refetch: refetchUser } = useReadContracts({ contracts: userContracts as any, query: { enabled: !!userContracts.length && !!userAddress, staleTime: 30_000, refetchInterval: 30_000, }, }) as any;

  // 4. Final Processing
  useEffect(() => {
    if (!allVaultData || allVaultData.length === 0) {
      setVaultData({});
      setPendingDepositAssets(0n);
      setPendingRedeemShares(0n);
      setIsLoading(isVaultsLoading || isUserLoading);
      return;
    }

    const finalVaultData: Record<string, VaultData> = {};
    let totalPendingDeposit = 0n;
    let totalPendingRedeem = 0n;
    // console.log("processedVaults",processedVaults);
    // console.log("allVaultData",allVaultData);
    allVaultData?.forEach((v: any, index: number) => {
      const address = v.address as string;
      const vaultRaw = (processedVaults as any)[address];
      if (!vaultRaw) return;
      let userData = undefined;
      if (userResults && userResults.length > 0) {
        const base = index * 7;
        if (userResults[base]) {
          userData = {
            userShares: (userResults[base]?.result as bigint) ?? 0n,
            userAssetBalance: (userResults[base + 1]?.result as bigint) ?? 0n,
            assetAllowance: (userResults[base + 2]?.result as bigint) ?? 0n,
            pendingDepositAssets:
              (userResults[base + 3]?.result as bigint) ?? 0n,
            pendingRedeemShares:
              (userResults[base + 4]?.result as bigint) ?? 0n,
            maxDeposit: (userResults[base + 5]?.result as bigint) ?? 0n,
            maxRedeem: (userResults[base + 6]?.result as bigint) ?? 0n,
          };
          totalPendingDeposit += userData.pendingDepositAssets || 0n;
          totalPendingRedeem += userData.pendingRedeemShares || 0n;
        }
      }
      const metrics = calculateVaultMetrics(vaultRaw, userData);
      finalVaultData[address] = {
        totalAssets: metrics.totalAssets,
        totalSupply: metrics.totalSupply,
        currentNetAPR: metrics.currentNetAPR,
        tvl: metrics.tvl,
        userDeposits: (metrics as any).userDeposits || 0,
        userShares: (metrics as any).userShares || 0,
        compoundedYield: (metrics as any).compoundedYield || 0,
        assetBalance: (metrics as any).assetBalance || 0,
        assetAllowance: userData?.assetAllowance || 0n,
        pricePerShare: (metrics as any).pricePerShare || 1,
        assetAddress: vaultRaw.assetAddress,
        assetDecimals: v.underlyingDecimals,
        assetSymbol: v.underlyingSymbol,
        vaultDecimals: vaultRaw.vaultDecimals,
        totalRequestedAssets: metrics.totalRequestedAssets,
        pendingDepositAssets: userData?.pendingDepositAssets || 0n,
        isLoading: false,
        error: null,
        poolNetAPRs: [],
        poolTVLs: [],
        maxDeposit: userData?.maxDeposit || 0n,
        maxRedeem: userData?.maxRedeem || 0n,
      };
    });
    // console.log("finalVaultData",finalVaultData)
    setVaultData(finalVaultData);
    setPendingDepositAssets(totalPendingDeposit);
    setPendingRedeemShares(totalPendingRedeem);
    setIsLoading(isVaultsLoading || isUserLoading);
  }, [
    allVaultData,
    processedVaults,
    userResults,
    isVaultsLoading,
    isUserLoading,
  ]);

  const refreshAllData = useCallback(
    async (silentRefresh = false) => {
      if (!silentRefresh) setIsLoading(true);
      await Promise.all([refetchVaults(), refetchUser()]);
      if (!silentRefresh) setIsLoading(false);
    },
    [refetchVaults, refetchUser]
  );

  const getVaultByAddress = useCallback(
    (address: string) => {
      return vaultData[address];
    },
    [vaultData]
  );

  const getAllVaults = useCallback(() => {
    return allVaultData?.map((v: any) => ({
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
    return allVaultData?.map((v: any) => v.address)
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
      allVaultData?.forEach((v: any) => {
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
              setPendingDepositAssets(0n);
              toast({
                title: "Settlement complete",
                description: `Your Deposit request has settled on-chain.`,
              });
              refreshAllData(true);
              setDepositEventStatus("settled");
            }
          },
        });

        // Settlement: mark redemptions as available
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
              // console.log(`[MultiVault] Withdraw event detected for ${address}`);
              refreshAllData(true).then(() => {
                setPendingRedeemShares(0n);
                setWithdrawEventStatus("settled");
              });
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
      if (!userAddress) return 0;
      const max = vaultData[vaultAddress]?.maxDeposit ?? 0n;
      const decimals = (vaultData[vaultAddress]?.assetDecimals as number) ?? 6;
      return Number(formatUnits(max, Number(decimals)));
    },
    [userAddress, vaultData]
  );

  const getClaimableRedeemAmount = useCallback(
    async (vaultAddress: string) => {
      if (!userAddress) return 0;
      const maxShares = vaultData[vaultAddress]?.maxRedeem ?? 0n;

      const rawVault = processedVaults[vaultAddress];
      if (!rawVault || !rawVault.totalSupply || rawVault.totalSupply === 0n)
        return 0;

      const assets = (maxShares * rawVault.totalAssets) / rawVault.totalSupply;

      const decimals = (vaultData[vaultAddress]?.assetDecimals as number) ?? 6;
      return Number(formatUnits(assets, Number(decimals)));
    },
    [userAddress, vaultData, processedVaults]
  );

  // Transaction functions
  const deposit = useCallback(
    async (vaultAddress: string, amount: string) => {
      if (!userAddress) {
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

        let assetAddress: `0x${string}` = vaultData[vaultAddress]?.assetAddress;
        let assetDecimals: number | undefined =
          vaultData[vaultAddress]?.assetDecimals;
        const amountBigInt = parseUnits(amount, Number(assetDecimals));
        const currentAllowance = vaultData[vaultAddress]?.assetAllowance ?? 0n;

        if (currentAllowance < amountBigInt) {
          // console.log( `Requesting approval for exact amount: ${amountBigInt.toString()}`);

          const approveGas = await publicClient.estimateContractGas({
            address: assetAddress as `0x${string}`,
            abi: parseAbi([
              "function approve(address, uint256) returns (bool)",
            ]),
            functionName: "approve",
            args: [vaultAddress as `0x${string}`, amountBigInt],
            account: userAddress as `0x${string}`,
          });

          const approveTx = await writeContractAsync({
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
            abi: erc20Abi,
            functionName: "allowance",
            args: [userAddress as `0x${string}`, vaultAddress as `0x${string}`],
            account: userAddress as `0x${string}`,
          } as any);

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

        const depositTx = await writeContractAsync({
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
      writeContractAsync,
      userAddress,
      refreshAllData,
      publicClient,
      allVaultData,
      vaultData,
    ]
  );

  const withdraw = useCallback(
    async (vaultAddress: string, amount: string) => {
      if (!userAddress) {
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
        
        let assetDecimals: number | undefined =
          vaultData[vaultAddress]?.assetDecimals;
        console.log("assetDecimals",vaultData,vaultAddress)
        const amountBigInt = parseUnits(amount, Number(assetDecimals));
        console.log("amountBigInt",amountBigInt)

        const shares = await publicClient.readContract({
          address: vaultAddress as `0x${string}`,
          abi: parseAbi([
            "function convertToShares(uint256 assets) view returns (uint256)",
          ]),
          functionName: "convertToShares",
          args: [amountBigInt],
          account: userAddress as `0x${string}`,
        } as any);
        // console.log("shares",shares)

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
        const withdrawTx = await writeContractAsync({
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

        await publicClient.waitForTransactionReceipt({
          hash: withdrawTx,
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
    [
      writeContractAsync,
      userAddress,
      refreshAllData,
      publicClient,
      allVaultData,
    ]
  );

  // Allow user to cancel an active deposit request if contract permits
  const cancelDepositRequest = useCallback(
    async (vaultAddress: string) => {
      if (!userAddress) {
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

        const tx = await writeContractAsync({
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
    [writeContractAsync, userAddress, refreshAllData, publicClient]
  );

  const claimRedeem = useCallback(
    async (vaultAddress: string) => {
      if (!userAddress) {
        throw new Error("Wallet not connected");
      }
      try {
        const chainSwitched = await switchToChain();
        if (!chainSwitched) {
          throw new Error("Failed to switch to Hyper EVM chain");
        }
        setIsTransacting(true);
        setTransactionHash(null);

        let maxShares = vaultData[vaultAddress]?.maxRedeem ?? 0n;
        if (maxShares === 0n) {
          try {
            const onChainMaxRedeem = await publicClient.readContract({
              address: vaultAddress as `0x${string}`,
              abi: YieldAllocatorVaultABI,
              functionName: "maxRedeem",
              args: [userAddress as `0x${string}`],
              account: userAddress as `0x${string}`,
            } as any);
            maxShares = (onChainMaxRedeem as bigint) ?? 0n;
          } catch {}
        }

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

        const tx = await writeContractAsync({
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
          setWithdrawEventStatus("settled");
        }

        await refreshAllData(true);
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
    [writeContractAsync, userAddress, refreshAllData, publicClient]
  );

  const value = useMemo(
    () => ({
      vaultData,
      isLoading,
      error,
      refreshAllData,
      getVaultByAddress,
      getAllVaults,
      getTotalTVL,
      getTotalUserDeposits,
      deposit,
      withdraw,
      cancelDepositRequest,
      claimRedeem,
      getClaimableDepositAmount,
      getClaimableRedeemAmount,
      isTransacting,
      isDepositTransacting,
      isWithdrawTransacting,
      transactionHash,
      pendingDepositAssets,
      pendingRedeemShares,
      depositEventStatus,
      setDepositEventStatus,
      withdrawEventStatus,
      setWithdrawEventStatus,
    }),
    [
      vaultData,
      isLoading,
      error,
      refreshAllData,
      getVaultByAddress,
      getAllVaults,
      getTotalTVL,
      getTotalUserDeposits,
      deposit,
      withdraw,
      cancelDepositRequest,
      claimRedeem,
      getClaimableDepositAmount,
      getClaimableRedeemAmount,
      isTransacting,
      isDepositTransacting,
      isWithdrawTransacting,
      transactionHash,
      pendingDepositAssets,
      pendingRedeemShares,
      depositEventStatus,
      setDepositEventStatus,
      withdrawEventStatus,
      setWithdrawEventStatus,
    ]
  );

  return (
    <VaultContractContext.Provider value={value}>
    {children}
    </VaultContractContext.Provider>
  );
};

export const useVaultContract = () => {
  const context = useContext(VaultContractContext);
  if (context === undefined) {
    throw new Error(
      "useVaultContractContext must be used within a VaultContractProvider"
    );
  }
  return context;
};
