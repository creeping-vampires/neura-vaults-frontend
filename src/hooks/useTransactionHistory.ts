import { useState, useEffect, useCallback } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { useLocation } from "react-router-dom";

export interface Transaction {
  id: string;
  transaction_type: "DEPOSIT" | "WITHDRAW";
  status: "SUCCESS";
  pool_address: string;
  amount_formatted: string;
  transaction_hash: string;
  execution_timestamp: string;
  created_at: string;
  blockNumber: bigint;
  assets: bigint;
  shares: bigint;
  sender: string;
  receiver: string;
}

let transactionsCache: Transaction[] | null = null;

export const useTransactionHistory = () => {
  const { authenticated } = usePrivy();
  const location = useLocation();
  const [transactions, setTransactions] = useState<Transaction[]>(
    transactionsCache || []
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasFetched, setHasFetched] = useState(false);

  // const fetchTransactionHistory = useCallback(async () => {
  //   if (!authenticated) {
  //     return;
  //   }

  //   if (!transactionsCache || transactionsCache.length === 0) {
  //     setIsLoading(true);
  //   }
  //   setError(null);

  //   try {
  //     const data = await apiGet<Transaction[]>(
  //       API_ROUTES.GET_REBALANCING_TRADES,
  //       {} // Fetch all transactions without filtering by status or type
  //     );

  //     transactionsCache = data;
  //     setTransactions(data);
  //     setHasFetched(true);
  //   } catch (e: any) {
  //     setError(e.message || "An unknown error occurred");
  //   } finally {
  //     setIsLoading(false);
  //   }
  // }, [authenticated]);

  const clearTransactions = useCallback(() => {
    setTransactions([]);
    setHasFetched(false);
  }, []);

  // Auto-load transaction history when on vault details page
  useEffect(() => {
    const isVaultDetailsPage = /^\/vaults\/[^/]+$/.test(location.pathname);

    if (isVaultDetailsPage && authenticated && !hasFetched) {
      // fetchTransactionHistory();
    }
  }, [location.pathname, authenticated, hasFetched]);

  return {
    transactions,
    isLoading,
    error,
    // refreshHistory: fetchTransactionHistory,
    hasFetched,
    clearTransactions,
  };
};