export const explorerUrl = "https://hyperevmscan.io";

// Vault configurations
export const VAULTS = {
  USDC: {
    name: "aiUSDC",
    symbol: "USDC",
    yieldAllocatorVaultAddress:
      "0x869c314b6a40Ce1b2adB4f61ff17eA445F390629" as `0x${string}`,
    aiAgentAddress:
      "0x7b10086b7a1363E45a9e3875B8dA42927BA27F08" as `0x${string}`,
    whitelistRegisteryAddress:
      "0x91cbFcd28fAE1940FE32AB6dB7A28649a8986F21" as `0x${string}`,
    assetTokenAddress:
      "0x5d3a1Ff2b6BAb83b63cd9AD0787074081a52ef34" as `0x${string}`,
  },
  // USDT0: {
  //   name: "aiUSDT0",
  //   symbol: "USDT0",
  //   yieldAllocatorVaultAddress:
  //     "0x900759fC4d5bdBa2d849bF9A8Af55BB06A54aCd5" as `0x${string}`,
  //   aiAgentAddress:
  //     "0x51Ca397bf3dBFCeFfAeA0fb9eD4F55f379Ca5169" as `0x${string}`,
  //   whitelistRegisteryAddress:
  //     "0x91cbFcd28fAE1940FE32AB6dB7A28649a8986F21" as `0x${string}`,
  //   assetTokenAddress:
  //     "0xB8CE59FC3717ada4C02eaDF9682A9e934F625ebb" as `0x${string}`,
  // },
} as const;

export type VaultType = keyof typeof VAULTS;
export const VAULT_TYPES = Object.keys(VAULTS) as VaultType[];

export const YIELD_ALLOCATOR_VAULT_ADDRESS =
  VAULTS.USDC.yieldAllocatorVaultAddress;
export const WHITELIST_REGISTERY_ADDRESS =
  VAULTS.USDC.whitelistRegisteryAddress;
export const AIAGENT_ADDRESS = VAULTS.USDC.aiAgentAddress;
export const ASSET_TOKEN_ADDRESS = VAULTS.USDC.assetTokenAddress;
