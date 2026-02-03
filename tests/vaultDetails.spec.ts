import { test, expect } from './fixtures/walletFixtures';
import { VaultDetailsPage, ChartTab } from './pages/VaultDetailsPage';
import { VaultsPage } from './pages/VaultsPage';
import { TIMEOUTS, TESTIDS } from './helpers/testHelpers';

test.describe('Vault Details - Stats & Info', () => {
    let vaultDetailsPage: VaultDetailsPage;
    let vaultsPage: VaultsPage;

    test.beforeEach(async ({ page, anvilReady }) => {
        test.skip(!anvilReady, 'Anvil is not running on port 8545');

        vaultsPage = new VaultsPage(page);
        vaultDetailsPage = new VaultDetailsPage(page);

        await vaultsPage.navigate();
        await vaultsPage.waitForVaultsToLoad();
        const address = await vaultsPage.getFirstVaultAddress();
        await vaultsPage.selectVault(address);
        await vaultDetailsPage.waitForDetailsToLoad();
    });

    test('should display vault name correctly', async () => {
        const displayedName = await vaultDetailsPage.getVaultName();
        expect(displayedName).toBeTruthy();
        expect(displayedName.toLowerCase()).toContain('vault');
    });

    test('should display total AUM and APY values', async ({ page }) => {
        const aumElement = page.locator(`[data-testid='${TESTIDS.TOTAL_AUM}']`);
        await expect(aumElement).toBeVisible();
        const aumText = await aumElement.innerText();
        expect(aumText).toMatch(/[\$\d]/);

        const apyElement = page.locator(`[data-testid='${TESTIDS.CURRENT_APY}']`);
        await expect(apyElement).toBeVisible();
        const apyText = await apyElement.innerText();
        expect(apyText.toLowerCase()).toContain('apy');

        console.log('Total AUM:', aumText);
        console.log('Current APY:', apyText);
    });
});

test.describe('Vault Details - User Position', () => {
    let vaultDetailsPage: VaultDetailsPage;
    let vaultsPage: VaultsPage;

    test.beforeEach(async ({ page, anvilReady }) => {
        test.skip(!anvilReady, 'Anvil is not running on port 8545');

        vaultsPage = new VaultsPage(page);
        vaultDetailsPage = new VaultDetailsPage(page);

        await vaultsPage.navigate();
        await vaultsPage.waitForVaultsToLoad();
        const address = await vaultsPage.getFirstVaultAddress();
        await vaultsPage.selectVault(address);
        await vaultDetailsPage.waitForDetailsToLoad();
    });

    test('should display user position card with state', async ({ page }) => {
        const positionCard = page.locator(`[data-testid='${TESTIDS.USER_POSITION_CARD}']`);
        await expect(positionCard).toBeVisible();

        const isEmpty = await vaultDetailsPage.isUserPositionEmpty();
        console.log('User position is empty:', isEmpty);

        if (isEmpty) {
            const emptyState = page.locator(`[data-testid='${TESTIDS.USER_POSITION_EMPTY}']`);
            await expect(emptyState).toBeVisible();
            const text = await emptyState.innerText();
            expect(text.toLowerCase()).toContain('no position');
        }
    });
});

test.describe('Vault Details - Charts', () => {
    let vaultDetailsPage: VaultDetailsPage;
    let vaultsPage: VaultsPage;

    test.beforeEach(async ({ page, anvilReady }) => {
        test.skip(!anvilReady, 'Anvil is not running on port 8545');

        vaultsPage = new VaultsPage(page);
        vaultDetailsPage = new VaultDetailsPage(page);

        await vaultsPage.navigate();
        await vaultsPage.waitForVaultsToLoad();
        const address = await vaultsPage.getFirstVaultAddress();
        await vaultsPage.selectVault(address);
        await vaultDetailsPage.waitForDetailsToLoad();
    });

    test('should display all chart tabs and switch between them', async ({ page }) => {
        await vaultDetailsPage.waitForChartToLoad();

        // Verify all tabs are visible
        await expect(page.locator(`[data-testid='${TESTIDS.CHART_TAB_TVL}']`)).toBeVisible();
        await expect(page.locator(`[data-testid='${TESTIDS.CHART_TAB_SHARE_PRICE}']`)).toBeVisible();
        await expect(page.locator(`[data-testid='${TESTIDS.CHART_TAB_APY}']`)).toBeVisible();

        // Switch between tabs and verify content
        const tabs: ChartTab[] = ['tvl', 'sharePrice', 'apy'];
        for (const tab of tabs) {
            await vaultDetailsPage.switchChartTab(tab);
            const content = page.locator(`[data-testid='chart-content-${tab}']`);
            await expect(content).toBeVisible();
        }
    });

    test('should switch timeframe between 7D and 1M', async () => {
        await vaultDetailsPage.waitForChartToLoad();

        await vaultDetailsPage.selectTimeframe('1M');
        await vaultDetailsPage.waitForChartToLoad(3000);

        await vaultDetailsPage.selectTimeframe('7D');
        await vaultDetailsPage.waitForChartToLoad(3000);
    });

    test('should load chart data without errors', async () => {
        await vaultDetailsPage.waitForChartToLoad();
        await vaultDetailsPage.verifyChartDataLoaded();
    });
});

