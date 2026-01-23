import { useState, useCallback } from "react";
import { usePublicClient, useAccount, useWriteContract } from "wagmi";
import { parseUnits, parseAbi, erc20Abi, formatUnits } from "viem";
import { useToast } from "@/hooks/use-toast";
import { switchToChain } from "@/lib/utils";
import { hyperliquid } from "@/lib/privyConfig";
import YieldAllocatorVaultABI from "@/utils/abis/YieldAllocatorVault.json";
import { VaultData } from "@/types/vault";

interface UseVaultTransactionsProps {
  vaultData: Record<string, VaultData>;
  refreshAllData: (silentRefresh?: boolean) => Promise<void>;
}

export const useVaultTransactions = ({
  vaultData,
  refreshAllData,
}: UseVaultTransactionsProps) => {
  const { toast } = useToast();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();
  const { address: userAddress } = useAccount();

  const [isTransacting, setIsTransacting] = useState(false);
  const [isDepositTransacting, setIsDepositTransacting] = useState(false);
  const [isWithdrawTransacting, setIsWithdrawTransacting] = useState(false);
  const [transactionHash, setTransactionHash] = useState<string | null>(null);
  const [depositEventStatus, setDepositEventStatus] = useState("idle");
  const [withdrawEventStatus, setWithdrawEventStatus] = useState("idle");

  const deposit = useCallback(
    async (vaultAddress: string, amount: string) => {
      if (!userAddress) {
        throw new Error("Wallet not connected");
      }
      if (!publicClient) {
        throw new Error("Public client not available");
      }

      try {
        const chainSwitched = await switchToChain();
        if (!chainSwitched) {
          throw new Error("Failed to switch to Hyper EVM chain");
        }
        setIsDepositTransacting(true);
        setDepositEventStatus("submitted");
        setTransactionHash(null);

        const assetAddress = vaultData[vaultAddress]?.assetAddress;
        const assetDecimals = vaultData[vaultAddress]?.assetDecimals;
        
        if (!assetAddress || assetDecimals === undefined) {
            throw new Error("Vault data not loaded");
        }

        const amountBigInt = parseUnits(amount, Number(assetDecimals));
        const currentAllowance = vaultData[vaultAddress]?.assetAllowance ?? 0n;

        if (currentAllowance < amountBigInt) {
          const approveGas = await publicClient.estimateContractGas({
            address: assetAddress,
            abi: parseAbi([
              "function approve(address, uint256) returns (bool)",
            ]),
            functionName: "approve",
            args: [vaultAddress as `0x${string}`, amountBigInt],
            account: userAddress,
          });

          const approveTx = await writeContractAsync({
            address: assetAddress,
            abi: parseAbi([
              "function approve(address, uint256) returns (bool)",
            ]),
            functionName: "approve",
            args: [vaultAddress as `0x${string}`, amountBigInt],
            chain: hyperliquid,
            account: userAddress,
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
            address: assetAddress,
            abi: erc20Abi,
            functionName: "allowance",
            args: [userAddress, vaultAddress as `0x${string}`],
            account: userAddress,
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
            userAddress,
            userAddress,
          ],
          account: userAddress,
        });

        const depositTx = await writeContractAsync({
          address: vaultAddress as `0x${string}`,
          abi: YieldAllocatorVaultABI,
          functionName: "requestDeposit",
          args: [
            amountBigInt,
            userAddress,
            userAddress,
          ],
          chain: hyperliquid,
          account: userAddress,
          gas: (depositGas * 200n) / 100n,
        });

        setTransactionHash(depositTx);

        await publicClient.waitForTransactionReceipt({
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
      vaultData,
      toast
    ]
  );

  const withdraw = useCallback(
    async (vaultAddress: string, amount: string) => {
      if (!userAddress) {
        throw new Error("Wallet not connected");
      }
      if (!publicClient) {
        throw new Error("Public client not available");
      }

      try {
        const chainSwitched = await switchToChain();
        if (!chainSwitched) {
          throw new Error("Failed to switch to Hyper EVM chain");
        }
        setIsWithdrawTransacting(true);
        setWithdrawEventStatus("submitted");
        setTransactionHash(null);
        
        const assetDecimals = vaultData[vaultAddress]?.assetDecimals;
        
        if (assetDecimals === undefined) {
             throw new Error("Vault data not loaded");
        }

        const amountBigInt = parseUnits(amount, Number(assetDecimals));

        const shares = await publicClient.readContract({
          address: vaultAddress as `0x${string}`,
          abi: parseAbi([
            "function convertToShares(uint256 assets) view returns (uint256)",
          ]),
          functionName: "convertToShares",
          args: [amountBigInt],
          account: userAddress,
        } as any);

        const requestRedeemGas = await publicClient.estimateContractGas({
          address: vaultAddress as `0x${string}`,
          abi: YieldAllocatorVaultABI,
          functionName: "requestRedeem",
          args: [
            shares,
            userAddress,
            userAddress,
          ],
          account: userAddress,
        });
        const withdrawTx = await writeContractAsync({
          address: vaultAddress as `0x${string}`,
          abi: YieldAllocatorVaultABI,
          functionName: "requestRedeem",
          args: [
            shares,
            userAddress,
            userAddress,
          ],
          chain: hyperliquid,
          account: userAddress,
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
      vaultData,
      toast
    ]
  );

  const cancelDepositRequest = useCallback(
    async (vaultAddress: string) => {
      if (!userAddress) {
        throw new Error("Wallet not connected");
      }
      if (!publicClient) {
        throw new Error("Public client not available");
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
          account: userAddress,
        });

        const tx = await writeContractAsync({
          address: vaultAddress as `0x${string}`,
          abi: YieldAllocatorVaultABI,
          functionName: "cancelRequestDeposit",
          chain: hyperliquid,
          account: userAddress,
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
    [writeContractAsync, userAddress, refreshAllData, publicClient, toast]
  );

  const claimRedeem = useCallback(
    async (vaultAddress: string) => {
      if (!userAddress) {
        throw new Error("Wallet not connected");
      }
      if (!publicClient) {
        throw new Error("Public client not available");
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
              args: [userAddress],
              account: userAddress,
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
            userAddress,
            userAddress,
          ],
          account: userAddress,
        });

        const tx = await writeContractAsync({
          address: vaultAddress as `0x${string}`,
          abi: YieldAllocatorVaultABI,
          functionName: "redeem",
          args: [
            maxShares,
            userAddress,
            userAddress,
          ],
          chain: hyperliquid,
          account: userAddress,
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
    [writeContractAsync, userAddress, refreshAllData, publicClient, vaultData, toast]
  );
  
  const getClaimableDepositAmount = useCallback(
    async (vaultAddress: string) => {
      if (!userAddress) return 0;
      const max = vaultData[vaultAddress]?.maxDeposit ?? 0n;
      const decimals = (vaultData[vaultAddress]?.assetDecimals as number) ?? 6;
      return Number(formatUnits(max, decimals));
    },
    [userAddress, vaultData]
  );

  const getClaimableRedeemAmount = useCallback(
    async (vaultAddress: string) => {
      if (!userAddress) return 0;
      const maxShares = vaultData[vaultAddress]?.maxRedeem ?? 0n;
      
      const totalAssets = vaultData[vaultAddress]?.totalAssets ?? 0;
      const totalSupply = vaultData[vaultAddress]?.totalSupply ?? 0;
      
      if (!totalSupply || totalSupply === 0)
        return 0;
      
      const pricePerShare = vaultData[vaultAddress]?.pricePerShare ?? 1;
      
      const decimals = (vaultData[vaultAddress]?.assetDecimals as number) ?? 6;
      const vaultDecimals = (vaultData[vaultAddress]?.vaultDecimals as number) ?? 18;
      
      const sharesFormatted = Number(formatUnits(maxShares, vaultDecimals));
      
      return sharesFormatted * pricePerShare;
    },
    [userAddress, vaultData]
  );

  const getPendingDepositAmount = useCallback(
    async (vaultAddress: string) => {
      if (!userAddress || !publicClient) return 0;
      try {
        const pendingAssets = (await publicClient.readContract({
          address: vaultAddress as `0x${string}`,
          abi: YieldAllocatorVaultABI,
          functionName: "pendingDepositRequest",
          args: [0n, userAddress],
        })) as bigint;

        const decimals =
          (vaultData[vaultAddress]?.assetDecimals as number) ?? 6;
        return Number(formatUnits(pendingAssets, decimals));
      } catch (e) {
        console.error("Failed to fetch pending deposit amount:", e);
        return 0;
      }
    },
    [userAddress, vaultData, publicClient],
  );

  const getPendingRedeemShares = useCallback(
    async (vaultAddress: string) => {
      if (!userAddress || !publicClient) return 0;
      try {
        const pendingShares = (await publicClient.readContract({
          address: vaultAddress as `0x${string}`,
          abi: YieldAllocatorVaultABI,
          functionName: "pendingRedeemRequest",
          args: [0n, userAddress],
        })) as bigint;

        const vaultDecimals =
          (vaultData[vaultAddress]?.vaultDecimals as number) ?? 18;
        return Number(formatUnits(pendingShares, vaultDecimals));
      } catch (e) {
        console.error("Failed to fetch pending redeem shares:", e);
        return 0;
      }
    },
    [userAddress, vaultData, publicClient],
  );

  return {
    deposit,
    withdraw,
    cancelDepositRequest,
    claimRedeem,
    getClaimableDepositAmount,
    getClaimableRedeemAmount,
    getPendingDepositAmount,
    getPendingRedeemShares,
    isTransacting,
    isDepositTransacting,
    isWithdrawTransacting,
    transactionHash,
    depositEventStatus,
    setDepositEventStatus,
    withdrawEventStatus,
    setWithdrawEventStatus,
  };
};
