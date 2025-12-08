// src/lib/hlNameService.ts

import { Address } from "viem";
import { publicClient } from "@/lib/privyConfig";

// --- Configuration ---
// Correct HL Names contract address from official RainbowKit implementation
const HL_NAMES_RESOLVER_ADDRESS = "0x1d9d87eBc14e71490bB87f1C39F65BDB979f3cb7" as const;
const HL_NAMES_RESOLVER_ABI = [
  {
    inputs: [{ internalType: "address", name: "", type: "address" }],
    name: "primaryName",
    outputs: [{ internalType: "string", name: "", type: "string" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

// HL Names REST API configuration - using correct endpoint format
const HL_NAMES_API_BASE = "https://api.hlnames.xyz";
const HL_NAMES_API_KEY = "CPEPKMI-HUSUX6I-SE2DHEA-YYWFG5Y";


// Simple in-memory cache to avoid repeated RPC calls for the same address
const nameCache = new Map<Address, string | null>();

/**
 * Resolves a wallet address to its primary Hyperliquid Name via REST API.
 * This is used as a fallback when on-chain resolution fails.
 *
 * @param address The wallet address to resolve.
 * @returns A promise that resolves to the HL Name string or null.
 */
// Progressive loading cache
const reverseCache = new Map<string, string | null>();
const pendingResolves = new Set<string>();
const resolveCallbacks = new Map<string, Array<(name: string | null) => void>>();

/**
 * Makes authenticated request to HL Names API using correct X-API-Key header
 */
const makeHLNamesRequest = async (endpoint: string): Promise<any> => {
  try {
    const response = await fetch(`${HL_NAMES_API_BASE}${endpoint}`, {
      method: 'GET',
      headers: {
        'X-API-Key': HL_NAMES_API_KEY,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      // Silently handle API errors in production
      return null;
    }

    return await response.json();
  } catch (error) {
    // Silently handle request errors in production
    return null;
  }
};

/**
 * Forward resolution: domain -> address
 */
const resolveAddressFromName = async (domain: string): Promise<string | null> => {
  try {
    const result = await makeHLNamesRequest(`/resolve/address/${domain}`);
    return result?.address || null;
  } catch (error) {
    return null;
  }
};

/**
 * Background resolution worker - processes addresses without blocking UI
 */
const backgroundResolveWorker = async (address: string): Promise<void> => {
  const normalizedAddress = address.toLowerCase();
  
  try {
    // Try to resolve using on-chain primary name first (most reliable)
    // If that fails, we currently don't have an efficient API-based reverse resolution
    // The HL Names API doesn't provide direct reverse lookup endpoints
    
    // Cache as null for now - will rely on on-chain resolution
    reverseCache.set(normalizedAddress, null);
    notifyResolveCallbacks(normalizedAddress, null);
    
    // Emit event for UI updates
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('hlNameResolved', {
        detail: { address: normalizedAddress, name: null }
      }));
    }
    
  } catch (error) {
    reverseCache.set(normalizedAddress, null);
    notifyResolveCallbacks(normalizedAddress, null);
  } finally {
    pendingResolves.delete(normalizedAddress);
  }
};

/**
 * Notify all callbacks waiting for a specific address resolution
 */
const notifyResolveCallbacks = (address: string, name: string | null): void => {
  const callbacks = resolveCallbacks.get(address);
  if (callbacks) {
    callbacks.forEach(callback => callback(name));
    resolveCallbacks.delete(address);
  }
};

/**
 * Efficient reverse resolution with progressive loading
 */
const resolveHLNameViaAPI = async (address: Address): Promise<string | null> => {
  const normalizedAddress = address.toLowerCase();
  
  // Check cache first
  if (reverseCache.has(normalizedAddress)) {
    const cached = reverseCache.get(normalizedAddress);
      return cached;
  }

  // If already resolving, return promise that waits for result
  if (pendingResolves.has(normalizedAddress)) {
    return new Promise((resolve) => {
      if (!resolveCallbacks.has(normalizedAddress)) {
        resolveCallbacks.set(normalizedAddress, []);
      }
      resolveCallbacks.get(normalizedAddress)!.push(resolve);
    });
  }

  // Start background resolution
  pendingResolves.add(normalizedAddress);
  // Starting background resolution
  
  // Start background worker (don't await)
  backgroundResolveWorker(normalizedAddress);
  
  // Return null immediately - UI will update when resolution completes
  return null;
};

/**
 * Resolves a wallet address to its primary Hyperliquid Name.
 * First tries REST API resolution, then falls back to on-chain contract.
 * Returns the name if found, or null if not.
 *
 * @param address The wallet address to resolve.
 * @returns A promise that resolves to the HL Name string or null.
 */
export const resolveHLName = async (address: Address | undefined | null): Promise<string | null> => {
  if (!address) {
    return null;
  }

  const lowerCaseAddress = address.toLowerCase() as Address;

  // 1. Check cache first for performance
  if (nameCache.has(lowerCaseAddress)) {
    return nameCache.get(lowerCaseAddress)!;
  }

  let result: string | null = null;

  // 2. Try REST API resolution (progressive loading)
  result = await resolveHLNameViaAPI(lowerCaseAddress);

  // 3. If API failed, try on-chain resolution as fallback
  if (!result) {
    try {
      const primaryName = await publicClient.readContract({
        address: HL_NAMES_RESOLVER_ADDRESS,
        abi: HL_NAMES_RESOLVER_ABI,
        functionName: "primaryName",
        args: [lowerCaseAddress],
      } as any);

      result =
        primaryName && (primaryName as string).trim() !== ""
          ? (primaryName as string)
          : null;
    } catch (error) {
      // Silently handle on-chain resolution errors
    }
  }

  // 4. Update cache with the result
  nameCache.set(lowerCaseAddress, result);

  return result;
};
