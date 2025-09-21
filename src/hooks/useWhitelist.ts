import { useState, useCallback, useMemo } from 'react';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { useWalletClient } from 'wagmi';
import { hyperliquid, publicClient } from '@/lib/privyConfig';
import { WHITELIST_REGISTERY_ADDRESS } from "@/utils/constant";
import WhitelistRegistryABI from "@/utils/abis/WhitelistRegistery.json";
import { switchToChain } from "@/lib/utils";

export const useWhitelist = () => {
  const { authenticated, user } = usePrivy();
  const { data: wagmiWalletClient } = useWalletClient();

  const [isTransacting, setIsTransacting] = useState(false);
  const [transactionHash, setTransactionHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { wallets } = useWallets();
  // Get active wallet based on login method
  const hasEmailLogin = user?.linkedAccounts?.some(
    (account) => account.type === "email"
  );
  const hasWalletLogin = user?.linkedAccounts?.some(
    (account) => account.type === "wallet"
  );

  // Prioritize embedded wallet for email login, external wallet for wallet login
  const wallet = hasEmailLogin
    ? wallets.find((w) => w.walletClientType === "privy")
    : wallets.find((w) => w.walletClientType !== "privy");

  const userAddress = wallet?.address;

  const getWalletClient = async () => {
    // Check user's login method to prioritize wallet type
    const hasEmailLogin = user?.linkedAccounts?.some(
      (account) => account.type === "email"
    );
    const hasWalletLogin = user?.linkedAccounts?.some(
      (account) => account.type === "wallet"
    );

    // If user logged in with email, prioritize embedded wallet (Privy)
    if (hasEmailLogin && wallet) {
      const provider = await wallet.getEthereumProvider();
      const { createWalletClient, custom } = await import("viem");
      return createWalletClient({
        chain: hyperliquid,
        transport: custom(provider),
      });
    }

    // If user logged in with wallet, prioritize external wallet (Wagmi)
    if (hasWalletLogin && wagmiWalletClient) {
      return wagmiWalletClient;
    }

    // Fallback: use embedded wallet if available, otherwise external wallet
    if (wallet) {
      const provider = await wallet.getEthereumProvider();
      const { createWalletClient, custom } = await import("viem");
      return createWalletClient({
        chain: hyperliquid,
        transport: custom(provider),
      });
    }

    return wagmiWalletClient;
  };

  const hasAdminRole = useCallback(async () => {
    if (!userAddress) return false;

    try {
      const whitelistContract = {
        address: WHITELIST_REGISTERY_ADDRESS as `0x${string}`,
        abi: WhitelistRegistryABI,
      } as const;

      const adminRole = await publicClient.readContract({
        ...whitelistContract,
        functionName: "DEFAULT_ADMIN_ROLE",
      });

      const hasRole = await publicClient.readContract({
        ...whitelistContract,
        functionName: "hasRole",
        args: [adminRole, userAddress as `0x${string}`],
      });

      return Boolean(hasRole);
    } catch (error) {
      console.error("Error checking admin role:", error);
      return false;
    }
  }, [userAddress]);

  const hasGovernorRole = useCallback(async () => {
    if (!userAddress) return false;

    try {
      const whitelistContract = {
        address: WHITELIST_REGISTERY_ADDRESS as `0x${string}`,
        abi: WhitelistRegistryABI,
      } as const;

      const governorRole = await publicClient.readContract({
        ...whitelistContract,
        functionName: "GOVERNOR",
      });

      const hasRole = await publicClient.readContract({
        ...whitelistContract,
        functionName: "hasRole",
        args: [governorRole, userAddress as `0x${string}`],
      });

      return Boolean(hasRole);
    } catch (error) {
      console.error("Error checking governor role:", error);
      return false;
    }
  }, [userAddress]);

  const setPool = useCallback(
    async (poolAddress: string, allowed: boolean) => {
      const walletClient = await getWalletClient();
      if (!walletClient || !userAddress) {
        throw new Error("Wallet not connected");
      }

      try {
        const chainSwitched = await switchToChain();
        if (!chainSwitched) {
          throw new Error('Failed to switch to Hyper EVM chain');
        }
        setIsTransacting(true);
        setTransactionHash(null);
        setError(null);

        const setPoolTx = await walletClient.writeContract({
          address: WHITELIST_REGISTERY_ADDRESS as `0x${string}`,
          abi: WhitelistRegistryABI,
          functionName: "setPool",
          args: [poolAddress as `0x${string}`, allowed],
          chain: hyperliquid,
          account: userAddress as `0x${string}`,
        });

        setTransactionHash(setPoolTx);

        await publicClient.waitForTransactionReceipt({ hash: setPoolTx });

        return setPoolTx;
      } catch (error: any) {
        console.error("Set pool failed:", error);
        setError(error?.shortMessage || error?.message || "Transaction failed");
        throw error;
      } finally {
        setIsTransacting(false);
      }
    },
    [userAddress]
  );

  const isPoolWhitelisted = useCallback(async (poolAddress: string) => {
    try {
      const isWhitelisted = await publicClient.readContract({
        address: WHITELIST_REGISTERY_ADDRESS as `0x${string}`,
        abi: WhitelistRegistryABI,
        functionName: "isWhitelisted",
        args: [poolAddress as `0x${string}`],
      });

      return Boolean(isWhitelisted);
    } catch (error) {
      console.error("Error checking pool whitelist status:", error);
      return false;
    }
  }, []);

  const getWhitelistedPools = useCallback(async () => {
    try {
      const pools = await publicClient.readContract({
        address: WHITELIST_REGISTERY_ADDRESS as `0x${string}`,
        abi: WhitelistRegistryABI,
        functionName: "getWhitelistedPools",
      });

      return (pools as string[]) || [];
    } catch (error) {
      console.error("Error fetching whitelisted pools:", error);
      return [];
    }
  }, []);

  return useMemo(
    () => ({
      hasAdminRole,
      hasGovernorRole,
      setPool,
      isPoolWhitelisted,
      getWhitelistedPools,
      isTransacting,
      transactionHash,
      error,
    }),
    [
      hasAdminRole,
      hasGovernorRole,
      setPool,
      isPoolWhitelisted,
      getWhitelistedPools,
      isTransacting,
      transactionHash,
      error,
    ]
  );
};