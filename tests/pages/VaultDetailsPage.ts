/**
 * Provides methods for interacting with and verifying the vault details page.
 */
import { Page, expect, Locator } from "@playwright/test";
import { TESTIDS, TIMEOUTS } from "../helpers/testHelpers";

export type ChartTab = 'tvl' | 'sharePrice' | 'apy';

export class VaultDetailsPage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  /**
   * Navigate directly to a vault details page by address
   */
  async navigate(vaultAddress: string) {
    await this.page.goto(`/vaults/${vaultAddress}`);
    await this.page.waitForLoadState("domcontentloaded");
  }

  /**
   * Wait for vault details to fully load
   */
  async waitForDetailsToLoad(timeout = TIMEOUTS.LONG) {
    // Wait for vault name to be visible
    await expect(this.page.locator(`[data-testid='${TESTIDS.VAULT_DETAILS_NAME}']`)).toBeVisible({ timeout });

    // Wait for stats to be visible
    await expect(this.page.locator(`[data-testid='${TESTIDS.TOTAL_AUM}']`)).toBeVisible({ timeout });
  }

  /**
   * Verify vault name is displayed correctly
   */
  async verifyVaultName(name: string) {
    const nameElement = this.page.locator(`[data-testid='${TESTIDS.VAULT_DETAILS_NAME}']`);
    await expect(nameElement).toBeVisible({ timeout: TIMEOUTS.MEDIUM });
    await expect(nameElement).toContainText(name);
  }

  /**
   * Get the displayed vault name
   */
  async getVaultName(): Promise<string> {
    const nameElement = this.page.locator(`[data-testid='${TESTIDS.VAULT_DETAILS_NAME}']`);
    await expect(nameElement).toBeVisible();
    return await nameElement.innerText();
  }

  // Note: verifyVaultSymbol removed - vault-details-symbol testid not implemented in source

  /**
   * Verify the vault stats cards are displayed
   */
  async verifyVaultStats() {
    await expect(this.page.locator(`[data-testid='${TESTIDS.TOTAL_AUM}']`)).toBeVisible();
    await expect(this.page.locator(`[data-testid='${TESTIDS.CURRENT_APY}']`)).toBeVisible();
  }

  /**
   * Get the total AUM value displayed
   */
  async getTotalAUM(): Promise<string> {
    const aumElement = this.page.locator(`[data-testid='${TESTIDS.TOTAL_AUM}']`);
    await expect(aumElement).toBeVisible();
    return await aumElement.innerText();
  }

  /**
   * Get the current APY displayed
   */
  async getCurrentAPY(): Promise<string> {
    const apyElement = this.page.locator(`[data-testid='${TESTIDS.CURRENT_APY}']`);
    await expect(apyElement).toBeVisible();
    return await apyElement.innerText();
  }

  /**
   * Verify user position card is displayed
   */
  async verifyUserPosition() {
    const positionCard = this.page.locator(`[data-testid='${TESTIDS.USER_POSITION_CARD}']`);
    await expect(positionCard).toBeVisible();

    // Verify either empty state or value state is visible
    const emptyState = this.page.locator(`[data-testid='${TESTIDS.USER_POSITION_EMPTY}']`);
    const valueState = this.page.locator(`[data-testid='${TESTIDS.USER_POSITION_VALUE}']`);

    // One of them should be visible
    await expect(emptyState.or(valueState)).toBeVisible();
  }

  /**
   * Check if user has deposits (not empty state)
   */
  async isUserPositionEmpty(): Promise<boolean> {
    const emptyState = this.page.locator(`[data-testid='${TESTIDS.USER_POSITION_EMPTY}']`);
    return await emptyState.isVisible();
  }

  /**
   * Get user position value (if not empty)
   */
  async getUserPositionValue(): Promise<string | null> {
    const valueState = this.page.locator(`[data-testid='${TESTIDS.USER_POSITION_VALUE}']`);
    if (await valueState.isVisible()) {
      return await valueState.innerText();
    }
    return null;
  }

  /**
   * Verify all chart tabs are visible
   */
  async verifyCharts() {
    await this.waitForChartToLoad();

    await expect(this.page.locator(`[data-testid='${TESTIDS.CHART_TAB_TVL}']`)).toBeVisible();
    await expect(this.page.locator(`[data-testid='${TESTIDS.CHART_TAB_SHARE_PRICE}']`)).toBeVisible();
    await expect(this.page.locator(`[data-testid='${TESTIDS.CHART_TAB_APY}']`)).toBeVisible();
  }

  /**
   * Get the currently active chart tab
   */
  async getActiveChartTab(): Promise<ChartTab | null> {
    const tabs: ChartTab[] = ['tvl', 'sharePrice', 'apy'];

    for (const tab of tabs) {
      const tabElement = this.page.locator(`[data-testid='chart-tab-${tab}']`);
      const state = await tabElement.getAttribute('data-state');
      if (state === 'active') {
        return tab;
      }
    }
    return null;
  }

  /**
   * Switch to a specific chart tab
   */
  async switchChartTab(tab: ChartTab) {
    await this.page.locator(`[data-testid='chart-tab-${tab}']`).click();
    await expect(this.page.locator(`[data-testid='chart-content-${tab}']`)).toBeVisible();
  }

  /**
   * Verify chart content is loaded for a specific tab
   */
  async verifyChartContent(tab: ChartTab) {
    await expect(this.page.locator(`[data-testid='chart-content-${tab}']`)).toBeVisible();
  }

  /**
   * Verify chart data has loaded (no loading or error state)
   */
  async verifyChartDataLoaded() {
    // Check that loading message is not visible
    const loadingMsg = this.page.locator("text='Loading performance data...'");
    await expect(loadingMsg).not.toBeVisible({ timeout: TIMEOUTS.CHART_LOAD });

    // Check that error message is not visible
    const errorMsg = this.page.locator("text='Failed to load performance data'");
    await expect(errorMsg).not.toBeVisible();
  }

  /**
   * Verify chart shows error state
   */
  async verifyChartErrorState() {
    const errorMsg = this.page.locator("text='Failed to load performance data'");
    await expect(errorMsg).toBeVisible({ timeout: TIMEOUTS.MEDIUM });
  }

  /**
   * Wait for chart to load (default 10 seconds)
   */
  async waitForChartToLoad(timeout = TIMEOUTS.CHART_LOAD) {
    await this.page.waitForTimeout(timeout);
  }

  /**
   * Get all chart tab locators
   */
  getAllChartTabs(): Locator[] {
    return [
      this.page.locator(`[data-testid='${TESTIDS.CHART_TAB_TVL}']`),
      this.page.locator(`[data-testid='${TESTIDS.CHART_TAB_SHARE_PRICE}']`),
      this.page.locator(`[data-testid='${TESTIDS.CHART_TAB_APY}']`),
    ];
  }

  /**
   * Verify loading state is displayed
   */
  async verifyLoadingState() {
    const loadingMsg = this.page.locator("text='Loading performance data...'");
    await expect(loadingMsg).toBeVisible({ timeout: TIMEOUTS.SHORT });
  }

  /**
   * Click timeframe button (7D or 1M)
   */
  async selectTimeframe(timeframe: '7D' | '1M') {
    const button = this.page.locator(`button:has-text("${timeframe}")`);
    await button.click();
  }

  /**
   * Deposit-related methods (for future expansion)
   */
  async inputDepositAmount(amount: string) {
    const input = this.page.locator(`[data-testid='${TESTIDS.AMOUNT_INPUT}']`);
    await input.fill(amount);
  }

  async clickDepositTab() {
    await this.page.locator(`[data-testid='${TESTIDS.DEPOSIT_TAB}']`).click();
  }

  async clickWithdrawTab() {
    await this.page.locator(`[data-testid='${TESTIDS.WITHDRAW_TAB}']`).click();
  }

  async initiateDeposit() {
    await this.page.locator(`[data-testid='${TESTIDS.DEPOSIT_BTN}']`).click();
  }

  async verifyTransactionSubmitted() {
    const status = this.page.locator(`[data-testid='${TESTIDS.TRANSACTION_STATUS}']`)
      .filter({ hasText: "Transaction submitted" });
    await expect(status.first()).toBeVisible({ timeout: TIMEOUTS.LONG });
  }

  async verifyTransactionSettled() {
    const status = this.page.locator(`[data-testid='${TESTIDS.TRANSACTION_STATUS}']`)
      .filter({ hasText: "Transaction settled" });
    await expect(status.first()).toBeVisible({ timeout: 60000 });
  }
}
