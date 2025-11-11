import { useEffect, useMemo } from 'react';
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


  useEffect(() => {
    // console.log("Wallet state: ", { user, wallets });
    
    // Additional check for MetaMask connection when user has a linked wallet
    if (user?.linkedAccounts?.some(account => account.type === "wallet")) {
      const checkMetaMaskConnection = async () => {
        if (window.ethereum) {
          try {
            const accounts = await window.ethereum.request({ method: 'eth_accounts' });
            if (accounts.length === 0) {
              console.log("MetaMask not connected but user has a linked wallet");
            }
          } catch (error) {
            console.error("Error checking MetaMask accounts:", error);
          }
        }
      };
      
      checkMetaMaskConnection();
    }
  }, [user?.linkedAccounts, wallets]);

  return useMemo(() => {
    // Check if user has email login
    const hasEmailLogin = user?.linkedAccounts?.some(
      (account) => account.type === "email"
    ) ?? false;



    // Get active wallet based on login method
    const wallet = hasEmailLogin
      ? wallets.find((w) => w.walletClientType === "privy")
      : wallets.find((w) => w.walletClientType !== "privy");

    // Get user address from active wallet
    const userAddress = wallet?.address as Address | undefined;


        // Check if user has wallet login
        const hasWalletLogin = !userAddress ? false : user?.linkedAccounts?.some(
          (account) => account.type === "wallet"
        ) ?? false;

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