test.describe('Vault Details - Info Tabs', () => {
    let vaultDetailsPage: VaultDetailsPage;
    let vaultsPage: VaultsPage;

    test.beforeEach(async ({ page, anvilReady }) => {
        test.skip(!anvilReady, 'Anvil is not running on port 8545');

        vaultsPage = new VaultsPage(page);
        vaultDetailsPage = new VaultDetailsPage(page);

        await vaultsPage.navigate();
        await vaultsPage.waitForVaultsToLoad();
        const address = await vaultsPage.getFirstVaultAddress();
        await vaultsPage.selectVault(address);
        await vaultDetailsPage.waitForDetailsToLoad();
    });

    test('should display all info tabs and switch between them', async ({ page }) => {
        // Verify all tabs are visible
        await expect(page.locator(`[data-testid='${TESTIDS.INFO_TAB_TERMINAL}']`)).toBeVisible();
        await expect(page.locator(`[data-testid='${TESTIDS.INFO_TAB_DETAILS}']`)).toBeVisible();
        await expect(page.locator(`[data-testid='${TESTIDS.INFO_TAB_POOLS}']`)).toBeVisible();
        await expect(page.locator(`[data-testid='${TESTIDS.INFO_TAB_COMPOSITION}']`)).toBeVisible();

        // Terminal is default
        await expect(page.locator(`[data-testid='${TESTIDS.INFO_CONTENT_TERMINAL}']`)).toBeVisible();

        // Switch through all tabs
        await page.locator(`[data-testid='${TESTIDS.INFO_TAB_DETAILS}']`).click();
        await expect(page.locator(`[data-testid='${TESTIDS.INFO_CONTENT_DETAILS}']`)).toBeVisible();

        await page.locator(`[data-testid='${TESTIDS.INFO_TAB_POOLS}']`).click();
        await expect(page.locator(`[data-testid='${TESTIDS.INFO_CONTENT_POOLS}']`)).toBeVisible();

        await page.locator(`[data-testid='${TESTIDS.INFO_TAB_COMPOSITION}']`).click();
        await expect(page.locator(`[data-testid='${TESTIDS.INFO_CONTENT_COMPOSITION}']`)).toBeVisible();

        await page.locator(`[data-testid='${TESTIDS.INFO_TAB_TERMINAL}']`).click();
        await expect(page.locator(`[data-testid='${TESTIDS.INFO_CONTENT_TERMINAL}']`)).toBeVisible();
    });

    test('should display AgentTerminal with logs', async ({ page }) => {
        const agentTerminal = page.locator(`[data-testid='${TESTIDS.AGENT_TERMINAL}']`);
        await expect(agentTerminal).toBeVisible();

        const agentName = page.locator(`[data-testid='${TESTIDS.AGENT_TERMINAL_NAME}']`);
        await expect(agentName).toBeVisible();
        expect(await agentName.innerText()).toContain('Neura');

        const agentStatus = page.locator(`[data-testid='${TESTIDS.AGENT_TERMINAL_STATUS}']`);
        await expect(agentStatus).toBeVisible();
        expect((await agentStatus.innerText()).toLowerCase()).toContain('active');

        await page.waitForTimeout(3000); // Wait for logs to load
        const logEntries = page.locator(`[data-testid='${TESTIDS.AGENT_TERMINAL_LOG_ENTRY}']`);
        const count = await logEntries.count();
        console.log(`Agent terminal log entries found: ${count}`);

        if (count > 0) {
            await expect(logEntries.first()).toBeVisible();
        }
    });

    test('should display VaultActivity in Details tab', async ({ page }) => {
        await page.locator(`[data-testid='${TESTIDS.INFO_TAB_DETAILS}']`).click();
        await page.waitForTimeout(2000);

        await expect(page.locator(`[data-testid='${TESTIDS.VAULT_ACTIVITY}']`)).toBeVisible();

        const activityItems = page.locator(`[data-testid='${TESTIDS.VAULT_ACTIVITY_ITEM}']`);
        const count = await activityItems.count();
        console.log(`Vault activity items found: ${count}`);

        if (count > 0) {
            const itemText = await activityItems.first().innerText();
            console.log(`First activity: ${itemText.substring(0, 80)}...`);
        }
    });

    test('should display pool allocations with APY in Pools tab', async ({ page }) => {
        await page.locator(`[data-testid='${TESTIDS.INFO_TAB_POOLS}']`).click();
        await page.waitForTimeout(2000);

        await expect(page.locator("text='Active Pools'")).toBeVisible();

        const poolItems = page.locator(`[data-testid='${TESTIDS.POOL_ALLOCATION_ITEM}']`);
        const count = await poolItems.count();
        console.log(`Pool allocation items found: ${count}`);

        if (count > 0) {
            const itemText = await poolItems.first().innerText();
            expect(itemText).toMatch(/APY/i);
            console.log(`First pool: ${itemText.substring(0, 80)}...`);
        }
    });

    test('should display composition chart in Composition tab', async ({ page }) => {
        await page.locator(`[data-testid='${TESTIDS.INFO_TAB_COMPOSITION}']`).click();

        const loadingState = page.locator(`[data-testid='${TESTIDS.COMPOSITION_LOADING}']`);
        await expect(loadingState).not.toBeVisible({ timeout: 10000 });

        await expect(page.locator("text='Portfolio Composition'")).toBeVisible();

        const compositionData = page.locator(`[data-testid='${TESTIDS.COMPOSITION_DATA}']`);
        if (await compositionData.isVisible()) {
            await expect(page.locator(`[data-testid='${TESTIDS.COMPOSITION_CHART}']`)).toBeVisible();
            console.log('Composition chart displayed');
        } else {
            console.log('No composition data - empty/error state displayed');
        }
    });
});

