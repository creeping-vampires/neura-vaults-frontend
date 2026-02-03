/**
 * Provides methods for interacting with and verifying the vaults list page.
 */
import { Page, expect, Locator } from "@playwright/test";
import { TESTIDS, TIMEOUTS } from "../helpers/testHelpers";

export interface VaultRowData {
  address: string;
  name: string;
  tvl: string;
  apy: string;
}

export class VaultsPage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  /**
   * Navigate to the vaults page
   */
  async navigate() {
    await this.page.goto("/vaults");
    await this.page.waitForLoadState("domcontentloaded");
  }

  /**
   * Wait for the vaults list to fully load (skeleton disappears, data appears)
   */
  async waitForVaultsToLoad(timeout = TIMEOUTS.LONG) {
    // Wait for heading to be visible
    await expect(this.page.getByRole("heading", { name: "Vaults" })).toBeVisible({ timeout });

    // Wait for at least one vault row to appear, or verify empty state
    try {
      await expect(this.page.locator("tr[data-testid^='vault-row-']").first()).toBeVisible({ timeout });
    } catch {
      // May be empty state - that's ok
    }
  }

  /**
   * Verify the vault list is visible with at least one vault
   */
  async verifyVaultListIsVisible(timeout = TIMEOUTS.LONG) {
    await expect(this.page.getByRole("heading", { name: "Vaults" })).toBeVisible({ timeout });
    await expect(this.page.locator("tr[data-testid^='vault-row-']").first()).toBeVisible({ timeout });
  }

  /**
   * Verify loading skeleton is visible
   */
  async verifyLoadingState() {
    const skeleton = this.page.locator(`[data-testid='${TESTIDS.SKELETON_LOADER}']`);
    await expect(skeleton.first()).toBeVisible({ timeout: TIMEOUTS.SHORT });
  }

  /**
   * Verify error state is displayed
   */
  async verifyErrorState() {
    // Check for common error indicators
    const errorText = this.page.locator("text=/error|failed|unable to load/i");
    await expect(errorText.first()).toBeVisible({ timeout: TIMEOUTS.MEDIUM });
  }

  /**
   * Verify empty state (no vaults)
   */
  async verifyEmptyState() {
    // Wait for page to load
    await this.page.waitForLoadState("domcontentloaded");
    await this.page.waitForTimeout(2000);

    // Verify no vault rows exist
    const vaultRows = await this.page.locator("tr[data-testid^='vault-row-']").count();
    expect(vaultRows).toBe(0);
  }

  /**
   * Get the total count of vaults in the list
   */
  async getVaultCount(): Promise<number> {
    return await this.page.locator("tr[data-testid^='vault-row-']").count();
  }

  /**
   * Get all vault addresses from the list
   */
  async getAllVaultAddresses(): Promise<string[]> {
    const rows = this.page.locator("tr[data-testid^='vault-row-']");
    const count = await rows.count();
    const addresses: string[] = [];

    for (let i = 0; i < count; i++) {
      const testId = await rows.nth(i).getAttribute("data-testid");
      if (testId) {
        addresses.push(testId.replace("vault-row-", ""));
      }
    }

    return addresses;
  }

  /**
   * Get vault row locator by address
   */
  getVaultRow(address: string): Locator {
    return this.page.locator(`tr[data-testid='${TESTIDS.VAULT_ROW(address)}']`);
  }

  /**
   * Get vault row locator by index
   */
  getVaultByIndex(index: number): Locator {
    return this.page.locator("tr[data-testid^='vault-row-']").nth(index);
  }

  /**
   * Get complete data from a vault row
   */
  async getVaultRowData(address: string): Promise<VaultRowData> {
    const row = this.getVaultRow(address);

    const nameElement = row.locator(`[data-testid='${TESTIDS.VAULT_NAME(address)}']`);
    const tvlElement = row.locator(`[data-testid='${TESTIDS.VAULT_TVL(address)}']`);
    const apyElement = row.locator(`[data-testid='${TESTIDS.VAULT_APY(address)}']`);

    return {
      address,
      name: await nameElement.innerText(),
      tvl: await tvlElement.innerText(),
      apy: await apyElement.innerText(),
    };
  }

  /**
   * Verify all essential data attributes exist for a vault row
   */
  async verifyVaultData(address: string, name: string = "") {
    const row = this.getVaultRow(address);
    await expect(row).toBeVisible();

    const nameElement = row.locator(`[data-testid='${TESTIDS.VAULT_NAME(address)}']`);
    const tvlElement = row.locator(`[data-testid='${TESTIDS.VAULT_TVL(address)}']`);
    const apyElement = row.locator(`[data-testid='${TESTIDS.VAULT_APY(address)}']`);

    await expect(nameElement).toBeVisible();
    await expect(tvlElement).toBeVisible();
    await expect(apyElement).toBeVisible();

    if (name) {
      await expect(nameElement).toContainText(name);
    }
  }

  /**
   * Click on a vault row to navigate to details
   */
  async selectVault(address: string) {
    const row = this.getVaultRow(address);
    await row.click();
  }

  /**
   * Click on the first available vault row
   */
  async selectFirstVault() {
    const firstRow = this.getVaultByIndex(0);
    await firstRow.click();
  }

  /**
   * Get the address of the first vault in the list
   */
  async getFirstVaultAddress(): Promise<string> {
    const testId = await this.getVaultByIndex(0).getAttribute("data-testid");
    return testId?.replace("vault-row-", "") || "";
  }

  /**
   * Verify APY is displayed with proper percentage format
   */
  async verifyApyFormat(address: string) {
    const apyElement = this.page.locator(`[data-testid='${TESTIDS.VAULT_APY(address)}']`);
    const apyText = await apyElement.innerText();

    // APY should contain a number and potentially a % sign
    expect(apyText).toMatch(/[\d.]+%?/);
  }

  /**
   * Verify TVL is displayed with proper currency format
   */
  async verifyTvlFormat(address: string) {
    const tvlElement = this.page.locator(`[data-testid='${TESTIDS.VAULT_TVL(address)}']`);
    const tvlText = await tvlElement.innerText();

    // TVL should contain a currency symbol or number
    expect(tvlText).toMatch(/[\$]?[\d,]+\.?\d*/);
  }
}
