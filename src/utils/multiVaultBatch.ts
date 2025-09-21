import { PublicClient, Address, formatUnits } from "viem";
import { getBatchRpcClient } from "./batchRpc";
import { VAULTS, VaultType, WHITELIST_REGISTERY_ADDRESS } from "./constant";
import { parseAbi } from "viem";
import YieldAllocatorVaultABI from "@/utils/abis/YieldAllocatorVault.json";
import WhitelistRegistryABI from "@/utils/abis/WhitelistRegistery.json";

export interface MultiVaultData {
  vaultType: VaultType;
  vaultAddress: Address;
  totalAssets: bigint;
  totalSupply: bigint;
  vaultDecimals: bigint;
  totalRequestedAssets: bigint;
  pendingDepositAssets: bigint;
  assetAddress: Address;
  assetDecimals: bigint;
  pendingWithdrawersCount: number;
  poolAddresses: `0x${string}`[];
  poolNetAPRs: number[];
  poolTVLs: number[];
  userShares?: bigint;
  userAssetBalance?: bigint;
  assetAllowance?: bigint;
  userPrincipal?: bigint;
  hasPendingDeposit?: boolean;
  hasPendingWithdrawal?: boolean;
}

export class MultiVaultBatchClient {
  private publicClient: PublicClient;
  private batchClient: ReturnType<typeof getBatchRpcClient>;

  constructor(publicClient: PublicClient) {
    this.publicClient = publicClient;
    this.batchClient = getBatchRpcClient(publicClient);
  }

