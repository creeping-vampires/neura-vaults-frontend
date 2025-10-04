import { useEffect, useRef, useCallback } from 'react';
import { usePrivy, useLogout } from '@privy-io/react-auth';
import { useActiveWallet } from './useActiveWallet';

/**
 * Custom hook to monitor MetaMask connection status and automatically
 * logout from Privy when MetaMask is disconnected or account changes
 */
export const useMetaMaskMonitor = () => {
  const { authenticated, user } = usePrivy();
  const { logout } = useLogout();
  const { wallet, hasWalletLogin, isPrivyWallet } = useActiveWallet();
  const lastKnownAccountRef = useRef<string | null>(null);
  const isLoggingOutRef = useRef<boolean>(false);

  const handleLogout = useCallback(async (reason: string) => {
    if (isLoggingOutRef.current) {
      return; // Prevent multiple simultaneous logout attempts
    }
    
    isLoggingOutRef.current = true;
    console.log(`MetaMask monitor: ${reason} - logging out from Privy`);
    
    try {
      await logout();
    } catch (error) {
      console.error('Error during logout:', error);
    } finally {
      isLoggingOutRef.current = false;
    }
  }, [logout]);

  useEffect(() => {
    // Only monitor if user is authenticated with a wallet (not Privy embedded wallet)
    if (!authenticated || !hasWalletLogin || isPrivyWallet || !wallet) {
      return;
    }

    // Store the current account for comparison
    if (wallet.address) {
      lastKnownAccountRef.current = wallet.address.toLowerCase();
    }

    const handleAccountsChanged = async (accounts: string[]) => {
      console.log('MetaMask accounts changed:', accounts);
      
      // If no accounts are available, MetaMask is disconnected
      if (accounts.length === 0) {
        await handleLogout('MetaMask disconnected');
        return;
      }

      // If the account changed to a different one, also logout
      const newAccount = accounts[0].toLowerCase();
      if (lastKnownAccountRef.current && lastKnownAccountRef.current !== newAccount) {
        await handleLogout('MetaMask account changed');
        return;
      }

      // Update the last known account
      lastKnownAccountRef.current = newAccount;
    };

    const handleDisconnect = async () => {
      await handleLogout('MetaMask disconnected');
    };

    const checkMetaMaskConnection = async () => {
      if (!window.ethereum) return;

      try {
        // Check if MetaMask is still connected
        const accounts = await window.ethereum.request({ 
          method: 'eth_accounts' 
        });
        
        if (accounts.length === 0 && authenticated && hasWalletLogin) {
          await handleLogout('MetaMask not connected but user is authenticated');
        }
      } catch (error) {
        console.error('Error checking MetaMask connection:', error);
        // If we can't check the connection, assume it's disconnected
        if (authenticated && hasWalletLogin) {
          await handleLogout('Error checking MetaMask connection');
        }
      }
    };

    // Initial connection check
    checkMetaMaskConnection();

    // Add event listeners
    if (window.ethereum) {
      window.ethereum.on('accountsChanged', handleAccountsChanged);
      window.ethereum.on('disconnect', handleDisconnect);

      // Also listen for the 'close' event which is fired when MetaMask is closed
      window.ethereum.on('close', handleDisconnect);
    }

    // Cleanup event listeners
    return () => {
      if (window.ethereum) {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
        window.ethereum.removeListener('disconnect', handleDisconnect);
        window.ethereum.removeListener('close', handleDisconnect);
      }
    };
  }, [authenticated, hasWalletLogin, isPrivyWallet, wallet, handleLogout]);

  // Additional effect to monitor wallet changes
  useEffect(() => {
    if (!authenticated || !hasWalletLogin || isPrivyWallet) {
      return;
    }

    // If wallet becomes undefined while user is authenticated with wallet login
    if (!wallet && authenticated && hasWalletLogin) {
      handleLogout('Wallet became undefined');
    }
  }, [wallet, authenticated, hasWalletLogin, isPrivyWallet, handleLogout]);
};
