import React, { createContext, useContext, useMemo } from "react";
import { VaultData } from "@/types/vault";
import { useVaultData } from "./vault/useVaultData";
import { useVaultTransactions } from "./vault/useVaultTransactions";
import { useVaultEvents } from "./vault/useVaultEvents";
import { useVaultApi } from "./useVaultApi";
import { LatestVaultItem } from "@/services/config";

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
  getPendingDepositAmount: (vaultAddress: string) => Promise<number>;
  getPendingRedeemShares: (vaultAddress: string) => Promise<number>;
  isTransacting: boolean;
  isDepositTransacting: boolean;
  isWithdrawTransacting: boolean;
  transactionHash: string | null;
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
  const { allVaultData } = useVaultApi();

  // 1. Fetch and process data
  const { vaultData, isLoading, error, refreshAllData } = useVaultData();

  // 2. Handle transactions
  const {
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
  } = useVaultTransactions({ vaultData, refreshAllData });

  // 3. Watch events
  useVaultEvents({
    refreshAllData,
    setDepositEventStatus,
    setWithdrawEventStatus,
  });

  // 4. Helpers
  const getVaultByAddress = (address: string) => {
    return vaultData[address];
  };

  const getAllVaults = () => {
    return (
      allVaultData?.map((v: LatestVaultItem) => ({
        address: v.address,
        symbol: v.underlyingSymbol,
        name: v.name,
        data: vaultData[v.address],
      })) ?? []
    );
  };

  const getTotalTVL = async () => {
    return Object.values(vaultData).reduce((sum, v) => sum + (v?.tvl || 0), 0);
  };

  const getTotalUserDeposits = () => {
    return Object.values(vaultData).reduce((total, v) => {
      return total + (v?.userDeposits || 0);
    }, 0);
  };

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
    }),
    [
      vaultData,
      error,
      refreshAllData,
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
      depositEventStatus,
      setDepositEventStatus,
      withdrawEventStatus,
      setWithdrawEventStatus,
      allVaultData,
    ],
  );

  return (
    <VaultContractContext.Provider value={value}>
      {children}
    </VaultContractContext.Provider>
  );
};

export const useVaultContract = (vaultId?: string) => {
  const context = useContext(VaultContractContext);
  if (context === undefined) {
    throw new Error(
      "useVaultContractContext must be used within a VaultContractProvider",
    );
  }
  return context;
};
