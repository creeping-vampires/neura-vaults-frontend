import axios, { AxiosInstance } from "axios";

const API_URL = import.meta.env.VITE_API_URL;
const POINTS_API_URL = import.meta.env.VITE_POINTS_API_URL;
const API_KEY = import.meta.env.VITE_API_KEY;

if (!API_URL) {
  throw new Error("VITE_API_URL environment variable is not defined");
}

if (!POINTS_API_URL) {
  throw new Error("VITE_POINTS_API_URL environment variable is not defined");
}

if (!API_KEY) {
  throw new Error("VITE_API_KEY environment variable is not defined");
}

// Yield Monitor Daily Metrics Types
export interface DailyMetric {
  date: string;
  total_runs: number;
  successful_runs: number;
  total_yield_claimed: string;
  daily_growth_percentage: number;
  average_execution_time: number;
  vault_value_end: string;
}

export interface DailyMetricsResponse {
  daily_data: DailyMetric[];
}

// Add Price Chart Types
export interface ChartPoint {
  timestamp: number | string;
  share_price_formatted: string;
  tvl?: number;
  apy?: number;
  apy7d?: number;
  apy30d?: number;
}

export interface TokenPriceData {
  token: string;
  data: ChartPoint[];
}

export interface ChartResponse {
  chart_data: TokenPriceData[];
}

// Latest price chart types (new endpoint)
export interface LatestChartPoint {
  sharePrice: string;
  totalAssets: string;
  totalSupply: string;
  timestamp: string;
  blockNumber: string;
  apy: number;
  apy7d: number;
  apy30d: number;
}

export interface LatestChartData {
  vaultAddress: string;
  vaultName: string;
  period: string; // e.g., "7d"
  dataPoints: LatestChartPoint[];
}

export interface LatestChartResponse {
  success: boolean;
  data: LatestChartData;
}

export interface VaultPriceItem {
  id: number;
  vault_address: string;
  token: string;
  protocol: string;
  share_price: string;
  share_price_formatted: string;
  total_assets: string;
  total_supply: string;
  apy_24h: number;
  apy_7d: number | null;
  created_at: string;
}

// Vault Activity Types
export interface VaultTransaction {
  id: number;
  transaction_hash: string;
  gas_used: number;
  status: "success" | "failed" | "skipped";
  created_at: string;
}

export interface VaultDeposit {
  id: number;
  status: "success" | "failed" | "skipped";
  vault_address: string;
  asset_address: string;
  asset_symbol: string;
  asset_decimals: number;
  queue_length_before: number;
  queue_length_after: number;
  processed_count: number;
  batch_size: number;
  total_assets_to_deposit: number;
  idle_assets_before: number;
  error_message: string;
  execution_duration_seconds: number;
  created_at: string;
  transactions: VaultTransaction[];
}

export interface VaultWithdrawal {
  id: number;
  status: "success" | "failed" | "skipped";
  vault_address: string;
  queue_length_before: number;
  queue_length_after: number;
  processed_count: number;
  batch_size: number;
  error_message: string;
  execution_duration_seconds: number;
  created_at: string;
  transactions: VaultTransaction[];
}

export interface DepositsRequest {
  asset_symbol?: string;
  days?: number;
  ordering?: string;
  status?: "success" | "failed" | "skipped";
  vault_address?: string;
}

export interface WithdrawalsRequest {
  days?: number;
  ordering?: string;
  status?: "success" | "failed" | "skipped";
  vault_address?: string;
}

export type VaultDepositsResponse = VaultDeposit[];
export type VaultWithdrawalsResponse = VaultWithdrawal[];

