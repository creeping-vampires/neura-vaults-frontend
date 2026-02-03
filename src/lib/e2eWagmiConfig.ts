/**
 * E2E Testing Wagmi Configuration
 *
 * This configuration uses @wonderland/walletless for wallet operations
 * while fetching real data from Hyper EVM mainnet.
 * 
 * - Wallet operations (signing): Uses walletless with local Anvil
 * - Data fetching (reads): Uses Hyper EVM mainnet RPC
 */
import { createE2EProvider, e2eConnector, setSigningAccount } from '@wonderland/walletless';
import { createConfig, http } from 'wagmi';
import { defineChain } from 'viem';

const MAINNET_LOCAL_RPC = "http://localhost:8545";

// Define Hyper EVM mainnet chain
export const hyperliquid = defineChain({
  id: 999,
  name: "Hyper EVM",
  network: "hyper evm",
  nativeCurrency: { decimals: 18, name: "HYPE", symbol: "HYPE" },
  rpcUrls: { default: { http: [MAINNET_LOCAL_RPC] } },
  blockExplorers: {
    default: {
      name: "Explorer",
      url: MAINNET_LOCAL_RPC,
    },
  },
});


// Create provider for wallet operations (uses mainnet RPC for chain data)
export const e2eProvider = createE2EProvider({
  chains: [hyperliquid],
  rpcUrls: {
    [hyperliquid.id]: MAINNET_LOCAL_RPC, // Use mainnet for RPC calls
  },
  debug: import.meta.env.DEV,
});

// Switch by raw private key
setSigningAccount(e2eProvider, "0x1f26d994fc05f20f37b865a0482e974f2554502d6f343005acf501036193dd9a");
// setSigningAccount(e2eProvider, "0x9929f2aa3d1ee8dc086466bba2448cbdf06d869c1c95e5dbe722eda5196bbe8f");


// Create the E2E connector
const e2eWalletConnector = e2eConnector({
  provider: e2eProvider,
});

// Wagmi config for E2E testing - uses mainnet for data fetching
export const e2eWagmiConfig = createConfig({
  chains: [hyperliquid],
  connectors: [e2eWalletConnector],
  transports: {
    // Use mainnet RPC for all chain data fetching (vault data, balances, etc.)
    [hyperliquid.id]: http(MAINNET_LOCAL_RPC),
  },
});

/**
 * Connect to the E2E test wallet
 * This replaces the Privy login in E2E mode
 */
export async function connectE2EWallet(): Promise<{ address: `0x${string}` }> {
  // Get the connector from the config
  const connector = e2eWagmiConfig.connectors[0];

  if (!connector) {
    throw new Error('E2E connector not found');
  }

  // Use the connector's connect method directly
  const result = await connector.connect();

  if (!result.accounts || result.accounts.length === 0) {
    throw new Error('No accounts returned from E2E wallet');
  }

  return { address: result.accounts[0] };
}

/**
 * Check if E2E mode is enabled
 */
export function isE2EMode(): boolean {
  return import.meta.env.VITE_E2E_MODE === 'true';
}
