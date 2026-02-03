/**
 * VaultActionPanel Test Helpers
 * 
 * Helper class for VaultActionPanel E2E tests.
 */
import { Page, expect } from '@playwright/test';
import { TIMEOUTS } from './testHelpers';

export class VaultActionPanelHelpers {
    constructor(private page: Page) { }

    // Panel elements
    async isPanelVisible(): Promise<boolean> {
        return await this.page.getByTestId('vault-action-panel').isVisible();
    }

    async waitForPanel(timeout = TIMEOUTS.LONG) {
        await this.page.getByTestId('vault-action-panel').waitFor({ timeout });
    }

    // Tab operations
    async selectDepositTab() {
        await this.page.getByTestId('deposit-tab').click();
    }

    async selectWithdrawTab() {
        await this.page.getByTestId('withdraw-tab').click();
    }

    async isDepositTabActive(): Promise<boolean> {
        const tab = this.page.getByTestId('deposit-tab');
        const classes = await tab.getAttribute('class');
        return classes?.includes('text-foreground') ?? false;
    }

    async isWithdrawTabActive(): Promise<boolean> {
        const tab = this.page.getByTestId('withdraw-tab');
        const classes = await tab.getAttribute('class');
        return classes?.includes('text-foreground') ?? false;
    }

    // Amount input
    async enterAmount(amount: string) {
        const input = this.page.getByTestId('amount-input');
        await input.clear();
        await input.fill(amount);
    }

    async getInputValue(): Promise<string> {
        return await this.page.getByTestId('amount-input').inputValue();
    }

    async isInputVisible(): Promise<boolean> {
        return await this.page.getByTestId('amount-input').isVisible();
    }

    // Balance
    async getAvailableBalance(): Promise<string> {
        const balance = this.page.getByTestId('available-balance');
        return await balance.innerText();
    }

    async isBalanceVisible(): Promise<boolean> {
        return await this.page.getByTestId('available-balance').isVisible();
    }

    // Buttons
    async clickDepositButton() {
        await this.page.getByTestId('deposit-btn').click();
    }

    async clickWithdrawButton() {
        await this.page.getByTestId('withdraw-btn').click();
    }

    async isDepositButtonVisible(): Promise<boolean> {
        return await this.page.getByTestId('deposit-btn').isVisible();
    }

    async isWithdrawButtonVisible(): Promise<boolean> {
        return await this.page.getByTestId('withdraw-btn').isVisible();
    }

    async getDepositButtonText(): Promise<string | null> {
        return await this.page.getByTestId('deposit-btn').textContent();
    }

    async getWithdrawButtonText(): Promise<string | null> {
        return await this.page.getByTestId('withdraw-btn').textContent();
    }

    // Percentage buttons
    async clickPercentageButton(percent: number) {
        await this.page.locator(`button:has-text("${percent}%")`).click();
    }

    // Transaction list
    async waitForDepositTransaction(timeout = TIMEOUTS.LONG) {
        const txItem = this.page.getByTestId('transaction-item-deposit').last();
        await expect(txItem).toBeVisible({ timeout });
        return txItem;
    }

    async waitForWithdrawTransaction(timeout = TIMEOUTS.LONG) {
        const txItem = this.page.getByTestId('transaction-item-withdraw').last();
        await expect(txItem).toBeVisible({ timeout });
        return txItem;
    }

    async getTransactionStatus(type: 'deposit' | 'withdraw'): Promise<string | null> {
        const txItem = this.page.getByTestId(`transaction-item-${type}`).last();
        if (await txItem.isVisible()) {
            return await txItem.getAttribute('data-status');
        }
        return null;
    }

    async waitForTransactionStatus(type: 'deposit' | 'withdraw', statuses: string[], timeout = 60000): Promise<string | null> {
        const txItem = this.page.getByTestId(`transaction-item-${type}`).last();
        const statusRegex = new RegExp(statuses.join('|'));
        await expect(txItem).toHaveAttribute('data-status', statusRegex, { timeout });
        return await txItem.getAttribute('data-status');
    }

    async getTransactionStatusText(type: 'deposit' | 'withdraw'): Promise<string | null> {
        const txItem = this.page.getByTestId(`transaction-item-${type}`).last();
        const statusElement = txItem.getByTestId('transaction-status');
        if (await statusElement.isVisible()) {
            return await statusElement.textContent();
        }
        return null;
    }
}

export function createPanelHelpers(page: Page): VaultActionPanelHelpers {
    return new VaultActionPanelHelpers(page);
}
