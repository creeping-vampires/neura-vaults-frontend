import { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from "react-router-dom";
import {
  Wallet,
  LogIn,
  Copy,
  Check,
  Triangle,
  LogOut,
  Menu,
  Key,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatAddress, switchToChain } from "@/lib/utils";
import { AddressDisplay } from "@/components/shared/AddressDisplay";
import { useAccount } from "wagmi";
import { useUserAccess } from "@/hooks/useUserAccess";
import AccessCodeModal from "@/components/AccessCodeModal";
import { useDisconnect } from "wagmi";
import { useWalletConnection } from "@/hooks/useWalletConnection";
import { isE2EMode } from "@/lib/e2eWagmiConfig";

// Conditionally import usePrivy only in non-E2E mode
let usePrivy: any = () => ({ logout: async () => {} });
if (!isE2EMode()) {
  // Dynamic import doesn't work for hooks, so we use a try-catch
  try {
    const privy = require('@privy-io/react-auth');
    usePrivy = privy.usePrivy;
  } catch {
    // In E2E mode, Privy won't be available
  }
}

interface NavbarProps {
  isMobile?: boolean;
  onToggleSidebar?: () => void;
}

const Navbar = ({ onToggleSidebar }: NavbarProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { disconnect } = useDisconnect();
  const privyHook = usePrivy();
  const logout = privyHook?.logout || (async () => {});

  const { address: userAddress } = useAccount();

  const { hasAccess, isLoading } = useUserAccess();

  const [copiedWallet, setCopiedWallet] = useState(false);
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [showAccessCodeModal, setShowAccessCodeModal] = useState(false);
  const [currentChainId, setCurrentChainId] = useState<string | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [shouldRedirectAfterLogin, setShouldRedirectAfterLogin] =
    useState(false);
  const { isConnecting, connectWithFallback } = useWalletConnection();

  const checkCurrentNetwork = async () => {
    if (!window.ethereum) return;

    try {
      const chainId = await window.ethereum.request({ method: "eth_chainId" });
      setCurrentChainId(chainId);
    } catch (error) {
      console.error("Error checking network:", error);
    }
  };

  // Check connection status
  const isConnected = Boolean(userAddress);
  const displayAddress = userAddress;
  // In E2E mode, skip wrong network check since Anvil chain ID may differ
  const isWrongNetwork = isConnected && currentChainId !== "0x3e7";
  // Get chain label from chain ID
  const getChainLabel = (chainId: string | null) => {
    if (!chainId) return "Unknown";
    const id = parseInt(chainId, 16);
    switch (id) {
      case 999:
        return "Hyper EVM";
      case 1:
        return "Ethereum";
      case 10:
        return "Optimism";
      case 42161:
        return "Arbitrum";
      case 8453:
        return "Base";
      case 137:
        return "Polygon";
      case 56:
        return "BSC";
      case 11155111:
        return "Sepolia";
      default:
        return `Chain ID ${id}`;
    }
  };

  // Check network on wallet connection and listen for network changes
  useEffect(() => {
    if (window.ethereum && userAddress) {
      checkCurrentNetwork();

      // Listen for network changes using ethers.js
      const handleChainChanged = (chainId: string) => {
        setCurrentChainId(chainId);
      };

      if (window.ethereum) {
        window.ethereum.on?.("chainChanged", handleChainChanged);

        return () => {
          window.ethereum.removeListener?.("chainChanged", handleChainChanged);
        };
      }
    }
  }, [userAddress]);

  useEffect(() => {
    if (shouldRedirectAfterLogin && isConnected && location.pathname === "/") {
      navigate("/vaults", { replace: true });
      setShouldRedirectAfterLogin(false);
    }
  }, [shouldRedirectAfterLogin, isConnected, navigate]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard
      .writeText(text)
      .then(() => {
        setCopiedWallet(true);
        const timer = setTimeout(() => setCopiedWallet(false), 2000);
        return () => clearTimeout(timer);
      })
      .catch((err) => {
        console.error("Failed to copy: ", err);
      });
  };

  const handleLogout = async () => {
    try {
      await disconnect();
      await logout();
      try {
        const { logConnectionEvent } = await import("@/services/walletService");
        logConnectionEvent({ type: "disconnect" });
      } catch {}
    } catch (e) {
      console.warn("Error disconnecting wagmi connectors:", e);
    }
    // Storage clearing logic removed
    setShowWalletModal(false);
    navigate("/", { replace: true });
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        modalRef.current &&
        !modalRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setShowWalletModal(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <>
      <nav className="border-b border-border px-3 sm:px-6 py-3.5 backdrop-blur-[10px] bg-background/70 relative z-[60]">
        <div className="flex items-center justify-between">
          <div className="flex items-start gap-1 sm:gap-3">
            <button
              type="button"
              aria-label="Toggle menu"
              onClick={onToggleSidebar}
              className="burger-menu inline-flex lg:hidden items-center justify-center w-10 h-10 rounded-md border border-border text-foreground hover:bg-border/50"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div
              className={`flex lg:hidden items-center transition-all duration-1000`}
            >
              <div className="relative group">
                <img
                  src="/logo.webp"
                  className="w-[45px] h-[45px] rounded-xl transition-all duration-300"
                />
              </div>
              <div className="ml-0.5 overflow-hidden">
                <h1 className="text-sidebar-foreground font-medium text-xl font-libertinus transition-all duration-300">
                  Neura
                </h1>
                <p className="text-xs text-muted-foreground font-libertinus">
                  Vaults
                </p>
              </div>
            </div>
            {/* <div className="hidden sm:flex flex-col">
              <h1 className="text-sidebar-foreground font-medium text-2xl font-libertinus transition-all duration-300">
                {pageInfo.title}
              </h1>
              <p className="text-sm text-muted-foreground font-libertinus">
                {pageInfo.description}
              </p>
            </div> */}
          </div>

          {/* Right side - Actions */}
          <div className="flex items-center space-x-4">
            {isWrongNetwork && (
              <Button
                onClick={switchToChain}
                variant="destructive"
                className="space-x-2 lg:hidden"
                title={`Current: ${getChainLabel(
                  currentChainId
                )} — Click to switch to Hyper EVM`}
              >
                <Triangle className="h-4 w-4" />
                <span className="font-medium font-libertinus">
                  Switch Network
                </span>
              </Button>
            )}

            {/* Wallet Connection */}
            <div className="flex items-center space-x-3">
              {isConnected ? (
                <>
                  {!hasAccess && (
                    <Button
                      onClick={() => setShowAccessCodeModal(true)}
                      variant="outline"
                      className="space-x-2"
                    >
                      <Key className="h-4 w-4" />
                      <span className="font-medium font-libertinus">
                        Get Access
                      </span>
                    </Button>
                  )}

                  <Button
                    ref={buttonRef}
                    onClick={() => setShowWalletModal(!showWalletModal)}
                    variant="wallet"
                    className="space-x-2"
                    data-testid="wallet-address-btn"
                  >
                    {/* <Wallet className="h-4 w-4" /> */}
                    <AddressDisplay
                      address={displayAddress}
                      className="font-medium font-libertinus"
                      variant="prominent"
                      data-testid="wallet-address"
                    />
                  </Button>
                </>
              ) : (
                  <Button
                    onClick={async () => {
                      const desiredPath = location.pathname.startsWith("/vaults/")
                        ? location.pathname
                        : "/vaults";
                      setShouldRedirectAfterLogin(true);
                      await connectWithFallback(desiredPath);
                    }}
                    disabled={isConnecting}
                    variant="wallet"
                    className="space-x-2"
                    data-testid="connect-wallet-btn"
                  >
                    <LogIn className="h-4 w-4" />
                  <span className="font-medium font-libertinus">
                    {isConnecting ? "Connecting..." : "Connect Wallet"}
                  </span>
                </Button>
              )}
            </div>
          </div>
        </div>
      </nav>

      {showWalletModal && (
        <div
          ref={modalRef}
          className="absolute right-6 top-[calc(60px)] w-80 rounded-lg border border-border bg-background p-4 shadow-lg z-[1000]"
        >
          {userAddress && (
            <div className="mb-3 rounded-md border border-border p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Wallet className="h-4 w-4" />
                  <span className="font-libertinus text-sm font-medium text-gray-200">
                    {formatAddress(userAddress)}
                  </span>
                </div>
                <Button
                  onClick={() => copyToClipboard(userAddress)}
                  variant="ghost"
                  size="icon"
                >
                  {copiedWallet ? (
                    <Check className="h-4 w-4 text-foreground" />
                  ) : (
                    <Copy className="h-4 w-4 text-foreground" />
                  )}
                </Button>
              </div>
            </div>
          )}

          {isConnected && (
            <div className="space-y-3">
              {/* Network Status and Switch Button */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-libertinus text-muted-foreground">
                    Network:
                  </span>
                  <div className="flex items-center space-x-2">
                    <div
                      className={`w-2 h-2 rounded-full ${
                        isWrongNetwork ? "bg-red-500" : "bg-green-500"
                      }`}
                    />
                    <span className="font-libertinus">
                      {getChainLabel(currentChainId)}
                    </span>
                  </div>
                </div>
              </div>
              {isWrongNetwork && (
                <Button
                  onClick={switchToChain}
                  variant="destructive"
                  className="w-full space-x-2"
                  title={`Current: ${getChainLabel(
                    currentChainId
                  )} — Click to switch to Hyper EVM`}
                >
                  <Triangle className="h-4 w-4" />
                  <span className="font-medium font-libertinus">
                    Switch Network
                  </span>
                </Button>
              )}

              <Button
                onClick={handleLogout}
                variant="wallet"
                className="w-full flex items-center justify-between space-x-2"
              >
                <span className="font-libertinus">Log Out</span>
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      )}

      <AccessCodeModal
        isOpen={showAccessCodeModal}
        onClose={() => setShowAccessCodeModal(false)}
        hasAccess={hasAccess}
      />
    </>
  );
};

export default Navbar;