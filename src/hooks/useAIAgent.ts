import { useState, useCallback } from "react";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import { useWalletClient } from "wagmi";
import { parseUnits, formatUnits, parseAbi } from "viem";
import { hyperliquid, publicClient } from "@/lib/privyConfig";
import { AIAGENT_ADDRESS } from "@/utils/constant";
import AIAgentABI from "@/utils/abis/AIAgent.json";
import { switchToChain } from "@/lib/utils";

export const useAIAgent = () => {
  const { authenticated, user } = usePrivy();
  const { data: wagmiWalletClient } = useWalletClient();

  const [isExecuting, setIsExecuting] = useState(false);
  const [transactionHash, setTransactionHash] = useState<string | null>(null);
  const [agentData, setAgentData] = useState({
    totalPendingWithdrawals: 0,
    isLoading: true,
    error: null as string | null,
  });

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

  const checkTotalWithdrawalRequests = useCallback(async () => {
    try {
      setAgentData((prev) => ({ ...prev, isLoading: true, error: null }));

      const agentContract = {
        address: AIAGENT_ADDRESS as `0x${string}`,
        abi: AIAgentABI,
      } as const;

      const totalNeeded = await publicClient.readContract({
        ...agentContract,
        functionName: "checkWithdrawalRequests",
      });

      const totalPendingFormatted = Number(
        formatUnits(totalNeeded as bigint, 18)
      );

      setAgentData({
        totalPendingWithdrawals: totalPendingFormatted,
        isLoading: false,
        error: null,
      });

      return totalPendingFormatted;
    } catch (error) {
      console.error("Error checking total withdrawal requests:", error);
      setAgentData((prev) => ({
        ...prev,
        isLoading: false,
        error: "Failed to check withdrawal requests",
      }));
      return 0;
    }
  }, []);

  const fulfillWithdrawalRequests = useCallback(async () => {
    const walletClient = await getWalletClient();
    if (!walletClient || !userAddress) {
      throw new Error("Wallet not connected");
    }

    try {
      const chainSwitched = await switchToChain();
      if (!chainSwitched) {
        throw new Error('Failed to switch to Hyper EVM chain');
      }
      setIsExecuting(true);
      setTransactionHash(null);

      const fulfillGas = await publicClient.estimateContractGas({
        address: AIAGENT_ADDRESS as `0x${string}`,
        abi: AIAgentABI,
        functionName: "fulfillWithdrawalRequests",
        args: [],
        account: userAddress as `0x${string}`,
      });

      const fulfillTx = await walletClient.writeContract({
        address: AIAGENT_ADDRESS as `0x${string}`,
        abi: AIAgentABI,
        functionName: "fulfillWithdrawalRequests",
        args: [],
        chain: hyperliquid,
        account: userAddress as `0x${string}`,
        gas: (fulfillGas * 200n) / 100n,
      });

      setTransactionHash(fulfillTx);

      await publicClient.waitForTransactionReceipt({ hash: fulfillTx });

      await checkTotalWithdrawalRequests();

      return fulfillTx;
    } catch (error) {
      console.error("Fulfill withdrawal requests failed:", error);
      throw error;
    } finally {
      setIsExecuting(false);
    }
  }, [userAddress, checkTotalWithdrawalRequests]);

  const depositToPool = useCallback(
    async (poolAddress: string, amount: string) => {
      const walletClient = await getWalletClient();
      if (!walletClient || !userAddress) {
        throw new Error("Wallet not connected");
      }

      try {
        const chainSwitched = await switchToChain();
        if (!chainSwitched) {
          throw new Error('Failed to switch to Hyper EVM chain');
        }
        setIsExecuting(true);
        setTransactionHash(null);

        const amountBigInt = parseUnits(amount, 18);

        const depositGas = await publicClient.estimateContractGas({
          address: AIAGENT_ADDRESS as `0x${string}`,
          abi: AIAgentABI,
          functionName: "depositToPool",
          args: [],
          account: userAddress as `0x${string}`,
        });

        const depositTx = await walletClient.writeContract({
          address: AIAGENT_ADDRESS as `0x${string}`,
          abi: AIAgentABI,
          functionName: "depositToPool",
          args: [poolAddress as `0x${string}`, amountBigInt],
          chain: hyperliquid,
          account: userAddress as `0x${string}`,
          gas: (depositGas * 200n) / 100n,
        });

        setTransactionHash(depositTx);

        await publicClient.waitForTransactionReceipt({ hash: depositTx });

        return depositTx;
      } catch (error) {
        console.error("Deposit to pool failed:", error);
        throw error;
      } finally {
        setIsExecuting(false);
      }
    },
    [userAddress]
  );

  const withdrawFromPool = useCallback(
    async (poolAddress: string, amount: string) => {
      const walletClient = await getWalletClient();
      if (!walletClient || !userAddress) {
        throw new Error("Wallet not connected");
      }

      try {
        const chainSwitched = await switchToChain();
        if (!chainSwitched) {
          throw new Error('Failed to switch to Hyper EVM chain');
        }
        setIsExecuting(true);
        setTransactionHash(null);

        const amountBigInt = parseUnits(amount, 18);

        const withdrawGas = await publicClient.estimateContractGas({
          address: AIAGENT_ADDRESS as `0x${string}`,
          abi: AIAgentABI,
          functionName: "withdrawFromPool",
          args: [],
          account: userAddress as `0x${string}`,
        });
        const withdrawTx = await walletClient.writeContract({
          address: AIAGENT_ADDRESS as `0x${string}`,
          abi: AIAgentABI,
          functionName: "withdrawFromPool",
          args: [poolAddress as `0x${string}`, amountBigInt],
          chain: hyperliquid,
          account: userAddress as `0x${string}`,
          gas: (withdrawGas * 200n) / 100n,
        });

        setTransactionHash(withdrawTx);

        await publicClient.waitForTransactionReceipt({ hash: withdrawTx });

        return withdrawTx;
      } catch (error) {
        console.error("Withdraw from pool failed:", error);
        throw error;
      } finally {
        setIsExecuting(false);
      }
    },
    [userAddress]
  );

  const hasExecutorRole = useCallback(async () => {
    if (!userAddress) return false;

    try {
      const agentContract = {
        address: AIAGENT_ADDRESS as `0x${string}`,
        abi: AIAgentABI,
      } as const;

      const executorRole = await publicClient.readContract({
        ...agentContract,
        functionName: "EXECUTOR",
      });

      const hasRole = await publicClient.readContract({
        ...agentContract,
        functionName: "hasRole",
        args: [executorRole, userAddress as `0x${string}`],
      });

      return Boolean(hasRole);
    } catch (error) {
      console.error("Error checking executor role:", error);
      return false;
    }
  }, [userAddress]);

  const claimAndReinvest = useCallback(
    async (poolAddress: string) => {
      const walletClient = await getWalletClient();
      if (!walletClient || !userAddress) {
        throw new Error("Wallet not connected");
      }

      try {
        const chainSwitched = await switchToChain();
        if (!chainSwitched) {
          throw new Error('Failed to switch to Hyper EVM chain');
        }
        setIsExecuting(true);
        setTransactionHash(null);

        const claimGas = await publicClient.estimateContractGas({
          address: AIAGENT_ADDRESS as `0x${string}`,
          abi: AIAgentABI,
          functionName: "claimAndReinvest",
          args: [],
          account: userAddress as `0x${string}`,
        });
        const claimTx = await walletClient.writeContract({
          address: AIAGENT_ADDRESS as `0x${string}`,
          abi: AIAgentABI,
          functionName: "claimAndReinvest",
          args: [poolAddress as `0x${string}`],
          chain: hyperliquid,
          account: userAddress as `0x${string}`,
          gas: (claimGas * 200n) / 100n,
        });

        setTransactionHash(claimTx);

        await publicClient.waitForTransactionReceipt({ hash: claimTx });

        return claimTx;
      } catch (error) {
        console.error("Claim and reinvest failed:", error);
        throw error;
      } finally {
        setIsExecuting(false);
      }
    },
    [userAddress]
  );

  const fulfillAllWithdrawalRequests = useCallback(async () => {
    const walletClient = await getWalletClient();
    if (!walletClient || !userAddress) {
      throw new Error("Wallet not connected");
    }

    try {
      const chainSwitched = await switchToChain();
      if (!chainSwitched) {
        throw new Error('Failed to switch to Hyper EVM chain');
      }
      setIsExecuting(true);
      setTransactionHash(null);

      const fulfillAllGas = await publicClient.estimateContractGas({
        address: AIAGENT_ADDRESS as `0x${string}`,
        abi: AIAgentABI,
        functionName: "fulfillAllWithdrawalRequests",
        args: [],
        account: userAddress as `0x${string}`,
      });

      const fulfillAllTx = await walletClient.writeContract({
        address: AIAGENT_ADDRESS as `0x${string}`,
        abi: AIAgentABI,
        functionName: "fulfillAllWithdrawalRequests",
        args: [],
        chain: hyperliquid,
        account: userAddress as `0x${string}`,
        gas: (fulfillAllGas * 200n) / 100n,
      });

      setTransactionHash(fulfillAllTx);

      await publicClient.waitForTransactionReceipt({ hash: fulfillAllTx });

      await checkTotalWithdrawalRequests();

      return fulfillAllTx;
    } catch (error) {
      console.error("Fulfill all withdrawal requests failed:", error);
      throw error;
    } finally {
      setIsExecuting(false);
    }
  }, [userAddress, checkTotalWithdrawalRequests]);

  return {
    agentData,
    checkTotalWithdrawalRequests,
    fulfillWithdrawalRequests,
    fulfillAllWithdrawalRequests,
    depositToPool,
    withdrawFromPool,
    claimAndReinvest,
    hasExecutorRole,
    isExecuting,
    transactionHash,
  };
};
