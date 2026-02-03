/**
 * Test Helpers for E2E Tests
 * 
 * Shared utilities for test selectors and common patterns.
 * Tests run against real mainnet data via Anvil fork - no mocking needed.
 */
import { Page } from '@playwright/test';

// Common timeouts
export const TIMEOUTS = {
    SHORT: 5000,
    MEDIUM: 15000,
    LONG: 30000,
    CHART_LOAD: 10000,
    NAVIGATION: 10000,
};

// Data testid selectors
export const TESTIDS = {
    // Vaults page
    VAULT_ROW: (address: string) => `vault-row-${address}`,
    VAULT_NAME: (address: string) => `vault-name-${address}`,
    VAULT_TVL: (address: string) => `vault-tvl-${address}`,
    VAULT_APY: (address: string) => `vault-apy-${address}`,

    // Vault details page
    VAULT_DETAILS_NAME: 'vault-details-name',
    TOTAL_AUM: 'total-aum',
    CURRENT_APY: 'current-apy',
    USER_POSITION_CARD: 'user-position-card',
    USER_POSITION_VALUE: 'user-position-value',
    USER_POSITION_EMPTY: 'user-position-empty',

    // Charts
    CHART_TAB_TVL: 'chart-tab-tvl',
    CHART_TAB_SHARE_PRICE: 'chart-tab-sharePrice',
    CHART_TAB_APY: 'chart-tab-apy',
    CHART_CONTENT_TVL: 'chart-content-tvl',
    CHART_CONTENT_SHARE_PRICE: 'chart-content-sharePrice',
    CHART_CONTENT_APY: 'chart-content-apy',

    // Info tabs (AI Terminal, Details, Whitelisted Pools, Composition)
    INFO_TAB_TERMINAL: 'info-tab-terminal',
    INFO_TAB_DETAILS: 'info-tab-details',
    INFO_TAB_POOLS: 'info-tab-pools',
    INFO_TAB_COMPOSITION: 'info-tab-composition',
    INFO_CONTENT_TERMINAL: 'info-content-terminal',
    INFO_CONTENT_DETAILS: 'info-content-details',
    INFO_CONTENT_POOLS: 'info-content-pools',
    INFO_CONTENT_COMPOSITION: 'info-content-composition',

    // Agent Terminal component
    AGENT_TERMINAL: 'agent-terminal',
    AGENT_TERMINAL_NAME: 'agent-terminal-name',
    AGENT_TERMINAL_STATUS: 'agent-terminal-status',
    AGENT_TERMINAL_LOGS: 'agent-terminal-logs',
    AGENT_TERMINAL_LOG_ENTRY: 'agent-terminal-log-entry',

    // Vault Activity component
    VAULT_ACTIVITY: 'vault-activity',
    VAULT_ACTIVITY_LOADING: 'vault-activity-loading',
    VAULT_ACTIVITY_ERROR: 'vault-activity-error',
    VAULT_ACTIVITY_EMPTY: 'vault-activity-empty',
    VAULT_ACTIVITY_ITEM: 'vault-activity-item',

    // Whitelisted Pools
    POOL_ALLOCATION_ITEM: 'pool-allocation-item',
    POOLS_EMPTY: 'pools-empty',

    // Composition
    COMPOSITION_LOADING: 'composition-loading',
    COMPOSITION_ERROR: 'composition-error',
    COMPOSITION_DATA: 'composition-data',
    COMPOSITION_CHART: 'composition-chart',
    COMPOSITION_EMPTY: 'composition-empty',

    // Transactions
    DEPOSIT_TAB: 'deposit-tab',
    WITHDRAW_TAB: 'withdraw-tab',
    AMOUNT_INPUT: 'amount-input',
    DEPOSIT_BTN: 'deposit-btn',
    WITHDRAW_BTN: 'withdraw-btn',
    TRANSACTIONS_LIST: 'transactions-list',
    TRANSACTION_STATUS: 'transaction-status',
    TRANSACTION_HASH_LINK: 'transaction-hash-link',

    // Wallet
    WALLET_ADDRESS_BTN: 'wallet-address-btn',
    CONNECT_WALLET_BTN: 'connect-wallet-btn',

    // Loading
    SKELETON_LOADER: 'skeleton-loader',

    // Dashboard
    DASHBOARD_TVL: 'dashboard-tvl',
    DASHBOARD_TVL_VALUE: 'dashboard-tvl-value',
    DASHBOARD_VOLUME: 'dashboard-volume',
    DASHBOARD_VOLUME_VALUE: 'dashboard-volume-value',
    DASHBOARD_APY: 'dashboard-apy',
    DASHBOARD_APY_VALUE: 'dashboard-apy-value',
    DASHBOARD_TOKEN_BALANCES: 'dashboard-token-balances',
    DASHBOARD_BALANCE: (symbol: string) => `dashboard-balance-${symbol}`,
    DASHBOARD_HYPE_BALANCE: 'dashboard-hype-balance',
    DASHBOARD_CONNECT_PROMPT: 'dashboard-connect-prompt',

    // Portfolio
    PORTFOLIO_CONNECT_PROMPT: 'portfolio-connect-prompt',
    PORTFOLIO_DEPOSITS: 'portfolio-deposits',
    PORTFOLIO_DEPOSITS_VALUE: 'portfolio-deposits-value',
    PORTFOLIO_APY: 'portfolio-apy',
    PORTFOLIO_POSITIONS_CARD: 'portfolio-positions-card',
    PORTFOLIO_POSITIONS_COUNT: 'portfolio-positions-count',
    PORTFOLIO_EMPTY_STATE: 'portfolio-empty-state',
    PORTFOLIO_POSITION_ROW: (address: string) => `portfolio-position-row-${address}`,
};

/**
 * Wait for API response helper
 */
export async function waitForApiResponse(page: Page, urlPattern: string, timeout: number = TIMEOUTS.MEDIUM): Promise<any> {
    const response = await page.waitForResponse(
        (resp) => resp.url().includes(urlPattern) && resp.status() === 200,
        { timeout }
    );
    return response.json();
}

/**
 * Extract vault address from URL
 */
export function getVaultAddressFromUrl(url: string): string | null {
    const match = url.match(/\/vaults\/([^\/\?]+)/i);
    return match ? match[1] : null;
}

/**
 * Format number for comparison (handles currency/percentage formatting)
 */
export function parseFormattedNumber(text: string): number {
    // Remove currency symbols, commas, percent signs
    const cleaned = text.replace(/[$,%\s]/g, '');
    return parseFloat(cleaned) || 0;
}

/**
 * Validate Ethereum address format
 */
export function isValidEthAddress(address: string): boolean {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
}

/**
 * Wait for network to settle (useful after navigation)
 */
export async function waitForNetworkIdle(page: Page, timeout: number = 5000) {
    await page.waitForLoadState('networkidle', { timeout });
}
