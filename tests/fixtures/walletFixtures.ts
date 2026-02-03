/**
 * Custom Playwright Test Fixtures for Walletless E2E Testing
 *
 * Provides extended test fixtures with:
 * - Dynamic Anvil account fetching from running instance
 * - Walletless provider configuration
 * - Test wallet utilities
 */
import { test as baseTest, expect, Page } from '@playwright/test';

// Anvil RPC URL
const ANVIL_RPC_URL = 'http://localhost:8545';

// Cache for dynamically fetched Anvil accounts
let cachedAnvilAccounts: string[] | null = null;

/**
 * Fetch accounts dynamically from running Anvil instance
 */
async function fetchAnvilAccounts(): Promise<string[]> {
    if (cachedAnvilAccounts) {
        return cachedAnvilAccounts;
    }

    try {
        const response = await fetch(ANVIL_RPC_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                jsonrpc: '2.0',
                method: 'eth_accounts',
                params: [],
                id: 1,
            }),
        });

        if (response.ok) {
            const data = await response.json();
            if (data.result && Array.isArray(data.result)) {
                cachedAnvilAccounts = data.result;
                return data.result;
            }
        }
        return [];
    } catch {
        return [];
    }
}

/**
 * Check if Anvil is running and accessible
 */
async function checkAnvilConnection(): Promise<boolean> {
    try {
        const response = await fetch(ANVIL_RPC_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                jsonrpc: '2.0',
                method: 'eth_chainId',
                params: [],
                id: 1,
            }),
        });

        if (response.ok) {
            const data = await response.json();
            return data.result !== undefined;
        }
        return false;
    } catch {
        return false;
    }
}

/**
 * Get the first Anvil account (primary test wallet)
 */
export async function getTestWalletAddress(): Promise<string | null> {
    const accounts = await fetchAnvilAccounts();
    return accounts.length > 0 ? accounts[0] : null;
}

/**
 * Get all Anvil accounts
 */
export async function getAnvilAccounts(): Promise<string[]> {
    return await fetchAnvilAccounts();
}

/**
 * Get short form of an address (0x1234...5678)
 */
export function shortenAddress(address: string): string {
    if (!address || address.length < 10) return address;
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

// Extend base test with custom fixtures
export const test = baseTest.extend<{
    anvilReady: boolean;
    testWalletAddress: string | null;
    anvilAccounts: string[];
}>({
    // Fixture to ensure Anvil is ready
    anvilReady: async ({ }, use) => {
        const isAnvilReady = await checkAnvilConnection();

        if (!isAnvilReady) {
            console.warn('⚠️ Anvil is not running. Please start Anvil manually: anvil --port 8545');
        }

        await use(isAnvilReady);
    },

    // Provide test wallet address dynamically from Anvil
    testWalletAddress: async ({ }, use) => {
        const address = await getTestWalletAddress();
        await use(address);
    },

    // Provide all Anvil accounts
    anvilAccounts: async ({ }, use) => {
        const accounts = await getAnvilAccounts();
        await use(accounts);
    },
});

/**
 * Page Object helpers for wallet-related interactions
 */
export class WalletTestHelpers {
    constructor(private page: Page) { }

    /** Click the "Connect Wallet" button (works for both normal and E2E mode) */
    async connectTestWallet() {
        const button = this.page.getByTestId('connect-wallet-btn');
        await button.click();
    }

    /** Alias for connectTestWallet - same button in E2E mode */
    async clickConnectWallet() {
        await this.connectTestWallet();
    }

    /** Wait for wallet to be connected and address displayed */
    async waitForWalletConnected(timeout = 10000) {
        const addressBtn = this.page.getByTestId('wallet-address-btn');
        await expect(addressBtn).toBeVisible({ timeout });
        return addressBtn;
    }

    /** Get the displayed wallet address */
    async getDisplayedAddress() {
        const addressBtn = this.page.getByTestId('wallet-address-btn');
        return await addressBtn.textContent();
    }

    /** Check if wallet is connected */
    async isWalletConnected(): Promise<boolean> {
        const addressBtn = this.page.getByTestId('wallet-address-btn');
        return await addressBtn.isVisible();
    }

    /** Check if connect button is visible (wallet not connected) */
    async areConnectButtonsVisible(): Promise<boolean> {
        const connectBtn = this.page.getByTestId('connect-wallet-btn');
        return await connectBtn.isVisible();
    }

    /**
     * Verify the displayed address matches an Anvil account
     * @param displayedText - The text shown in the UI (may be shortened)
     * @param anvilAccounts - List of Anvil accounts to check against
     */
    async verifyAddressMatchesAnvil(displayedText: string | null, anvilAccounts: string[]): Promise<boolean> {
        if (!displayedText || anvilAccounts.length === 0) return false;

        // Check if any Anvil account matches the displayed text
        // The displayed text might be shortened (e.g., "0x1234...5678")
        for (const account of anvilAccounts) {
            const lower = account.toLowerCase();
            const displayLower = displayedText.toLowerCase();

            // Check for full match or partial match (start/end of address)
            if (
                displayLower.includes(lower) ||
                displayLower.includes(lower.slice(0, 6)) ||
                displayLower.includes(lower.slice(-4))
            ) {
                return true;
            }
        }
        return false;
    }
}

/**
 * Create a WalletTestHelpers instance for the given page
 */
export function createWalletHelpers(page: Page): WalletTestHelpers {
    return new WalletTestHelpers(page);
}

// Re-export expect for convenience
export { expect };