export interface RebalanceTransaction {
  id: number;
  transaction_hash: string;
  block_number: number;
  gas_used: number;
  gas_price: number;
  status: "completed" | "failed" | "pending";
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export interface VaultRebalance {
  rebalance_id: string;
  status: "completed" | "failed" | "pending";
  from_protocol: string;
  to_protocol: string;
  from_pool_address: string;
  to_pool_address: string;
  amount_token: string;
  amount_token_raw: string;
  token_symbol: string;
  token_decimals: number;
  strategy_summary: string;
  withdrawal_transaction: RebalanceTransaction;
  deposit_transaction: RebalanceTransaction;
  created_at: string;
  updated_at: string;
}

export interface RebalancesRequest {
  vault_address?: string;
  days?: number;
  ordering?: string;
  status?: "completed" | "failed" | "pending";
}

export type VaultRebalancesResponse = VaultRebalance[];

export type VaultPriceResponse = VaultPriceItem[];

// NEW: Latest deposits/withdrawals API types
export interface LatestVaultActionItem {
  id: string;
  vaultAddress: string;
  vaultName: string;
  sender: string;
  owner: string;
  assets: string; // raw wei amount
  shares: string; // raw wei amount
  timestamp: string; // seconds since epoch
  blockNumber: string;
  txHash: string;
  actionType?: "Deposit" | "Withdraw";
}

export interface LatestDepositsData {
  deposits: LatestVaultActionItem[];
  count: number;
  limit: number;
  offset: number;
  filters: {
    vaultAddress?: string;
    owner?: string;
    days?: number;
  };
}

export interface LatestWithdrawalsData {
  withdrawals: LatestVaultActionItem[];
  count: number;
  limit: number;
  offset: number;
  filters: {
    vaultAddress?: string;
    owner?: string;
    days?: number;
  };
}

export interface LatestDepositsResponse {
  success: boolean;
  data: LatestDepositsData;
}

export interface LatestWithdrawalsResponse {
  success: boolean;
  data: LatestWithdrawalsData;
}

// API Routes
export const API_ROUTES = {
  GET_VAULTS_LATEST: `${API_URL}/neura-vault/vaults`,
  GET_VAULT_ALLOCATIONS: `${API_URL}/neura-vault/allocations`,
  GET_VOLUME_SUMMARY: `${API_URL}/neura-vault/volume/summary`,
  GET_VAULT_DEPOSITS_LATEST: `${API_URL}/neura-vault/deposits`,
  GET_VAULT_WITHDRAWALS_LATEST: `${API_URL}/neura-vault/withdrawals`,
  GET_VAULT_PENDING_AMOUNT: `${API_URL}/neura-vault/deposits/pendingAmount`,
  GET_VAULT_PENDING_WITHDRAWALS: `${API_URL}/neura-vault/withdrawals/pendingAmount`,

  // invite code & user access
  CHECK_USER_ACCESS: `${API_URL}/invite-codes/user/check_access`,
  REDEEM_INVITE_CODE: `${API_URL}/invite-codes/user/redeem`,
  CREATE_INVITE_CODE: `${API_URL}/invite-codes/admin?apiKey=${API_KEY}`,
  GET_INVITE_CODES: `${API_URL}/invite-codes/admin?apiKey=${API_KEY}`,
  ACCESS_REQUESTS: `${API_URL}/access-requests/`,

  // Points API
  GET_POINTS_BY_PROTOCOL: `${POINTS_API_URL}/points`,

  // Audit Logs
  GET_AUDIT_LOGS: `${API_URL}/audit-logs`,
} as const;

// Axios instance
const api: AxiosInstance = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor
api.interceptors.request.use(async (config) => {
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error("API Error:", error);
    return Promise.reject(error);
  }
);

export async function apiGet<T = any>(
  url: string,
  params?: Record<string, any>
): Promise<T> {
  const res = await api.get(url, { params });
  return res.data as T;
}

export async function apiPost<T = any>(url: string, data?: any): Promise<T> {
  const res = await api.post(url, data);
  return res.data as T;
}

export default api;

export interface LatestVaultAllocation {
  protocol: string;
  name: string;
  currentAPY: number;
}

export interface LatestVaultCurrentData {
  sharePrice: string;
  totalAssets: string;
  totalSupply: string;
  timestamp: string;
  blockNumber: string;
}

export interface LatestVaultApy {
  apy: number | null;
  apy1d: number | null;
  apy7d: number | null;
  apy30d: number | null;
}

export interface LatestVaultItem {
  name: string;
  address: string;
  chain: string;
  symbol: string;
  underlyingSymbol?: string;
  underlying: string;
  underlyingDecimals?: number;
  safe: string;
  silo: string;
  proxyAdmin: string;
  startBlock: string;
  allocations: LatestVaultAllocation[];
  currentData: LatestVaultCurrentData;
  apy: LatestVaultApy;
}

export interface LatestVaultsResponse {
  success: boolean;
  data: LatestVaultItem[];
}

export interface VaultAllocationItem {
  protocol: string;
  name: string;
  balance: string;
  percentage: number;
}

export interface VaultAllocationsData {
  vaultAddress: string;
  vaultName: string;
  symbol: string;
  totalValueFormatted: string;
  allocations: VaultAllocationItem[];
}

export interface VaultAllocationsResponse {
  success?: boolean;
  data?: VaultAllocationsData;
  error?: string;
}

export interface PendingDepositsData {
  vaultAddress: string;
  pendingAmount: string;
}

export interface PendingDepositsResponse {
  success?: boolean;
  data?: PendingDepositsData;
  error?: string;
}

export interface PendingWithdrawalsData {
  vaultAddress: string;
  pendingShares: string;
  pendingCount: number;
}

export interface PendingWithdrawalsResponse {
  success?: boolean;
  data?: PendingWithdrawalsData;
  error?: string;
}

export interface VolumeSummaryVault {
  vaultName: string;
  vaultAddress: string;
  safeAddress: string;
  symbol: string;
  totalDeposits: string;
  totalWithdrawals: string;
  totalVolume: string;
  totalDepositsFormatted: string;
  totalWithdrawalsFormatted: string;
  totalVolumeFormatted: string;
  depositCount: number;
  withdrawalCount: number;
  totalTransactionCount: number;
}

export interface AuditLog {
  id: string;
  runId: string;
  vaultName: string;
  taskType: string;
  status: string;
  startedAt: string;
  completedAt: string;
  txHashes: string[];
  agentReasoning: string;
  riskAssessment: string;
  message: string;
  createdAt: string;
}

export interface AuditLogsPagination {
  limit: number;
  offset: number;
  total: number;
  hasMore: boolean;
}

export interface AuditLogsResponse {
  success: boolean;
  data: {
    logs: AuditLog[];
    pagination: AuditLogsPagination;
  };
}

export interface VolumeSummaryGrandTotal {
  totalDeposits: string;
  totalWithdrawals: string;
  totalVolume: string;
  totalDepositsFormatted: string;
  totalWithdrawalsFormatted: string;
  totalVolumeFormatted: string;
  depositCount: number;
  withdrawalCount: number;
  totalTransactionCount: number;
}

export interface VolumeSummaryData {
  grandTotal: VolumeSummaryGrandTotal;
  vaults: VolumeSummaryVault[];
}

export interface VolumeSummaryResponse {
  success: boolean;
  data: VolumeSummaryData;
}

export interface PointsProtocolData {
  name: string;
  points: string;
  pointsRaw: string;
}

export interface PointsResponse {
  address: string;
  totalPoints: string;
  totalPointsRaw: string;
  pointsByProtocol: Record<string, PointsProtocolData>;
}