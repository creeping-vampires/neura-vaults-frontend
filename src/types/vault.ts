export interface VaultData {
  // Public vault data
  totalAssets: number;
  totalSupply: number;
  currentNetAPR: number;
  tvl: number;
  totalRequestedAssets: number;
  pendingDepositAssets: number;

  // User-specific data
  userDeposits: number;
  userShares: number;
  compoundedYield: number;
  assetBalance: number;
  pricePerShare: number;

  // Technical data
  assetDecimals: number;

  // UI state
  isLoading: boolean;
  error: string | null;

  // Pool data
  poolNetAPRs: number[];
  poolTVLs: number[];
  poolAddresses: `0x${string}`[];
}

export interface VaultMetrics {
  totalAssets: number;
  totalSupply: number;
  currentNetAPR: number;
  tvl: number;
  totalRequestedAssets: number;
  pendingDepositAssets: number;
  userDeposits: number;
  userShares: number;
  compoundedYield: number;
  assetBalance: number;
  pricePerShare: number;
}