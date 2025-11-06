import { useEffect, useRef } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { useNavigate } from "react-router-dom";
import { useActiveWallet } from "./useActiveWallet";

export const useMetaMaskMonitor = () => {
  const { logout, authenticated } = usePrivy();
  const navigate = useNavigate();
  const { wallet, isPrivyWallet, userAddress } = useActiveWallet();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const failureCountRef = useRef<number>(0);
  const lastKnownAddressRef = useRef<string | null>(null);
  const initializedRef = useRef<boolean>(false);
  const thresholdRef = useRef<number>(3);

  useEffect(() => {
    // Only monitor when authenticated and using an external wallet (MetaMask/OKX/Rabby)
    if (!authenticated || isPrivyWallet) return;
    // Require an address to avoid false positives on first load
    if (!wallet || !userAddress) return;

    let provider: any | null = null;
    let accountsChangedHandler: ((accounts: string[]) => void) | null = null;
    let disconnectHandler: ((error: any) => void) | null = null;

    const triggerLogout = async () => {
      try {
        await logout();
      } catch (e) {
        console.warn("Logout error:", e);
      } finally {
        navigate("/");
      }
    };

    const checkWalletState = async () => {
      try {
        if (!provider) return;

        // MetaMask-specific unlocked check when available
        const metamask = (provider as any)?._metamask;
        if (metamask && typeof metamask.isUnlocked === "function") {
          const unlocked = await metamask.isUnlocked();
          if (!unlocked) {
            failureCountRef.current += 1;
            if (
              failureCountRef.current >= thresholdRef.current &&
              document.visibilityState === "visible"
            ) {
              await triggerLogout();
              return;
            }
          }
        }

        // Standard EIP-1193 accounts check
        const accounts = await provider
          .request?.({ method: "eth_accounts" })
          .catch(() => []);
        if (Array.isArray(accounts)) {
          if (accounts.length > 0) {
            // Reset failures if we see an account that matches last known
            if (
              lastKnownAddressRef.current &&
              accounts.includes(lastKnownAddressRef.current)
            ) {
              failureCountRef.current = 0;
            }
          } else {
            // Empty accounts may be transient right after refresh; require consecutive failures
            failureCountRef.current += 1;
            if (
              failureCountRef.current >= thresholdRef.current &&
              document.visibilityState === "visible"
            ) {
              await triggerLogout();
              return;
            }
          }
        }

        // Fallback heuristics (some wallets expose selectedAddress while locked/disconnected)
        const selected = (provider as any)?.selectedAddress;
        if (!selected && (!accounts || accounts.length === 0)) {
          failureCountRef.current += 1;
          if (
            failureCountRef.current >= thresholdRef.current &&
            document.visibilityState === "visible"
          ) {
            await triggerLogout();
            return;
          }
        } else if (
          selected &&
          lastKnownAddressRef.current &&
          selected.toLowerCase() === lastKnownAddressRef.current.toLowerCase()
        ) {
          failureCountRef.current = 0;
        }

        const isConnectedFn = (provider as any)?.isConnected;
        if (typeof isConnectedFn === "function") {
          const connected = isConnectedFn.call(provider);
          if (!connected) {
            failureCountRef.current += 1;
            if (
              failureCountRef.current >= thresholdRef.current &&
              document.visibilityState === "visible"
            ) {
              await triggerLogout();
              return;
            }
          }
        }
      } catch (error) {
        console.error("Error checking wallet state:", error);
      }
    };

    const detectBrand = (
      prov: any
    ): "metamask" | "okx" | "rabby" | "coinbase" | "unknown" => {
      if (!prov) return "unknown";
      if (prov.isMetaMask) return "metamask";
      if ((prov as any).isOKXWallet) return "okx";
      if ((prov as any).isRabby || (prov as any).rabby) return "rabby";
      if ((prov as any).isCoinbaseWallet) return "coinbase";
      return "unknown";
    };

    const init = async () => {
      try {
        // Set last known address from Privy/wallet before checks
        lastKnownAddressRef.current = userAddress as string;
        // Delay initial check slightly to avoid false positives during wallet warm-up
        await new Promise((resolve) => setTimeout(resolve, 1000));
        initializedRef.current = true;
        // Prefer provider from Privy external wallet; fallback to window.ethereum
        if (
          wallet &&
          !isPrivyWallet &&
          typeof wallet.getEthereumProvider === "function"
        ) {
          provider = await wallet.getEthereumProvider();
        }
        if (!provider && (window as any).ethereum) {
          provider = (window as any).ethereum;
        }
        if (!provider) return;

        // Set per-wallet failure threshold: Rabby is immediate, others require stability
        const brand = detectBrand(provider);
        thresholdRef.current = brand === "rabby" ? 1 : 3;

        accountsChangedHandler = (accounts: string[]) => {
          if (!Array.isArray(accounts) || accounts.length === 0) {
            // Fire-and-forget logout to avoid blocking event loop
            failureCountRef.current += 1;
            if (
              failureCountRef.current >= thresholdRef.current &&
              document.visibilityState === "visible"
            ) {
              void triggerLogout();
            }
          }
          if (Array.isArray(accounts) && accounts.length > 0) {
            failureCountRef.current = 0;
          }
        };

        disconnectHandler = () => {
          failureCountRef.current += 1;
          if (
            failureCountRef.current >= thresholdRef.current &&
            document.visibilityState === "visible"
          ) {
            void triggerLogout();
          }
        };

        provider.on?.("accountsChanged", accountsChangedHandler);
        provider.on?.("disconnect", disconnectHandler);

        await checkWalletState();
        intervalRef.current = setInterval(checkWalletState, 5000);
      } catch (e) {
        console.error("Failed to initialize wallet monitor:", e);
      }
    };

    void init();

    return () => {
      if (provider?.removeListener) {
        if (accountsChangedHandler)
          provider.removeListener("accountsChanged", accountsChangedHandler);
        if (disconnectHandler)
          provider.removeListener("disconnect", disconnectHandler);
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [authenticated, wallet, isPrivyWallet, userAddress, logout, navigate]);
};
