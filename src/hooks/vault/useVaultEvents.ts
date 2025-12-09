import { useEffect } from "react";
import { usePublicClient, useAccount } from "wagmi";
import { Address } from "viem";
import YieldAllocatorVaultABI from "@/utils/abis/YieldAllocatorVault.json";
import { useToast } from "@/hooks/use-toast";
import { useVaultApi } from "@/hooks/useVaultApi";
import { LatestVaultItem } from "@/services/config";

interface UseVaultEventsProps {
  refreshAllData: (silentRefresh?: boolean) => Promise<void>;
  setPendingDepositAssets: (amount: bigint) => void;
  setPendingRedeemShares: (amount: bigint) => void;
  setDepositEventStatus: (status: string) => void;
  setWithdrawEventStatus: (status: string) => void;
}

export const useVaultEvents = ({
  refreshAllData,
  setPendingDepositAssets,
  setPendingRedeemShares,
  setDepositEventStatus,
  setWithdrawEventStatus,
}: UseVaultEventsProps) => {
  const { toast } = useToast();
  const publicClient = usePublicClient();
  const { address: userAddress } = useAccount();
  const { allVaultData } = useVaultApi();

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
      allVaultData.forEach((v: LatestVaultItem) => {
        const address = v.address as `0x${string}`;

        // Settlement: deposits finalized; update pending deposit tracking only
        const unwatchSettleDeposit = publicClient.watchContractEvent({
          address,
          abi: YieldAllocatorVaultABI as any,
          eventName: "SettleDeposit",
          onLogs: () => {},
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
          onLogs: () => {},
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
  }, [
    publicClient,
    userAddress,
    refreshAllData,
    allVaultData,
    setPendingDepositAssets,
    setDepositEventStatus,
    setPendingRedeemShares,
    setWithdrawEventStatus,
    toast,
  ]);
};
