import { test, expect, createWalletHelpers } from './fixtures/walletFixtures';
import { PortfolioPage } from './pages/PortfolioPage';
import { TESTIDS, TIMEOUTS } from './helpers/testHelpers';

test.describe('Portfolio - User Deposits', () => {
    let portfolioPage: PortfolioPage;

    test.beforeEach(async ({ page, anvilReady }) => {
        test.skip(!anvilReady, 'Anvil is not running on port 8545');
        portfolioPage = new PortfolioPage(page);
        await portfolioPage.navigate();
        await portfolioPage.waitForPortfolioToLoad();
    });

    test('should display deposits card with value', async ({ page }) => {
        const depositsCard = await portfolioPage.getDepositsCard();
        await expect(depositsCard).toBeVisible();

        // Verify "Your Deposits" heading
        await expect(page.locator("text='Your Deposits'")).toBeVisible();

        // Get deposits value
        const depositsValue = await portfolioPage.getDepositsValue();
        expect(depositsValue).toMatch(/\$/); // Should contain dollar sign
        console.log('User Deposits:', depositsValue);
    });

    test('should display APY value', async () => {
        const apyValue = await portfolioPage.getAPYValue();
        expect(apyValue).toMatch(/[\d.]+%?/); // Should contain a number
        console.log('Portfolio APY:', apyValue);
    });
});

test.describe('Portfolio - Positions', () => {
    let portfolioPage: PortfolioPage;

    test.beforeEach(async ({ page, anvilReady }) => {
        test.skip(!anvilReady, 'Anvil is not running on port 8545');
        portfolioPage = new PortfolioPage(page);
        await portfolioPage.navigate();
        await portfolioPage.waitForPortfolioToLoad();
    });

    test('should display positions card with count', async ({ page }) => {
        expect(await portfolioPage.isPositionsCardVisible()).toBe(true);

        // Verify "Your Positions" heading
        await expect(page.locator("text='Your Positions'")).toBeVisible();

        // Get positions count
        const countText = await portfolioPage.getPositionsCount();
        console.log('Positions count badge:', countText);
        expect(countText).toMatch(/\d+ positions?/);
    });

    test('should show positions or empty state', async () => {
        const positionsCount = await portfolioPage.getPositionsCountNumber();

        if (positionsCount === 0) {
            // Should show empty state
            expect(await portfolioPage.isEmptyStateVisible()).toBe(true);
            console.log('No positions - empty state displayed');
        } else {
            // Should show position rows
            const rows = await portfolioPage.getAllPositionRows();
            const rowCount = await rows.count();
            expect(rowCount).toBe(positionsCount);
            console.log(`Found ${positionsCount} position(s)`);
        }
    });
});

test.describe('Portfolio - Complete Flow', () => {
    let portfolioPage: PortfolioPage;

    test.beforeEach(async ({ page, anvilReady }) => {
        test.skip(!anvilReady, 'Anvil is not running on port 8545');
        portfolioPage = new PortfolioPage(page);
    });

    test('should complete full portfolio verification flow', async ({ page }) => {
        const wallet = createWalletHelpers(page);

        // Navigate to portfolio
        await portfolioPage.navigate();
        await portfolioPage.waitForPortfolioToLoad();

        // Verify wallet connected
        expect(await wallet.isWalletConnected()).toBe(true);

        // Verify deposits card
        const depositsCard = await portfolioPage.getDepositsCard();
        await expect(depositsCard).toBeVisible();

        const depositsValue = await portfolioPage.getDepositsValue();
        const apyValue = await portfolioPage.getAPYValue();

        console.log('Portfolio Summary:');
        console.log('  Deposits:', depositsValue);
        console.log('  APY:', apyValue);

        // Verify positions card
        expect(await portfolioPage.isPositionsCardVisible()).toBe(true);

        const positionsCount = await portfolioPage.getPositionsCountNumber();
        console.log('  Positions:', positionsCount);

        if (positionsCount > 0) {
            // Verify position rows are visible
            const rows = await portfolioPage.getAllPositionRows();
            await expect(rows.first()).toBeVisible();
        }

        console.log('✅ Portfolio verification completed successfully');
    });
});
