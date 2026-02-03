import { test, expect, createWalletHelpers } from './fixtures/walletFixtures';
import { DashboardPage } from './pages/DashboardPage';
import { TESTIDS, TIMEOUTS } from './helpers/testHelpers';

test.describe('Dashboard - Stats Cards', () => {
    let dashboardPage: DashboardPage;

    test.beforeEach(async ({ page, anvilReady }) => {
        test.skip(!anvilReady, 'Anvil is not running on port 8545');
        dashboardPage = new DashboardPage(page);
        await dashboardPage.navigate();
        await dashboardPage.waitForDashboardToLoad();
    });

    test('should display all stats cards (TVL, Volume, APY)', async ({ page }) => {
        await dashboardPage.verifyStatsCardsVisible();

        // Verify TVL card
        await expect(page.locator(`[data-testid='${TESTIDS.DASHBOARD_TVL}']`)).toBeVisible();
        const tvlValue = await dashboardPage.getTVLValue();
        expect(tvlValue).toMatch(/\$/); // Should contain dollar sign
        console.log('TVL:', tvlValue);

        // Verify Volume card
        await expect(page.locator(`[data-testid='${TESTIDS.DASHBOARD_VOLUME}']`)).toBeVisible();
        const volumeValue = await dashboardPage.getVolumeValue();
        expect(volumeValue).toMatch(/\$/);
        console.log('Volume:', volumeValue);

        // Verify APY card
        await expect(page.locator(`[data-testid='${TESTIDS.DASHBOARD_APY}']`)).toBeVisible();
        const apyValue = await dashboardPage.getAPYValue();
        expect(apyValue).toMatch(/%/); // Should contain percentage
        console.log('APY:', apyValue);
    });

    test('should display TVL value with proper formatting', async () => {
        const tvlValue = await dashboardPage.getTVLValue();
        // TVL should be a formatted number with $
        expect(tvlValue).toMatch(/\$[\d,]+\.?\d*/);
    });

    test('should display APY value with proper formatting', async () => {
        const apyValue = await dashboardPage.getAPYValue();
        // APY should contain a number and percentage sign
        expect(apyValue).toMatch(/[\d.]+\s*%/);
    });
});

test.describe('Dashboard - Token Balances', () => {
    let dashboardPage: DashboardPage;

    test.beforeEach(async ({ page, anvilReady }) => {
        test.skip(!anvilReady, 'Anvil is not running on port 8545');
        dashboardPage = new DashboardPage(page);
        await dashboardPage.navigate();
        await dashboardPage.waitForDashboardToLoad();
    });

    test('should display token balances card when connected', async ({ page }) => {
        const wallet = createWalletHelpers(page);

        // Verify wallet is connected in E2E mode
        expect(await wallet.isWalletConnected()).toBe(true);

        // Token balances card should be visible
        expect(await dashboardPage.isTokenBalancesVisible()).toBe(true);

        // Verify Token Balances heading
        await expect(page.locator("text='Token Balances'")).toBeVisible();
    });

    test('should display HYPE balance when connected', async () => {
        expect(await dashboardPage.isHypeBalanceVisible()).toBe(true);
    });
});

test.describe('Dashboard - Complete Flow', () => {
    let dashboardPage: DashboardPage;

    test.beforeEach(async ({ page, anvilReady }) => {
        test.skip(!anvilReady, 'Anvil is not running on port 8545');
        dashboardPage = new DashboardPage(page);
    });

    test('should complete full dashboard verification flow', async ({ page }) => {
        const wallet = createWalletHelpers(page);

        // Navigate to dashboard
        await dashboardPage.navigate();
        await dashboardPage.waitForDashboardToLoad();

        // Verify wallet connected
        expect(await wallet.isWalletConnected()).toBe(true);

        // Verify all stats cards
        await dashboardPage.verifyStatsCardsVisible();

        // Get and log all values
        const tvl = await dashboardPage.getTVLValue();
        const volume = await dashboardPage.getVolumeValue();
        const apy = await dashboardPage.getAPYValue();

        console.log('Dashboard Stats:');
        console.log('  TVL:', tvl);
        console.log('  Volume:', volume);
        console.log('  APY:', apy);

        // Verify token balances section
        expect(await dashboardPage.isTokenBalancesVisible()).toBe(true);

        console.log('✅ Dashboard verification completed successfully');
    });
});
