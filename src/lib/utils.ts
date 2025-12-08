import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { publicClient } from "./privyConfig";
import { erc20Abi, formatUnits, parseAbi } from "viem";
import { explorerUrl } from "@/utils/constant";
import { hyperliquid } from "./privyConfig";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

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

export function formatAddress(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function getExplorerTxUrl(txHash: string) {
  return `${explorerUrl}/tx/${txHash}`;
}

export function getExplorerAddressUrl(address: string) {
  return `${explorerUrl}/address/${address}`;
}

export const switchToChain = async (): Promise<boolean> => {
  if (!window.ethereum) {
    console.warn("No ethereum provider found");
    return false;
  }

  try {
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: "0x3e7" }],
    });

    // console.log("Successfully switched to Hyper EVM chain");
    return true;
  } catch (error: any) {
    // Chain not added to wallet, try to add it
    if (error.code === 4902) {
      try {
        await window.ethereum.request({
          method: "wallet_addEthereumChain",
          params: [
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
          ],
        });

        // console.log("Successfully added and switched to Hyper EVM chain");
        return true;
      } catch (addError: any) {
        console.error("Failed to add Hyper EVM chain:", addError);
        throw new Error(
          `Failed to add Hyper EVM chain: ${
            addError.message || "Unknown error"
          }`
        );
      }
    } else if (error.code === 4001) {
      throw new Error("User rejected chain switch request");
    } else {
      console.error("Failed to switch to Hyper EVM chain:", error);
      throw new Error(
        `Failed to switch to Hyper EVM chain: ${
          error.message || "Unknown error"
        }`
      );
    }
  }
};

  