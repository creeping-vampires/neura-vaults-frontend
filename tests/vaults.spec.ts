import { test, expect, createWalletHelpers } from './fixtures/walletFixtures';
import { VaultsPage } from './pages/VaultsPage';
import { TIMEOUTS } from './helpers/testHelpers';

test.describe('Vaults Page - Data Display', () => {
  let vaultsPage: VaultsPage;

  test.beforeEach(async ({ page, anvilReady }) => {
    test.skip(!anvilReady, 'Anvil is not running on port 8545');
    vaultsPage = new VaultsPage(page);
  });

  test('should display vault list after successful page load', async ({ page }) => {
    await vaultsPage.navigate();
    await vaultsPage.waitForVaultsToLoad();

    // Verify heading is visible
    await expect(page.getByRole('heading', { name: 'Vaults' })).toBeVisible();

    // Verify at least one vault row is displayed
    const count = await vaultsPage.getVaultCount();
    expect(count).toBeGreaterThan(0);
    console.log(`Found ${count} vaults`);
  });

  test('should display correct vault count matching loaded data', async () => {
    await vaultsPage.navigate();
    await vaultsPage.waitForVaultsToLoad();

    const count = await vaultsPage.getVaultCount();
    expect(count).toBeGreaterThan(0);

    // Get all vault addresses to verify uniqueness
    const addresses = await vaultsPage.getAllVaultAddresses();
    expect(addresses.length).toBe(count);

    // Verify all addresses are unique
    const uniqueAddresses = new Set(addresses);
    expect(uniqueAddresses.size).toBe(addresses.length);
  });

  test('should display name, TVL, and APY for first vault row', async () => {
    await vaultsPage.navigate();
    await vaultsPage.waitForVaultsToLoad();

    const address = await vaultsPage.getFirstVaultAddress();
    expect(address).toBeTruthy();

    // Verify first vault has all required data attributes
    await vaultsPage.verifyVaultData(address);
  });

  test('should display APY with proper percentage formatting', async () => {
    await vaultsPage.navigate();
    await vaultsPage.waitForVaultsToLoad();

    const address = await vaultsPage.getFirstVaultAddress();
    expect(address).toBeTruthy();

    await vaultsPage.verifyApyFormat(address);
  });

  test('should display TVL with proper currency formatting', async () => {
    await vaultsPage.navigate();
    await vaultsPage.waitForVaultsToLoad();

    const address = await vaultsPage.getFirstVaultAddress();
    expect(address).toBeTruthy();

    await vaultsPage.verifyTvlFormat(address);
  });

  test('should extract complete vault row data', async () => {
    await vaultsPage.navigate();
    await vaultsPage.waitForVaultsToLoad();

    const address = await vaultsPage.getFirstVaultAddress();
    expect(address).toBeTruthy();

    const rowData = await vaultsPage.getVaultRowData(address);

    expect(rowData.address).toBe(address);
    expect(rowData.name).toBeTruthy();
    expect(rowData.tvl).toBeTruthy();
    expect(rowData.apy).toBeTruthy();

    console.log('Vault row data:', rowData);
  });
});

test.describe('Vaults Page - Navigation', () => {
  let vaultsPage: VaultsPage;

  test.beforeEach(async ({ page, anvilReady }) => {
    test.skip(!anvilReady, 'Anvil is not running on port 8545');
    vaultsPage = new VaultsPage(page);
  });

  test('should navigate to vault details on row click', async ({ page }) => {
    await vaultsPage.navigate();
    await vaultsPage.waitForVaultsToLoad();

    const address = await vaultsPage.getFirstVaultAddress();
    expect(address).toBeTruthy();

    // Click on the vault row
    await vaultsPage.selectVault(address);

    // Verify navigation to details page
    await expect(page).toHaveURL(new RegExp(`/vaults/${address}`, 'i'), {
      timeout: TIMEOUTS.NAVIGATION
    });
  });

  test('should maintain wallet connection after vault navigation', async ({ page }) => {
    const wallet = createWalletHelpers(page);

    await vaultsPage.navigate();
    await vaultsPage.waitForVaultsToLoad();

    // Verify wallet is connected
    await wallet.waitForWalletConnected();
    expect(await wallet.isWalletConnected()).toBe(true);

    // Navigate to vault details
    const address = await vaultsPage.getFirstVaultAddress();
    await vaultsPage.selectVault(address);

    // Wait for navigation
    await expect(page).toHaveURL(new RegExp(`/vaults/${address}`, 'i'), {
      timeout: TIMEOUTS.NAVIGATION
    });

    // Verify wallet is still connected
    await page.waitForTimeout(1000);
    expect(await wallet.isWalletConnected()).toBe(true);
  });

  test('should navigate using selectFirstVault helper', async ({ page }) => {
    await vaultsPage.navigate();
    await vaultsPage.waitForVaultsToLoad();

    const addressBefore = await vaultsPage.getFirstVaultAddress();

    await vaultsPage.selectFirstVault();

    await expect(page).toHaveURL(new RegExp(`/vaults/${addressBefore}`, 'i'), {
      timeout: TIMEOUTS.NAVIGATION
    });
  });
});

