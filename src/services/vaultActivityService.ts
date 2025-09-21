import { apiGet } from './config';
import {
  API_ROUTES,
  VaultTransaction,
  DepositsRequest,
  WithdrawalsRequest,
  RebalancesRequest,
  VaultDepositsResponse,
  VaultWithdrawalsResponse,
  VaultRebalancesResponse,
  VaultDeposit,
  VaultWithdrawal,
  VaultRebalance,
} from "./config";

export interface VaultActivity {
  id: string;
  type: "deposit" | "withdrawal" | "rebalance";
  status: "success" | "failed" | "skipped" | "completed" | "pending";
  processed_count: number;
  created_at: string;
  transactions: VaultTransaction[];
  // Specific fields for deposits
  asset_symbol?: string;
  asset_decimals?: number;
  total_assets_to_deposit?: number;
  // Specific fields for rebalances
  from_protocol?: string;
  to_protocol?: string;
  amount_token?: string;
  strategy_summary?: string;
}

export const fetchVaultDeposits = async (): Promise<VaultDepositsResponse> => {
  return apiGet<VaultDepositsResponse>(`${API_ROUTES.GET_VAULT_DEPOSITS}`);
};

export const fetchVaultWithdrawals =
  async (): Promise<VaultWithdrawalsResponse> => {
    return apiGet<VaultWithdrawalsResponse>(
      `${API_ROUTES.GET_VAULT_WITHDRAWALS}`
    );
  };

export const fetchVaultRebalances =
  async (): Promise<VaultRebalancesResponse> => {
    return apiGet<VaultRebalancesResponse>(
      `${API_ROUTES.GET_VAULT_REBALANCES}`
    );
  };

const transformRebalanceToActivity = (
  rebalance: VaultRebalance
): VaultActivity => {
  const transactions: VaultTransaction[] = [
    {
      id: rebalance.withdrawal_transaction.id,
      transaction_hash: rebalance.withdrawal_transaction.transaction_hash,
      gas_used: rebalance.withdrawal_transaction.gas_used,
      status:
        rebalance.withdrawal_transaction.status === "completed"
          ? "success"
          : (rebalance.withdrawal_transaction.status as
              | "success"
              | "failed"
              | "skipped"),
      created_at: rebalance.withdrawal_transaction.created_at,
    },
    {
      id: rebalance.deposit_transaction.id,
      transaction_hash: rebalance.deposit_transaction.transaction_hash,
      gas_used: rebalance.deposit_transaction.gas_used,
      status:
        rebalance.deposit_transaction.status === "completed"
          ? "success"
          : (rebalance.deposit_transaction.status as
              | "success"
              | "failed"
              | "skipped"),
      created_at: rebalance.deposit_transaction.created_at,
    },
  ];

  return {
    id: `rebalance-${rebalance.rebalance_id}`,
    type: "rebalance" as const,
    status:
      rebalance.status === "completed"
        ? "success"
        : (rebalance.status as
            | "success"
            | "failed"
            | "skipped"
            | "completed"
            | "pending"),
    processed_count: 1, // Rebalances are single operations
    created_at: rebalance.created_at,
    transactions,
    from_protocol: rebalance.from_protocol,
    to_protocol: rebalance.to_protocol,
    amount_token: rebalance.amount_token,
    strategy_summary: rebalance.strategy_summary,
    asset_symbol: rebalance.token_symbol,
    asset_decimals: rebalance.token_decimals,
  };
};

export const fetchVaultActivities = async (
  vaultAddress: string
): Promise<VaultActivity[]> => {
  try {
    const [depositsResponse, withdrawalsResponse, rebalancesResponse] =
      await Promise.all([
        fetchVaultDeposits(),
        fetchVaultWithdrawals(),
        fetchVaultRebalances(),
      ]);

    const depositActivities: VaultActivity[] = depositsResponse.map(
      (deposit) => ({
        id: `deposit-${deposit.id}`,
        type: "deposit" as const,
        status: deposit.status,
        processed_count: deposit.processed_count,
        total_assets_to_deposit: deposit.total_assets_to_deposit,
        asset_symbol: deposit.asset_symbol,
        asset_decimals: deposit.asset_decimals,
        created_at: deposit.created_at,
        transactions: deposit.transactions,
      })
    );

    const withdrawalActivities: VaultActivity[] = withdrawalsResponse.map(
      (withdrawal) => ({
        id: `withdrawal-${withdrawal.id}`,
        type: "withdrawal" as const,
        status: withdrawal.status,
        processed_count: withdrawal.processed_count,
        created_at: withdrawal.created_at,
        transactions: withdrawal.transactions,
      })
    );

    const rebalanceActivities: VaultActivity[] = rebalancesResponse.map(
      transformRebalanceToActivity
    );

    // Combine and sort by creation time (newest first)
    const allActivities = [
      ...depositActivities,
      ...withdrawalActivities,
      ...rebalanceActivities,
    ];
    return allActivities.sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  } catch (error) {
    console.error("Error fetching vault activities:", error);
    throw error;
  }
};