  /**
   * Fetch data for multiple vaults in optimized batches
   */
  async fetchMultiVaultData(
    vaultTypes: VaultType[]
  ): Promise<Record<VaultType, MultiVaultData>> {
    const vaultConfigs = vaultTypes.map((type) => ({
      type,
      config: VAULTS[type],
      address: VAULTS[type].yieldAllocatorVaultAddress as Address,
    }));

    // Combine all calls into a single batch for maximum efficiency
    const allCalls = [];
    const callIndexMap = new Map();
    let currentIndex = 0;

    // Step 1: Asset addresses
    vaultConfigs.forEach(({ address, type }) => {
      allCalls.push({
        address,
        abi: parseAbi([
          "function asset() view returns (address)",
        ]) as readonly any[],
        functionName: "asset",
      });
      callIndexMap.set(`asset_${type}`, currentIndex++);
    });

    // Step 2: Vault data
    vaultConfigs.forEach(({ address, type }) => {
      const baseIndex = currentIndex;
      allCalls.push(
        {
          address,
          abi: parseAbi([
            "function totalAssets() view returns (uint256)",
          ]) as readonly any[],
          functionName: "totalAssets",
        },
        {
          address,
          abi: parseAbi([
            "function totalSupply() view returns (uint256)",
          ]) as readonly any[],
          functionName: "totalSupply",
        },
        {
          address,
          abi: parseAbi([
            "function decimals() view returns (uint8)",
          ]) as readonly any[],
          functionName: "decimals",
        },
        {
          address,
          abi: parseAbi([
            "function totalRequestedAssets() view returns (uint256)",
          ]) as readonly any[],
          functionName: "totalRequestedAssets",
        },
        {
          address,
          abi: parseAbi([
            "function pendingDepositAssets() view returns (uint256)",
          ]) as readonly any[],
          functionName: "pendingDepositAssets",
        }
      );
      callIndexMap.set(`vault_data_${type}`, { start: baseIndex, count: 5 });
      currentIndex += 5;
    });

    // Execute single optimized batch call
    const allResults = await this.batchClient.batchRead(allCalls, {
      cacheKey: `multi_vault_complete_${vaultTypes.join("_")}`,
      ttl: 30000,
    });

    // Extract asset addresses from results
    const assetAddresses = vaultConfigs.map(
      ({ type }) => allResults[callIndexMap.get(`asset_${type}`)]
    );

    // Add asset decimals calls to the batch
    const assetDecimalsCalls = assetAddresses.map((result) => ({
      address: result.data as Address,
      abi: parseAbi([
        "function decimals() view returns (uint8)",
      ]) as readonly any[],
      functionName: "decimals",
    }));

    const assetDecimalsResults = await this.batchClient.batchRead(
      assetDecimalsCalls,
      {
        cacheKey: `asset_decimals_${vaultTypes.join("_")}`,
        ttl: 30000,
      }
    );

    // Step 4: Get pending withdrawers for all vaults
    const pendingWithdrawersCalls = vaultConfigs.flatMap(({ address }) =>
      Array.from({ length: 10 }, (_, i) => ({
        address,
        abi: parseAbi([
          "function pendingWithdrawers(uint256) view returns (address)",
        ]) as readonly any[],
        functionName: "pendingWithdrawers",
        args: [BigInt(i)],
      }))
    );

    const pendingWithdrawersResults = await this.batchClient.batchRead(
      pendingWithdrawersCalls,
      {
        cacheKey: "multi_pending_withdrawers",
        ttl: 30000,
      }
    );

    // Organize results by vault type
    const results: Record<VaultType, MultiVaultData> = {} as Record<
      VaultType,
      MultiVaultData
    >;
    let withdrawersIndex = 0;

    for (let i = 0; i < vaultConfigs.length; i++) {
      const { type, address } = vaultConfigs[i];
      const assetAddress = assetAddresses[i].data as Address;
      const assetDecimals = assetDecimalsResults[i].data as bigint;

      // Extract vault data results using the index map
      const vaultDataInfo = callIndexMap.get(`vault_data_${type}`);
      const totalAssets = allResults[vaultDataInfo.start].data as bigint;
      const totalSupply = allResults[vaultDataInfo.start + 1].data as bigint;
      const vaultDecimals = allResults[vaultDataInfo.start + 2].data as bigint;
      const totalRequestedAssets = allResults[vaultDataInfo.start + 3]
        .data as bigint;
      const pendingDepositAssets = allResults[vaultDataInfo.start + 4]
        .data as bigint;

      // Count pending withdrawers
      let pendingWithdrawersCount = 0;
      for (let j = 0; j < 10; j++) {
        const withdrawer = pendingWithdrawersResults[withdrawersIndex + j]
          .data as string;
        if (
          withdrawer &&
          withdrawer !== "0x0000000000000000000000000000000000000000"
        ) {
          pendingWithdrawersCount++;
        } else {
          break;
        }
      }
      withdrawersIndex += 10;

      results[type] = {
        vaultType: type,
        vaultAddress: address,
        totalAssets,
        totalSupply,
        vaultDecimals,
        totalRequestedAssets,
        pendingDepositAssets,
        assetAddress,
        assetDecimals,
        pendingWithdrawersCount,
        poolAddresses: [],
        poolNetAPRs: [],
        poolTVLs: [],
      };
    }

    // Fetch pool addresses for all vaults
    await this.fetchPoolAddresses(results);

    return results;
  }