test.describe('Vaults Page - Wallet Integration', () => {
  let vaultsPage: VaultsPage;

  test.beforeEach(async ({ page, anvilReady }) => {
    test.skip(!anvilReady, 'Anvil is not running on port 8545');
    vaultsPage = new VaultsPage(page);
  });

  test('should auto-connect wallet on page load (E2E mode)', async ({ page }) => {
    const wallet = createWalletHelpers(page);

    await vaultsPage.navigate();
    await vaultsPage.waitForVaultsToLoad();

    // In E2E mode, wallet should auto-connect
    await wallet.waitForWalletConnected();
    expect(await wallet.isWalletConnected()).toBe(true);

    // Verify connect button is not visible
    const connectBtn = page.getByTestId('connect-wallet-btn');
    await expect(connectBtn).not.toBeVisible();
  });

  test('should persist wallet connection after page reload', async ({ page }) => {
    const wallet = createWalletHelpers(page);

    await vaultsPage.navigate();
    await vaultsPage.waitForVaultsToLoad();
    await wallet.waitForWalletConnected();

    // Reload the page
    await page.reload();
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    // Wallet should still be connected
    expect(await wallet.isWalletConnected()).toBe(true);
  });
});

test.describe('Vaults Page - Data Integrity', () => {
  let vaultsPage: VaultsPage;

  test.beforeEach(async ({ page, anvilReady }) => {
    test.skip(!anvilReady, 'Anvil is not running on port 8545');
    vaultsPage = new VaultsPage(page);
  });

  test('should have unique data-testid for each vault row', async () => {
    await vaultsPage.navigate();
    await vaultsPage.waitForVaultsToLoad();

    const addresses = await vaultsPage.getAllVaultAddresses();

    // All addresses should be unique
    const uniqueSet = new Set(addresses);
    expect(uniqueSet.size).toBe(addresses.length);

    // Each address should look like a valid Ethereum address or identifier
    for (const addr of addresses) {
      expect(addr).toBeTruthy();
      expect(addr.length).toBeGreaterThan(0);
    }
  });

  test('should verify first vault row has required data-testid attributes', async ({ page }) => {
    await vaultsPage.navigate();
    await vaultsPage.waitForVaultsToLoad();

    const address = await vaultsPage.getFirstVaultAddress();
    expect(address).toBeTruthy();

    // Verify row exists
    const row = page.locator(`tr[data-testid='vault-row-${address}']`);
    await expect(row).toBeVisible();

    // Verify name element exists
    const name = row.locator(`[data-testid='vault-name-${address}']`);
    await expect(name).toBeVisible();

    // Verify TVL element exists
    const tvl = row.locator(`[data-testid='vault-tvl-${address}']`);
    await expect(tvl).toBeVisible();

    // Verify APY element exists
    const apy = row.locator(`[data-testid='vault-apy-${address}']`);
    await expect(apy).toBeVisible();
  });

  test('should verify first vault name is non-empty string', async () => {
    await vaultsPage.navigate();
    await vaultsPage.waitForVaultsToLoad();

    const address = await vaultsPage.getFirstVaultAddress();
    expect(address).toBeTruthy();

    const rowData = await vaultsPage.getVaultRowData(address);
    expect(rowData.name.trim()).toBeTruthy();
    expect(rowData.name.length).toBeGreaterThan(0);
  });
});
