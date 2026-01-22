import { defineWalletSetup } from '@synthetixio/synpress'
import { Phantom } from '@synthetixio/synpress/playwright'

// Define a test seed phrase and password
const SEED_PHRASE = 'test test test test test test test test test test test junk'
const PASSWORD = 'Tester@1234'

export default defineWalletSetup(PASSWORD, async (context, walletPage) => {
  // phantom instance
  const phantom = new Phantom(context, walletPage, PASSWORD)

  // Import the wallet using the seed phrase
  await phantom.importWallet(SEED_PHRASE)

  // await walletPage.waitForTimeout(300000);
  
  // Additional setup steps can be added here, such as:
  // - Adding custom networks
  // - Importing tokens
  // - Setting up specific account states
})