  /**
   * Fetch user-specific data for multiple vaults
   */
  async fetchMultiUserData(
    vaultTypes: VaultType[],
    userAddress: Address,
    vaultData: Record<VaultType, MultiVaultData>
  ): Promise<
    Record<
      VaultType,
      {
        userShares: bigint;
        userAssetBalance: bigint;
        assetAllowance: bigint;
        userPrincipal: bigint;
        hasPendingDeposit: boolean;
        hasPendingWithdrawal: boolean;
      }
    >
  > {
    // Create user-specific calls for all vaults
    const userDataCalls = Object.entries(vaultData).flatMap(([type, data]) => [
      {
        address: data.vaultAddress,
        abi: parseAbi([
          "function balanceOf(address) view returns (uint256)",
        ]) as readonly any[],
        functionName: "balanceOf",
        args: [userAddress],
      },
      {
        address: data.assetAddress,
        abi: parseAbi([
          "function balanceOf(address) view returns (uint256)",
        ]) as readonly any[],
        functionName: "balanceOf",
        args: [userAddress],
      },
      {
        address: data.assetAddress,
        abi: parseAbi([
          "function allowance(address, address) view returns (uint256)",
        ]) as readonly any[],
        functionName: "allowance",
        args: [userAddress, data.vaultAddress],
      },
      {
        address: data.vaultAddress,
        abi: YieldAllocatorVaultABI,
        functionName: "userPrincipal",
        args: [userAddress],
      },
      {
        address: data.vaultAddress,
        abi: YieldAllocatorVaultABI,
        functionName: "hasPendingDeposit",
        args: [userAddress],
      },
      {
        address: data.vaultAddress,
        abi: YieldAllocatorVaultABI,
        functionName: "hasPendingWithdrawal",
        args: [userAddress],
      },
    ]);

    const userDataResults = await this.batchClient.batchRead(userDataCalls, {
      cacheKey: `multi_user_${userAddress}`,
      ttl: 15000, // Shorter TTL for user data
    });

    // Organize results by vault type
    const results: Record<
      VaultType,
      {
        userShares: bigint;
        userAssetBalance: bigint;
        assetAllowance: bigint;
        userPrincipal: bigint;
        hasPendingDeposit: boolean;
        hasPendingWithdrawal: boolean;
      }
    > = {} as any;
    let index = 0;

    vaultTypes.forEach((type) => {
      const userShares = userDataResults[index++].data as bigint;
      const userAssetBalance = userDataResults[index++].data as bigint;
      const assetAllowance = userDataResults[index++].data as bigint;
      const userPrincipal = userDataResults[index++].data as bigint;
      const hasPendingDeposit = userDataResults[index++].data as boolean;
      const hasPendingWithdrawal = userDataResults[index++].data as boolean;

      results[type] = {
        userShares,
        userAssetBalance,
        assetAllowance,
        userPrincipal,
        hasPendingDeposit,
        hasPendingWithdrawal,
      };
    });

    return results;
  }

  /**
   * Refresh all multi-vault data with user data
   */
  async refreshAllData(vaultTypes: VaultType[], userAddress?: Address) {
    const vaultData = await this.fetchMultiVaultData(vaultTypes);

    let userData = {};
    if (userAddress) {
      userData = await this.fetchMultiUserData(
        vaultTypes,
        userAddress,
        vaultData
      );
    }

    return { vaultData, userData };
  }

  private async fetchPoolAddresses(
    results: Record<VaultType, MultiVaultData>
  ): Promise<void> {
    try {
      // Fetch pool addresses for each vault
      for (const vaultType of Object.keys(results) as VaultType[]) {
        const vaultData = results[vaultType];
        const poolAddresses = await this.publicClient.readContract({
          address: WHITELIST_REGISTERY_ADDRESS,
          abi: WhitelistRegistryABI,
          functionName: "getWhitelistedPools",
        }) as `0x${string}`[];

        vaultData.poolAddresses = poolAddresses || [];

        // Fetch pool data for APR and TVL calculations
        if (poolAddresses && poolAddresses.length > 0) {
          const poolData = await this.fetchPoolData(vaultData.vaultAddress, poolAddresses, vaultData.assetDecimals);
          vaultData.poolNetAPRs = poolData.map(p => p.apr);
          vaultData.poolTVLs = poolData.map(p => p.tvl);
        }
      }
    } catch (error) {
      console.error("Error fetching pool addresses:", error);
    }
  }

