import axios, { AxiosInstance } from "axios";

const API_URL = import.meta.env.VITE_API_URL;

if (!API_URL) {
  throw new Error("VITE_API_URL environment variable is not defined");
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
export interface PriceChartPoint {
  timestamp: number | string;
  share_price_formatted: string;
  pool_apy: number | string;
}

export interface TokenPriceData {
  token: string;
  data: PriceChartPoint[];
}

export interface PriceChartResponse {
  chart_data: TokenPriceData[];
}

export interface VaultPriceItem {
  id: number;
  vault_address: string;
  token: string;
  protocol: string;
  pool_apy: string;
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

// Rebalance Types
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

// API Routes
export const API_ROUTES = {
  GET_DAILY_METRICS: `${API_URL}/yield-monitor/daily-metrics/`,
  GET_PRICE_CHART: `${API_URL}/vault/price-chart/`,
  GET_VAULT_PRICE: `${API_URL}/vault/price/`,
  GET_VAULT_DEPOSITS: `${API_URL}/vault/deposits/`,
  GET_VAULT_WITHDRAWALS: `${API_URL}/vault/withdrawals/`,
  GET_VAULT_REBALANCES: `${API_URL}/vault/rebalances/combined/`,
  GET_AGENT_THOUGHTS: `${API_URL}/agent-thoughts/`,

  // invite code & user access
  CHECK_USER_ACCESS: `${API_URL}/invite-codes/check_access/`,
  REDEEM_INVITE_CODE: `${API_URL}/invite-codes/redeem/`,
  CREATE_INVITE_CODE: `${API_URL}/invite-codes/`,
  GET_INVITE_CODES: `${API_URL}/invite-codes/`,
} as const;

// Axios instance
const api: AxiosInstance = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
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

const inflightRequests = new Map<string, Promise<any>>();
const responseCache = new Map<string, { timestamp: number; data: any }>();
const DEFAULT_CACHE_TTL_MS = 30_000;

function buildKey(method: string, url: string, params?: any, data?: any) {
  const p = params ? JSON.stringify(params, Object.keys(params).sort()) : "";
  const d = data ? JSON.stringify(data) : "";
  return `${method}:${url}?p=${p}&d=${d}`;
}

export async function apiGet<T = any>(
  url: string,
  params?: Record<string, any>,
  ttlMs: number = DEFAULT_CACHE_TTL_MS
): Promise<T> {
  const key = buildKey("GET", url, params);
  const now = Date.now();

  const cached = responseCache.get(key);
  if (cached && now - cached.timestamp < ttlMs) {
    return cached.data as T;
  }

  if (inflightRequests.has(key)) {
    return inflightRequests.get(key) as Promise<T>;
  }

  const req = api
    .get(url, { params })
    .then((res) => {
      responseCache.set(key, { timestamp: Date.now(), data: res.data });
      inflightRequests.delete(key);
      return res.data as T;
    })
    .catch((err) => {
      inflightRequests.delete(key);
      throw err;
    });

  inflightRequests.set(key, req);
  return req;
}

export async function apiPost<T = any>(
  url: string,
  data?: any,
  ttlMs?: number // not cached by default; provide to enable cache if desired
): Promise<T> {
  const key = buildKey("POST", url, undefined, data);

  if (ttlMs && ttlMs > 0) {
    const now = Date.now();
    const cached = responseCache.get(key);
    if (cached && now - cached.timestamp < ttlMs) return cached.data as T;
  }

  if (inflightRequests.has(key)) {
    return inflightRequests.get(key) as Promise<T>;
  }

  const req = api
    .post(url, data)
    .then((res) => {
      if (ttlMs && ttlMs > 0) {
        responseCache.set(key, { timestamp: Date.now(), data: res.data });
      }
      inflightRequests.delete(key);
      return res.data as T;
    })
    .catch((err) => {
      inflightRequests.delete(key);
      throw err;
    });

  inflightRequests.set(key, req);
  return req;
}

export function clearApiCaches() {
  inflightRequests.clear();
  responseCache.clear();
}

export default api;
