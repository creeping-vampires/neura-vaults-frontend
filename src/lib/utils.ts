import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { publicClient } from "./privyConfig";
import { formatUnits, parseAbi } from "viem";
import { explorerUrl } from "@/utils/constant";
import { ethers } from "ethers";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function isEqual(obj1: any, obj2: any): boolean {
  if (obj1 === obj2) return true;

  if (typeof obj1 !== 'object' || obj1 === null || typeof obj2 !== 'object' || obj2 === null) {
    return false;
  }

  const keys1 = Object.keys(obj1);
  const keys2 = Object.keys(obj2);

  if (keys1.length !== keys2.length) return false;

  for (const key of keys1) {
    if (!keys2.includes(key) || !isEqual(obj1[key], obj2[key])) {
      return false;
    }
  }

  return true;
}

export const formatToken = (
  amount: number | string,
  tokenSymbol: string
): string => {
  const numAmount = Number(amount);
  if (isNaN(numAmount)) return "0";
  return tokenSymbol === "uBTC" ? numAmount.toFixed(9) : numAmount.toFixed(4);
};

export const fetchTokenBalance = async (
  tokenAddress: string,
  walletAddress: string,
  decimalsOverride?: number
) => {
  try {
    const value = await publicClient.readContract({
      address: tokenAddress as `0x${string}`,
      abi: parseAbi(["function balanceOf(address) view returns (uint256)"]),
      functionName: "balanceOf",
      args: [walletAddress as `0x${string}`],
    });
    const decimals = decimalsOverride ?? 6;
    return Number(formatUnits(value as bigint, decimals));
  } catch (error) {
    console.error(`Error fetching balance for token ${tokenAddress}:`, error);
    return 0;
  }
};

export const fetchHypeBalance = async (walletAddress: string) => {
  try {
    const value = await publicClient.getBalance({
      address: walletAddress as `0x${string}`,
    });
    return Number(formatUnits(value, 18));
  } catch (error) {
    console.error(`Error fetching balance for token ${walletAddress}:`, error);
    return 0;
  }
};

export const formatAddress = (address: string): string => {
  if (!address) return '';
  return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
};

export const formatTradingSystem = (tradingSystem: string): string => {
  if (!tradingSystem) return "N/A";
  
  return tradingSystem
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

export const getExplorerUrl = (path: string = ''): string => {
  return `${explorerUrl}${path}`;
};

export const getExplorerTxUrl = (txHash: string): string => {
  return `${explorerUrl}/tx/${txHash}`;
};

export const getExplorerAddressUrl = (address: string): string => {
  return `${explorerUrl}/address/${address}`;
};

  export const switchToChain = async (): Promise<boolean> => {
    if (!window.ethereum) {
      console.warn('No ethereum provider found');
      return false;
    }

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      
      await provider.send("wallet_switchEthereumChain", [
        { chainId: "0x3e7" } 
      ]);
      
      console.log('Successfully switched to Hyper EVM chain');
      return true;
    } catch (error: any) {
      // Chain not added to wallet, try to add it
      if (error.code === 4902) {
        try {
          const provider = new ethers.BrowserProvider(window.ethereum);
          await provider.send("wallet_addEthereumChain", [
            {
              chainId: "0x3e7",
              chainName: "Hyper EVM",
              rpcUrls: ["https://rpc.hyperliquid.xyz/evm"],
              nativeCurrency: {
                name: "HYPE",
                symbol: "HYPE",
                decimals: 18,
              },
              blockExplorerUrls: [explorerUrl],
            },
          ]);
          
          console.log('Successfully added and switched to Hyper EVM chain');
          return true;
        } catch (addError: any) {
          console.error("Failed to add Hyper EVM chain:", addError);
          throw new Error(`Failed to add Hyper EVM chain: ${addError.message || 'Unknown error'}`);
        }
      } else if (error.code === 4001) {
        throw new Error('User rejected chain switch request');
      } else {
        console.error("Failed to switch to Hyper EVM chain:", error);
        throw new Error(`Failed to switch to Hyper EVM chain: ${error.message || 'Unknown error'}`);
      }
    }
  };

  