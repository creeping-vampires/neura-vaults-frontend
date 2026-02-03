/**
 * Provides methods for interacting with and verifying the dashboard page.
 */
import { Page, expect, Locator } from "@playwright/test";
import { TESTIDS, TIMEOUTS } from "../helpers/testHelpers";

export class DashboardPage {
    readonly page: Page;

    constructor(page: Page) {
        this.page = page;
    }

    /**
     * Navigate to the dashboard page (root)
     */
    async navigate() {
        await this.page.goto("/");
        await this.page.waitForLoadState("domcontentloaded");
    }

    /**
     * Wait for dashboard to fully load
     */
    async waitForDashboardToLoad(timeout = TIMEOUTS.LONG) {
        await expect(this.page.locator(`[data-testid='${TESTIDS.DASHBOARD_TVL}']`)).toBeVisible({ timeout });
    }

    // Stats Cards
    async getTVLCard(): Promise<Locator> {
        return this.page.locator(`[data-testid='${TESTIDS.DASHBOARD_TVL}']`);
    }

    async getTVLValue(): Promise<string> {
        const element = this.page.locator(`[data-testid='${TESTIDS.DASHBOARD_TVL_VALUE}']`);
        await expect(element).toBeVisible();
        return await element.innerText();
    }

    async getVolumeCard(): Promise<Locator> {
        return this.page.locator(`[data-testid='${TESTIDS.DASHBOARD_VOLUME}']`);
    }

    async getVolumeValue(): Promise<string> {
        const element = this.page.locator(`[data-testid='${TESTIDS.DASHBOARD_VOLUME_VALUE}']`);
        await expect(element).toBeVisible();
        return await element.innerText();
    }

    async getAPYCard(): Promise<Locator> {
        return this.page.locator(`[data-testid='${TESTIDS.DASHBOARD_APY}']`);
    }

    async getAPYValue(): Promise<string> {
        const element = this.page.locator(`[data-testid='${TESTIDS.DASHBOARD_APY_VALUE}']`);
        await expect(element).toBeVisible();
        return await element.innerText();
    }

    /**
     * Verify all stats cards are visible
     */
    async verifyStatsCardsVisible() {
        await expect(this.page.locator(`[data-testid='${TESTIDS.DASHBOARD_TVL}']`)).toBeVisible();
        await expect(this.page.locator(`[data-testid='${TESTIDS.DASHBOARD_VOLUME}']`)).toBeVisible();
        await expect(this.page.locator(`[data-testid='${TESTIDS.DASHBOARD_APY}']`)).toBeVisible();
    }

    // Token Balances
    async getTokenBalancesCard(): Promise<Locator> {
        return this.page.locator(`[data-testid='${TESTIDS.DASHBOARD_TOKEN_BALANCES}']`);
    }

    async isTokenBalancesVisible(): Promise<boolean> {
        return await this.page.locator(`[data-testid='${TESTIDS.DASHBOARD_TOKEN_BALANCES}']`).isVisible();
    }

    async getBalanceForSymbol(symbol: string): Promise<Locator> {
        return this.page.locator(`[data-testid='${TESTIDS.DASHBOARD_BALANCE(symbol)}']`);
    }

    async getHypeBalance(): Promise<Locator> {
        return this.page.locator(`[data-testid='${TESTIDS.DASHBOARD_HYPE_BALANCE}']`);
    }

    async isHypeBalanceVisible(): Promise<boolean> {
        return await this.page.locator(`[data-testid='${TESTIDS.DASHBOARD_HYPE_BALANCE}']`).isVisible();
    }

    // Connect Prompt
    async isConnectPromptVisible(): Promise<boolean> {
        return await this.page.locator(`[data-testid='${TESTIDS.DASHBOARD_CONNECT_PROMPT}']`).isVisible();
    }

    async getConnectPrompt(): Promise<Locator> {
        return this.page.locator(`[data-testid='${TESTIDS.DASHBOARD_CONNECT_PROMPT}']`);
    }
}
