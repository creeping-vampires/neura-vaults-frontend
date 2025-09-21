import { useMemo } from 'react';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { Address } from 'viem';

export interface ActiveWalletInfo {
  wallet: any | undefined;
  userAddress: Address | undefined;
  hasEmailLogin: boolean;
  hasWalletLogin: boolean;
  isPrivyWallet: boolean;
}

export const useActiveWallet = (): ActiveWalletInfo => {
  const { user } = usePrivy();
  const { wallets } = useWallets();

  return useMemo(() => {
    // Check if user has email login
    const hasEmailLogin = user?.linkedAccounts?.some(
      (account) => account.type === "email"
    ) ?? false;

    // Check if user has wallet login
    const hasWalletLogin = user?.linkedAccounts?.some(
      (account) => account.type === "wallet"
    ) ?? false;

    // Get active wallet based on login method
    const wallet = hasEmailLogin
      ? wallets.find((w) => w.walletClientType === "privy")
      : wallets.find((w) => w.walletClientType !== "privy");

    // Get user address from active wallet
    const userAddress = wallet?.address as Address | undefined;

    // Check if the active wallet is a Privy wallet
    const isPrivyWallet = wallet?.walletClientType === "privy";

    return {
      wallet,
      userAddress,
      hasEmailLogin,
      hasWalletLogin,
      isPrivyWallet,
    };
  }, [user?.linkedAccounts, wallets]);
};