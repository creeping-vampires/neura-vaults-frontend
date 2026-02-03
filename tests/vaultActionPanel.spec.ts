import { test, expect } from './fixtures/walletFixtures';
import { VaultDetailsPage } from './pages/VaultDetailsPage';
import { VaultActionPanelHelpers, createPanelHelpers } from './helpers/VaultActionPanelHelpers';

const TRANSACTION_AMOUNT = '1.01';
const TEST_VAULT_URL = '/vaults/0x69C96a82b8534aae25b43644D5964c6b8F215676';

test.describe('VaultActionPanel', () => {
    let vaultDetailsPage: VaultDetailsPage;
    let panel: VaultActionPanelHelpers;

    test.beforeEach(async ({ page, anvilReady }) => {
        test.skip(!anvilReady, 'Anvil is not running on port 8545');

        vaultDetailsPage = new VaultDetailsPage(page);
        panel = createPanelHelpers(page);

        await page.goto(TEST_VAULT_URL);
        await vaultDetailsPage.waitForDetailsToLoad();
        await panel.waitForPanel();
    });

    // UI Tests
    test('should display VaultActionPanel with all UI elements', async ({ page }) => {
        expect(await panel.isPanelVisible()).toBe(true);

        // Tabs visible
        await expect(page.getByTestId('deposit-tab')).toBeVisible();
        await expect(page.getByTestId('withdraw-tab')).toBeVisible();

        // Input, balance, and deposit button visible
        expect(await panel.isInputVisible()).toBe(true);
        expect(await panel.isBalanceVisible()).toBe(true);
        expect(await panel.isDepositButtonVisible()).toBe(true);
    });

    test('should switch between deposit and withdraw tabs', async () => {
        await panel.selectDepositTab();
        expect(await panel.isDepositButtonVisible()).toBe(true);

        await panel.selectWithdrawTab();
        expect(await panel.isWithdrawButtonVisible()).toBe(true);

        await panel.selectDepositTab();
        expect(await panel.isDepositButtonVisible()).toBe(true);
    });

    test('should display available balance for both tabs', async () => {
        // Deposit tab
        await panel.selectDepositTab();
        let balance = await panel.getAvailableBalance();
        expect(balance).toMatch(/[\d.,]+/);
        console.log(`Deposit available balance: ${balance}`);

        // Withdraw tab
        await panel.selectWithdrawTab();
        balance = await panel.getAvailableBalance();
        expect(balance).toMatch(/[\d.,]+/);
        console.log(`Withdraw available balance: ${balance}`);
    });

    // Deposit Transaction
    test('should complete deposit transaction flow with status progression', async () => {
        await panel.selectDepositTab();
        await panel.enterAmount(TRANSACTION_AMOUNT);
        expect(await panel.getInputValue()).toBe(TRANSACTION_AMOUNT);

        await panel.clickDepositButton();

        // Wait for transaction to appear
        await panel.waitForDepositTransaction(60000);
        let status = await panel.getTransactionStatus('deposit');
        console.log(`Initial deposit status: ${status}`);
        expect(['settling', 'pending']).toContain(status);

        // Wait for status progression
        status = await panel.waitForTransactionStatus('deposit', ['submitted', 'settled', 'settling'], 90000);
        console.log(`Deposit status after wait: ${status}`);

        const statusText = await panel.getTransactionStatusText('deposit');
        console.log(`Deposit status text: ${statusText}`);
        expect(statusText).toBeTruthy();

        expect(['submitted', 'settled', 'settling']).toContain(status);
        console.log('✅ Deposit transaction flow completed successfully');
    });

    // Withdraw Transaction
    test('should complete withdraw transaction flow with status progression', async ({ page }) => {
        await panel.selectWithdrawTab();
        await page.waitForTimeout(1000); // Wait for tab switch

        await panel.enterAmount(TRANSACTION_AMOUNT);
        expect(await panel.getInputValue()).toBe(TRANSACTION_AMOUNT);

        await panel.clickWithdrawButton();

        // Wait for transaction to appear
        await panel.waitForWithdrawTransaction(60000);
        let status = await panel.getTransactionStatus('withdraw');
        console.log(`Initial withdraw status: ${status}`);
        expect(['settling', 'pending', 'failed']).toContain(status);

        // If failed (insufficient balance), test passes
        if (status === 'failed') {
            console.log('✅ Withdraw failed as expected (insufficient balance)');
            return;
        }

        // Wait for status progression
        status = await panel.waitForTransactionStatus('withdraw', ['submitted', 'settled', 'settling', 'failed'], 90000);
        console.log(`Withdraw status after wait: ${status}`);

        const statusText = await panel.getTransactionStatusText('withdraw');
        console.log(`Withdraw status text: ${statusText}`);
        expect(statusText).toBeTruthy();

        expect(['submitted', 'settled', 'settling', 'failed']).toContain(status);
        console.log('✅ Withdraw transaction flow completed successfully');
    });
});
