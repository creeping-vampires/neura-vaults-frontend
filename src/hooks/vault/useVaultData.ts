import { useState, useMemo, useEffect, useCallback } from "react";
import { useAccount, useReadContracts } from "wagmi";
import { parseAbi } from "viem";
import { calculateVaultMetrics } from "@/utils/vaultMetrics";
import { VaultData } from "@/types/vault";
import YieldAllocatorVaultABI from "@/utils/abis/YieldAllocatorVault.json";
import { useVaultApi } from "@/hooks/useVaultApi";
import { LatestVaultItem } from "@/services/config";

interface UseVaultDataReturn {
  vaultData: Record<string, VaultData>;
  isLoading: boolean;
  error: string | null;
  refreshAllData: (silentRefresh?: boolean) => Promise<void>;
}

export const useVaultData = (): UseVaultDataReturn => {
  const { allVaultData } = useVaultApi();
  const { address: userAddress } = useAccount();

  const [vaultData, setVaultData] = useState<Record<string, VaultData>>({});
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error] = useState<string | null>(null);

  // 1. Prepare contracts for Vault Data
  const vaultContracts = useMemo(() => {
    if (!allVaultData || allVaultData.length === 0) return [];
    return allVaultData.flatMap((v: LatestVaultItem) => [
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
  const { data: vaultResults, isLoading: isVaultsLoading, refetch: refetchVaults, } = useReadContracts({ contracts: vaultContracts, query: { enabled: !!vaultContracts.length, staleTime: 30_000, refetchInterval: 30_000, },}) as any;

  // 2. Process Vault Data & Prepare User Data Contracts
  const { processedVaults, userContracts } = useMemo(() => {
    if (!vaultResults || !allVaultData)
      return { processedVaults: {}, userContracts: [] };

    const processed: Record<string, any> = {};
    const userCalls: any[] = [];

    allVaultData.forEach((v: LatestVaultItem, i: number) => {
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
            functionName: "maxDeposit",
            args: [userAddress],
          },
          {
            address: v.address as `0x${string}`,
            abi: YieldAllocatorVaultABI,
            functionName: "maxRedeem",
            args: [userAddress],
          },
        );
      }
    });

    return { processedVaults: processed, userContracts: userCalls };
  }, [vaultResults, allVaultData, userAddress]);

  // 3. Fetch User Data
  const {
    data: userResults,
    isLoading: isUserLoading,
    refetch: refetchUser,
  } = useReadContracts({
    contracts: userContracts as any,
    query: {
      enabled: !!userContracts.length && !!userAddress,
      staleTime: 30_000,
      refetchInterval: 30_000,
    },
  }) as any;

  // 4. Final Processing
  useEffect(() => {
    if (!allVaultData || allVaultData.length === 0) {
      setVaultData({});
      setIsLoading(isVaultsLoading);
      return;
    }

    const finalVaultData: Record<string, VaultData> = {};

    allVaultData.forEach((v: LatestVaultItem, index: number) => {
      const address = v.address as string;
      const vaultRaw = processedVaults[address];
      if (!vaultRaw) return;

      let userData = undefined;
      if (userResults && userResults.length > 0) {
        const base = index * 5;
        if (userResults[base]) {
          userData = {
            userShares: (userResults[base]?.result as bigint) ?? 0n,
            userAssetBalance: (userResults[base + 1]?.result as bigint) ?? 0n,
            assetAllowance: (userResults[base + 2]?.result as bigint) ?? 0n,
            maxDeposit: (userResults[base + 3]?.result as bigint) ?? 0n,
            maxRedeem: (userResults[base + 4]?.result as bigint) ?? 0n,
          };
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
        isLoading: false,
        error: null,
        poolNetAPRs: [],
        poolTVLs: [],
        maxDeposit: userData?.maxDeposit || 0n,
        maxRedeem: userData?.maxRedeem || 0n,
      };
    });

    setVaultData(finalVaultData);
    setIsLoading(isVaultsLoading);
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

  return {
    vaultData,
    isLoading,
    error,
    refreshAllData,
  };
};
