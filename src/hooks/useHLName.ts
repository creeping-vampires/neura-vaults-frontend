// src/hooks/useHLName.ts

import { useState, useEffect } from "react";
import { Address } from "viem";
import { resolveHLName } from "@/lib/hlNameService";

interface UseHLNameResult {
  hlName: string | null;
  isLoading: boolean;
}

/**
 * React hook to resolve and manage HL Name state for a given address.
 * Handles progressive loading and background resolution updates.
 * 
 * @param address The wallet address to resolve
 * @returns Object containing hlName and isLoading state
 */
export const useHLName = (address: Address | undefined | null): UseHLNameResult => {
  const [hlName, setHlName] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!address) {
      setIsLoading(false);
      setHlName(null);
      return;
    }

    let isMounted = true;
    setIsLoading(true);

    const fetchName = async () => {
      const name = await resolveHLName(address);
      if (isMounted) {
        setHlName(name);
        setIsLoading(false);
      }
    };

    // Listen for background resolution updates
    const handleHLNameResolved = (event: CustomEvent) => {
      if (event.detail.address === address.toLowerCase() && isMounted) {
        setHlName(event.detail.name);
        setIsLoading(false);
      }
    };

    // Add event listener for background updates
    if (typeof window !== 'undefined') {
      window.addEventListener('hlNameResolved', handleHLNameResolved as EventListener);
    }

    fetchName();

    return () => {
      isMounted = false;
      if (typeof window !== 'undefined') {
        window.removeEventListener('hlNameResolved', handleHLNameResolved as EventListener);
      }
    };
  }, [address]);

  return { hlName, isLoading };
};
