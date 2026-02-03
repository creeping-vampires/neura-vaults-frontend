/**
 * Global Setup for Playwright E2E Tests
 * 
 * This runs once before all tests to verify prerequisites.
 */
import { FullConfig } from '@playwright/test';

async function globalSetup(config: FullConfig) {
  console.log('🧪 E2E Test Suite Starting...');
  
  // Check if Anvil is running
  const anvilRunning = await checkAnvil();
  if (!anvilRunning) {
    console.warn('\n⚠️  WARNING: Anvil is not running on port 8545');
    console.warn('   Start Anvil with: anvil --port 8545\n');
    console.warn('   Some tests may be skipped.\n');
  } else {
    console.log('✅ Anvil is running on port 8545');
  }
  
  console.log('🌐 Testing against:', config.projects[0]?.use?.baseURL || 'http://localhost:8080');
  console.log('');
}

async function checkAnvil(): Promise<boolean> {
  try {
    const response = await fetch('http://localhost:8545', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_chainId',
        params: [],
        id: 1,
      }),
    });
    return response.ok;
  } catch {
    return false;
  }
}

export default globalSetup;
