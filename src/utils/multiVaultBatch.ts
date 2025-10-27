import { PublicClient, Address, parseAbi } from "viem";
import { getBatchRpcClient } from "./batchRpc";
import { LatestVaultItem } from "@/services/config";

export interface MultiVaultData {
  symbol: string;
  name: string;
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
    vaults: LatestVaultItem[]
  ): Promise<Record<string, MultiVaultData>> {
    const vaultConfigs = vaults.map((v) => ({
      address: v.address as Address,
      symbol: v.symbol,
      name: v.name,
    }));

    // Combine all calls into a single batch for maximum efficiency
    const allCalls: any[] = [];
    const callIndexMap = new Map<string, any>();
    let currentIndex = 0;

    // Step 1: Asset addresses
    vaultConfigs.forEach(({ address }) => {
      allCalls.push({
        address,
        abi: parseAbi(["function asset() view returns (address)"]) as readonly any[],
        functionName: "asset",
      });
      callIndexMap.set(`asset_${address}`, currentIndex++);
    });

    // Step 2: Vault data
    vaultConfigs.forEach(({ address }) => {
      const baseIndex = currentIndex;
      allCalls.push(
        {
          address,
          abi: parseAbi(["function totalAssets() view returns (uint256)"]) as readonly any[],
          functionName: "totalAssets",
        },
        {
          address,
          abi: parseAbi(["function totalSupply() view returns (uint256)"]) as readonly any[],
          functionName: "totalSupply",
        },
        {
          address,
          abi: parseAbi(["function decimals() view returns (uint8)"]) as readonly any[],
          functionName: "decimals",
        }
      );
      callIndexMap.set(`vault_data_${address}`, { start: baseIndex, count: 3 });
      currentIndex += 3;
    });

    // Execute single optimized batch call
    const allResults = await this.batchClient.batchRead(allCalls, {
      cacheKey: `multi_vault_complete_${vaultConfigs.map((v) => v.address).join("_")}`,
      ttl: 30000,
    });

    // Extract asset addresses from results
    const assetAddresses = vaultConfigs.map(({ address }) => allResults[callIndexMap.get(`asset_${address}`)]);

    // Add asset decimals calls to the batch
    const assetDecimalsCalls = assetAddresses.map((result) => ({
      address: result.data as Address,
      abi: parseAbi(["function decimals() view returns (uint8)"]) as readonly any[],
      functionName: "decimals",
    }));

    const assetDecimalsResults = await this.batchClient.batchRead(assetDecimalsCalls, {
      cacheKey: `asset_decimals_${vaultConfigs.map((v) => v.address).join("_")}`,
      ttl: 30000,
    });

    // Organize results keyed by vault address
    const results: Record<string, MultiVaultData> = {};

    for (let i = 0; i < vaultConfigs.length; i++) {
      const { address, symbol, name } = vaultConfigs[i];
      const assetAddress = assetAddresses[i].data as Address;
      const assetDecimals = assetDecimalsResults[i].data as bigint;

      // Extract vault data results using the index map
      const vaultDataInfo = callIndexMap.get(`vault_data_${address}`);
      const totalAssets = allResults[vaultDataInfo.start].data as bigint;
      const totalSupply = allResults[vaultDataInfo.start + 1].data as bigint;
      const vaultDecimals = allResults[vaultDataInfo.start + 2].data as bigint;

      results[address] = {
        symbol,
        name,
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
    userAddress: Address,
    vaultData: Record<string, MultiVaultData>
  ): Promise<
    Record<
      string,
      {
        userShares: bigint;
        userAssetBalance: bigint;
        assetAllowance: bigint;
      }
    >
  > {
    // Create user-specific calls for all vaults
    const entries = Object.entries(vaultData);
    const userDataCalls = entries.flatMap(([key, data]) => [
      {
        address: data.vaultAddress,
        abi: parseAbi(["function balanceOf(address) view returns (uint256)"]) as readonly any[],
        functionName: "balanceOf",
        args: [userAddress],
      },
      {
        address: data.assetAddress,
        abi: parseAbi(["function balanceOf(address) view returns (uint256)"]) as readonly any[],
        functionName: "balanceOf",
        args: [userAddress],
      },
      {
        address: data.assetAddress,
        abi: parseAbi(["function allowance(address, address) view returns (uint256)"]) as readonly any[],
        functionName: "allowance",
        args: [userAddress, data.vaultAddress],
      },
    ]);

    const userDataResults = await this.batchClient.batchRead(userDataCalls, {
      cacheKey: `multi_user_${userAddress}`,
      ttl: 0,
    });

    // Organize results keyed by vault address
    const results: Record<string, { userShares: bigint; userAssetBalance: bigint; assetAllowance: bigint }> = {} as any;
    let index = 0;

    for (const [key] of entries) {
      const userShares = userDataResults[index++].data as bigint;
      const userAssetBalance = userDataResults[index++].data as bigint;
      const assetAllowance = userDataResults[index++].data as bigint;

      results[key] = {
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
  async refreshAllData(vaults: LatestVaultItem[], userAddress?: Address) {
    const vaultData = await this.fetchMultiVaultData(vaults);

    let userData = {};
    if (userAddress) {
      userData = await this.fetchMultiUserData(userAddress, vaultData);
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
