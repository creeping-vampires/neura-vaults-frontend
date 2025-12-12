export interface VaultData {
  // Public vault data
  totalAssets: number;
  totalSupply: number;
  currentNetAPR: number;
  tvl: number;
  totalRequestedAssets: number;

  // User-specific data
  userDeposits: number;
  userShares: number;
  compoundedYield: number;
  assetBalance: number;
  assetAllowance?: bigint;
  pricePerShare: number;

  // Technical data
  assetAddress: `0x${string}`;
  assetDecimals: number;
  assetSymbol: string;

  vaultDecimals: number;

  // UI state
  isLoading: boolean;
  error: string | null;

  // Pool data
  poolNetAPRs: number[];
  poolTVLs: number[];

  // Pending transaction tracking
  pendingDepositAssets?: bigint;
  pendingRedeemShares?: bigint;

  // Claimable limits
  maxDeposit?: bigint;
  maxRedeem?: bigint;
}

export interface VaultMetrics {
  totalAssets: number;
  totalSupply: number;
  currentNetAPR: number;
  tvl: number;
  totalRequestedAssets: number;
  userDeposits: number;
  userShares: number;
  compoundedYield: number;
  assetBalance: number;
  pricePerShare: number;
}