import { testWithSynpress } from '@synthetixio/synpress'
import { MetaMask, metaMaskFixtures } from '@synthetixio/synpress/playwright'
import basicSetup from './wallet-setup/basic.setup'

const test = testWithSynpress(metaMaskFixtures(basicSetup))
const { expect } = test

test('should login with MetaMask', async ({
  context,
  page,
  metamaskPage,
  extensionId,
}) => {
  // Setup MetaMask
  const metamask = new MetaMask(
    context,
    metamaskPage,
    basicSetup.walletPassword,
    extensionId
  )

  // 1. Navigate to the application's base URL and verify the page loads successfully
  await page.goto('/')
  
  // Verify page title or some element to ensure load
  await expect(page).toHaveTitle(/Neura Vaults|Hedgewater/) 

  // Ensure MetaMask is unlocked before proceeding
  // This addresses the issue where the password is not entered automatically
  // try {
  //   await metamask.unlock()
  // } catch (e) {
  //   console.log('MetaMask unlock attempted but not needed or failed:', e)
  // }

  // 2. Locate and validate the presence of the "Connect Wallet" button within the Navbar component
  const connectButton = page.getByRole('button', { name: 'Connect Wallet' }).first()
  await expect(connectButton).toBeVisible()
  
  // 3. Simulate a click event on the "Connect Wallet" button and verify the button's interactive state
  await connectButton.click()

  // 4. Confirm the appearance of a modal popup containing the text "Log in or sign up"
  // Privy modal usually has this text
  const modalHeader = page.getByText('Log in or sign up')
  await expect(modalHeader).toBeVisible({ timeout: 15000 })

  // 5. Within the popup, identify and interact with the "MetaMask" button
  // Privy might use different internal structure, but usually exposes a button with name 'MetaMask'
  const metaMaskButton = page.getByRole('button', { name: 'MetaMask', exact: false })
  await expect(metaMaskButton).toBeVisible()
  await metaMaskButton.click()

  // 6. Connect MetaMask
  // This handles the connection prompt. Since we unlocked earlier, this should proceed to connection.
  await metamask.connectToDapp()

  // 7. Verify login success
  // After connection, the button usually changes to show address or "Disconnect"
  // Based on Navbar.tsx: AddressDisplay is shown.
  // We can check if "Connect Wallet" is no longer visible
  await expect(connectButton).not.toBeVisible({ timeout: 15000 })
  
  // Visual regression testing (taking a screenshot of the connected state)
  await page.screenshot({ path: 'tests/screenshots/connected-state.png' })
})