test.describe('Vault Details - Complete Flow', () => {
    let vaultDetailsPage: VaultDetailsPage;
    let vaultsPage: VaultsPage;

    test.beforeEach(async ({ page, anvilReady }) => {
        test.skip(!anvilReady, 'Anvil is not running on port 8545');

        vaultsPage = new VaultsPage(page);
        vaultDetailsPage = new VaultDetailsPage(page);
    });

    test('should complete full vault details view flow', async ({ page }) => {
        await vaultsPage.navigate();
        await vaultsPage.verifyVaultListIsVisible();

        const count = await vaultsPage.getVaultCount();
        expect(count).toBeGreaterThan(0);
        console.log(`Found ${count} vaults`);

        const firstRow = await vaultsPage.getVaultByIndex(0);
        const testId = await firstRow.getAttribute('data-testid');
        const address = testId?.replace('vault-row-', '');
        expect(address).toBeTruthy();

        const rowData = await vaultsPage.getVaultRowData(address!);
        console.log(`Selected vault: ${rowData.name} (${address})`);

        await vaultsPage.selectVault(address!);
        await expect(page).toHaveURL(new RegExp(`/vaults/${address}`, 'i'), { timeout: TIMEOUTS.NAVIGATION });

        await vaultDetailsPage.waitForDetailsToLoad();
        await vaultDetailsPage.verifyVaultStats();
        await vaultDetailsPage.verifyUserPosition();
        await vaultDetailsPage.verifyCharts();

        await vaultDetailsPage.switchChartTab('sharePrice');
        await vaultDetailsPage.switchChartTab('apy');
        await vaultDetailsPage.switchChartTab('tvl');

        console.log('✅ Full vault details flow completed successfully');
    });
});
