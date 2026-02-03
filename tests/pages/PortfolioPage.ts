/**
 * Provides methods for interacting with and verifying the portfolio page.
 */
import { Page, expect, Locator } from "@playwright/test";
import { TESTIDS, TIMEOUTS } from "../helpers/testHelpers";

export class PortfolioPage {
    readonly page: Page;

    constructor(page: Page) {
        this.page = page;
    }

    /**
     * Navigate to the portfolio page
     */
    async navigate() {
        await this.page.goto("/portfolio");
        await this.page.waitForLoadState("domcontentloaded");
    }

    /**
     * Wait for portfolio to fully load (connected state)
     */
    async waitForPortfolioToLoad(timeout = TIMEOUTS.LONG) {
        await expect(this.page.locator(`[data-testid='${TESTIDS.PORTFOLIO_DEPOSITS}']`)).toBeVisible({ timeout });
    }

    // Connect Prompt
    async isConnectPromptVisible(): Promise<boolean> {
        return await this.page.locator(`[data-testid='${TESTIDS.PORTFOLIO_CONNECT_PROMPT}']`).isVisible();
    }

    async getConnectPrompt(): Promise<Locator> {
        return this.page.locator(`[data-testid='${TESTIDS.PORTFOLIO_CONNECT_PROMPT}']`);
    }

    // Deposits Card
    async getDepositsCard(): Promise<Locator> {
        return this.page.locator(`[data-testid='${TESTIDS.PORTFOLIO_DEPOSITS}']`);
    }

    async getDepositsValue(): Promise<string> {
        const element = this.page.locator(`[data-testid='${TESTIDS.PORTFOLIO_DEPOSITS_VALUE}']`);
        await expect(element).toBeVisible();
        return await element.innerText();
    }

    async getAPYValue(): Promise<string> {
        const element = this.page.locator(`[data-testid='${TESTIDS.PORTFOLIO_APY}']`);
        await expect(element).toBeVisible();
        return await element.innerText();
    }

    // Positions Card
    async getPositionsCard(): Promise<Locator> {
        return this.page.locator(`[data-testid='${TESTIDS.PORTFOLIO_POSITIONS_CARD}']`);
    }

    async isPositionsCardVisible(): Promise<boolean> {
        return await this.page.locator(`[data-testid='${TESTIDS.PORTFOLIO_POSITIONS_CARD}']`).isVisible();
    }

    async getPositionsCount(): Promise<string> {
        const element = this.page.locator(`[data-testid='${TESTIDS.PORTFOLIO_POSITIONS_COUNT}']`);
        await expect(element).toBeVisible();
        return await element.innerText();
    }

    async getPositionsCountNumber(): Promise<number> {
        const text = await this.getPositionsCount();
        const match = text.match(/(\d+)/);
        return match ? parseInt(match[1], 10) : 0;
    }

    // Empty State
    async isEmptyStateVisible(): Promise<boolean> {
        return await this.page.locator(`[data-testid='${TESTIDS.PORTFOLIO_EMPTY_STATE}']`).isVisible();
    }

    async getEmptyState(): Promise<Locator> {
        return this.page.locator(`[data-testid='${TESTIDS.PORTFOLIO_EMPTY_STATE}']`);
    }

    // Position Rows
    async getPositionRow(address: string): Promise<Locator> {
        return this.page.locator(`[data-testid='${TESTIDS.PORTFOLIO_POSITION_ROW(address)}']`);
    }

    async getAllPositionRows(): Promise<Locator> {
        return this.page.locator(`[data-testid^='portfolio-position-row-']`);
    }

    async clickPositionRow(address: string) {
        const row = await this.getPositionRow(address);
        await row.click();
    }
}
