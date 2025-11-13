import { useState, useCallback } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { useToast } from '@/hooks/use-toast';
import { logConnectionEvent } from '@/services/walletService';

function getInjectedProviderName(): string | undefined {
  const eth: any = (window as any).ethereum;
  if (!eth) return undefined;
  // Try primary provider first
  if ((eth as any).isRabby) return "Rabby";
  if (eth.isMetaMask) return 'MetaMask';
  if (eth.isBraveWallet) return 'BraveWallet';
  if (eth.isCoinbaseWallet) return "CoinbaseWallet";
  // If multiple providers exist, pick a known flag
  const providers: any[] = Array.isArray(eth.providers) ? eth.providers : [];
  for (const p of providers) {
    if (p?.isRabby) return "Rabby";
    if (p?.isMetaMask) return 'MetaMask';
    if (p?.isBraveWallet) return 'BraveWallet';
    if (p?.isCoinbaseWallet) return "CoinbaseWallet";
  }
  return 'unknown';
}

function isProviderConflictError(error: any): boolean {
  const msg = String(error?.message || error);
  return (
    msg.includes('global Ethereum provider') ||
    msg.includes('only a getter') ||
    msg.includes('Cannot set property ethereum') ||
    msg.includes('#<Window>')
  );
}

export function useWalletConnection() {
  const { connectWallet } = usePrivy();
  const { toast } = useToast();
  const [isConnecting, setIsConnecting] = useState(false);

  const connectWithFallback = useCallback(
    async (redirectPath?: string) => {
      const providerName = getInjectedProviderName();
      try {
        setIsConnecting(true);
        if (redirectPath) {
          localStorage.setItem('POST_LOGIN_REDIRECT_PATH', redirectPath);
        }
        logConnectionEvent({ type: 'attempt', providerName });

        await connectWallet();
        logConnectionEvent({ type: 'success', providerName });
      } catch (error: any) {
        logConnectionEvent({
          type: 'failure',
          providerName,
          errorMessage: String(error?.message || error),
        });

        if (isProviderConflictError(error)) {
          toast({
            title: 'Wallet provider conflict',
            description:
              'Multiple wallet extensions detected. Disable extras (Brave/Rabby/Coinbase) and try again. Only external wallets are supported.',
          });
        } else {
          toast({
            title: 'Connection failed',
            description:
              String(error?.message || error) || 'Unknown error while connecting.',
          });
        }
      } finally {
        setIsConnecting(false);
      }
    },
    [connectWallet]
  );

  return { isConnecting, connectWithFallback };
}