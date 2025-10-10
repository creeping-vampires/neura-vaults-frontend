import { PublicClient, Address, formatUnits, parseAbiItem } from "viem";
import { getBatchRpcClient } from "./batchRpc";
import { VAULTS, VaultType } from "./constant";
import { parseAbi } from "viem";

export interface MultiVaultData {
  vaultType: VaultType;
  vaultAddress: Address;
  totalAssets: bigint;
  totalSupply: bigint;
  vaultDecimals: bigint;
  assetAddress: Address;
  assetDecimals: bigint;
  poolAddresses: `0x${string}`[];
  poolNetAPRs: number[];
  poolTVLs: number[];
  userShares?: bigint;
  userAssetBalance?: bigint;
  assetAllowance?: bigint;
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
        }
      );
      callIndexMap.set(`vault_data_${type}`, { start: baseIndex, count: 3 });
      currentIndex += 3;
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

    // Organize results by vault type
    const results: Record<VaultType, MultiVaultData> = {} as Record<
      VaultType,
      MultiVaultData
    >;

    for (let i = 0; i < vaultConfigs.length; i++) {
      const { type, address } = vaultConfigs[i];
      const assetAddress = assetAddresses[i].data as Address;
      const assetDecimals = assetDecimalsResults[i].data as bigint;

      // Extract vault data results using the index map
      const vaultDataInfo = callIndexMap.get(`vault_data_${type}`);
      const totalAssets = allResults[vaultDataInfo.start].data as bigint;
      const totalSupply = allResults[vaultDataInfo.start + 1].data as bigint;
      const vaultDecimals = allResults[vaultDataInfo.start + 2].data as bigint;
      // No vault-level pending values in new ABI; initialize to 0n and compute per-user later
      const totalRequestedAssets = 0n;
      const pendingDepositAssets = 0n;

      results[type] = {
        vaultType: type,
        vaultAddress: address,
        totalAssets,
        totalSupply,
        vaultDecimals,
        assetAddress,
        assetDecimals,
        poolAddresses: [],
        poolNetAPRs: [],
        poolTVLs: [],
      };
    }

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
    ]);

    const userDataResults = await this.batchClient.batchRead(userDataCalls, {
      cacheKey: `multi_user_${userAddress}`,
      ttl: 0,
    });

    // Organize results by vault type
    const results: Record<
      VaultType,
      {
        userShares: bigint;
        userAssetBalance: bigint;
        assetAllowance: bigint;
      }
    > = {} as any;
    let index = 0;

    for (const type of vaultTypes) {
      const userShares = userDataResults[index++].data as bigint;
      const userAssetBalance = userDataResults[index++].data as bigint;
      const assetAllowance = userDataResults[index++].data as bigint;

      results[type] = {
        userShares,
        userAssetBalance,
        assetAllowance,
      };
    }

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

  const totalRequestedAssetsRaw: bigint = userData?.totalRequestedAssets ?? 0n;
  const totalRequestedAssetsFormatted =
    Number(
      (totalRequestedAssetsRaw * BigInt(10 ** 18)) /
        BigInt(10 ** Number(data.assetDecimals))
    ) / 1e18;

  const pendingDepositAssetsRaw: bigint = userData?.pendingDepositAssets ?? 0n;
  const pendingDepositAssetsFormatted =
    Number(
      (pendingDepositAssetsRaw * BigInt(10 ** 18)) /
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
      totalSupplyFormatted > 0
        ? totalAssetsFormatted / totalSupplyFormatted
        : 0;
        
    const userDepositsFormatted = userSharesFormatted * pricePerShare;
    
    const compoundedYield = 0;

    userMetrics = {
      userShares: userSharesFormatted,
      userDeposits: userDepositsFormatted,
      compoundedYield,
      assetBalance: userAssetBalanceFormatted,
      pricePerShare: pricePerShare,
    };
  }

  return {
    totalAssets: totalAssetsFormatted,
    totalSupply: totalSupplyFormatted,
    currentNetAPR,
    tvl: totalAssetsFormatted,
    totalRequestedAssets: totalRequestedAssetsFormatted,
    pendingDepositAssets: pendingDepositAssetsFormatted,
    ...userMetrics,
  };
};
