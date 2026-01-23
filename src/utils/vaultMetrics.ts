import { Address } from "viem";

export interface MultiVaultData {
  symbol: string;
  name: string;
  vaultAddress: Address;
  totalAssets: bigint;
  totalSupply: bigint;
  vaultDecimals: number;
  assetAddress: Address;
  assetDecimals: number;
  poolNetAPRs: number[];
  poolTVLs: number[];
  userShares?: bigint;
  userAssetBalance?: bigint;
  assetAllowance?: bigint;
}

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

    const userDepositsCurrentValue = userSharesFormatted * pricePerShare;
    const compoundedYield = userDepositsCurrentValue - userSharesFormatted;

    userMetrics = {
      userShares: userSharesFormatted,
      userDeposits: userDepositsCurrentValue,
      compoundedYield,
      assetBalance: userAssetBalanceFormatted,
      pricePerShare: pricePerShare,
      vaultDecimals: data.vaultDecimals,
    };
  }

  return {
    totalAssets: totalAssetsFormatted,
    totalSupply: totalSupplyFormatted,
    currentNetAPR,
    tvl: totalAssetsFormatted,
    totalRequestedAssets: totalRequestedAssetsFormatted,
    ...userMetrics,
  };
};