  private async fetchPoolData(
    vaultAddress: Address,
    poolAddresses: `0x${string}`[],
    assetDecimals: bigint
  ): Promise<Array<{ apr: number; tvl: number }>> {
    try {
      // Create batch calls for pool principal data
      const poolPrincipalCalls = poolAddresses.map((poolAddress) => ({
        address: vaultAddress,
        abi: YieldAllocatorVaultABI,
        functionName: "poolPrincipal",
        args: [poolAddress],
      }));

      const poolPrincipalResults = await this.batchClient.batchRead(
        poolPrincipalCalls,
        {
          cacheKey: `pool_principal_${vaultAddress}`,
          ttl: 30000,
        }
      );

      // Calculate APR and TVL for each pool
      return poolPrincipalResults.map((result, index) => {
        const poolPrincipal = result.data as bigint;
        const poolAssetsFormatted = parseFloat(formatUnits(poolPrincipal, Number(assetDecimals)));
        
        // For now, use a placeholder APR calculation
        // In the real implementation, this would fetch actual APR data
        const apr = poolAssetsFormatted > 0 ? 5.0 : 0; // Placeholder 5% APR
        
        // Format TVL to 2 decimal places for consistent display
        const tvl = parseFloat(poolAssetsFormatted.toFixed(2));

        return { apr, tvl };
      });
    } catch (error) {
      console.error("Error fetching pool data:", error);
      return poolAddresses.map(() => ({ apr: 0, tvl: 0 }));
    }
  }
}

// Singleton instance
let multiVaultClient: MultiVaultBatchClient | null = null;

export const getMultiVaultBatchClient = (publicClient: PublicClient) => {
  if (!multiVaultClient) {
    multiVaultClient = new MultiVaultBatchClient(publicClient);
  }
  return multiVaultClient;
};

/**
 * Helper function to calculate vault metrics from batch data
 */
export const calculateVaultMetrics = (data: MultiVaultData, userData?: any) => {
  const totalAssetsFormatted =
    Number(
      (data.totalAssets * BigInt(10 ** 18)) /
        BigInt(10 ** Number(data.assetDecimals))
    ) / 1e18;

  const totalSupplyFormatted =
    Number(
      (data.totalSupply * BigInt(10 ** 18)) /
        BigInt(10 ** Number(data.vaultDecimals))
    ) / 1e18;

  const totalRequestedAssetsFormatted =
    Number(
      (data.totalRequestedAssets * BigInt(10 ** 18)) /
        BigInt(10 ** Number(data.assetDecimals))
    ) / 1e18;

  const pendingDepositAssetsFormatted =
    Number(
      (data.pendingDepositAssets * BigInt(10 ** 18)) /
        BigInt(10 ** Number(data.assetDecimals))
    ) / 1e18;

  const currentNetAPR =
    totalAssetsFormatted > totalSupplyFormatted
      ? ((totalAssetsFormatted - totalSupplyFormatted) / totalSupplyFormatted) *
        100
      : 0;

  let userMetrics = {};
  if (userData) {
    const userSharesFormatted =
      Number(
        (userData.userShares * BigInt(10 ** 18)) /
          BigInt(10 ** Number(data.vaultDecimals))
      ) / 1e18;

    const userAssetBalanceFormatted =
      Number(
        (userData.userAssetBalance * BigInt(10 ** 18)) /
          BigInt(10 ** Number(data.assetDecimals))
      ) / 1e18;

    const pricePerShare =
      data.totalSupply > 0n
        ? (data.totalAssets * BigInt(10 ** 18)) / data.totalSupply
        : BigInt(10 ** 18);

    const formattedPricePerShare = Number(formatUnits(pricePerShare, 18));

    const userPrincipalFormatted = userData.userPrincipal
      ? Number(formatUnits(userData.userPrincipal, Number(data.assetDecimals)))
      : 0;
    const compoundedYield =
      userPrincipalFormatted > userSharesFormatted
        ? userPrincipalFormatted - userSharesFormatted
        : 0;

    userMetrics = {
      userShares: userSharesFormatted,
      userDeposits: userPrincipalFormatted,
      compoundedYield,
      assetBalance: userAssetBalanceFormatted,
      pricePerShare: formattedPricePerShare,
    };
  }

  return {
    totalAssets: totalAssetsFormatted,
    totalSupply: totalSupplyFormatted,
    currentNetAPR,
    tvl: totalAssetsFormatted,
    totalRequestedAssets: totalRequestedAssetsFormatted,
    pendingDepositAssets: pendingDepositAssetsFormatted,
    pendingWithdrawersCount: data.pendingWithdrawersCount,
    ...userMetrics,
  };
};
