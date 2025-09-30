import { useState, useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Wallet,
  LogIn,
  Copy,
  Check,
  Triangle,
  LogOut,
  Upload,
  Menu,
  Key,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePrivy, useLogout } from "@privy-io/react-auth";
import { formatAddress, switchToChain } from "@/lib/utils";
import { AddressDisplay } from "@/components/shared/AddressDisplay";
import { ethers } from "ethers";
import { useActiveWallet } from "@/hooks/useActiveWallet";
import { useUserAccess } from "@/hooks/useUserAccess";
import AccessCodeModal from "@/components/AccessCodeModal";
import { useToast } from "@/hooks/use-toast";

interface NavbarProps {
  isMobile?: boolean;
  onToggleSidebar?: () => void;
}

const Navbar = ({ isMobile = false, onToggleSidebar }: NavbarProps) => {
  const location = useLocation();
  const { login, authenticated, exportWallet } = usePrivy();
  const { logout } = useLogout();
  const { toast } = useToast();

  const { wallet, userAddress, hasEmailLogin, hasWalletLogin, isPrivyWallet } =
    useActiveWallet();

  const { hasAccess } = useUserAccess();

  const [copiedWallet, setCopiedWallet] = useState(false);
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [showAccessCodeModal, setShowAccessCodeModal] = useState(false);
  const [currentChainId, setCurrentChainId] = useState<string | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const checkCurrentNetwork = async () => {
    if (!window.ethereum) return;

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const network = await provider.getNetwork();
      const chainId = `0x${network.chainId.toString(16)}`;
      setCurrentChainId(chainId);
    } catch (error) {
      console.error("Error checking network:", error);
    }
  };

  const isWrongNetwork =
    authenticated && wallet && !isPrivyWallet && currentChainId !== "0x3e7";

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
    if (window.ethereum && wallet && !isPrivyWallet) {
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
  }, [wallet]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard
      .writeText(text)
      .then(() => {
        setCopiedWallet(true);
        setTimeout(() => setCopiedWallet(false), 2000);
      })
      .catch((err) => {
        console.error("Failed to copy: ", err);
      });
  };

  const handleExportWallet = async () => {
    try {
      await exportWallet();
    } catch (error) {
      console.error("Error exporting wallet:", error);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      setShowWalletModal(false);
    } catch (error) {
      console.error("Error logging out:", error);
    }
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

  const getPageInfo = () => {
    switch (location.pathname) {
      case "/":
        return {
          title: "Dashboard",
          description: `Welcome to Neura! Hello ${
            userAddress ? formatAddress(userAddress) : "Guest"
          }`,
        };
      case "/markets":
        return {
          title: "Vaults",
          description: "Explore and trade across all available vaults",
        };
      case "/portfolio":
        return {
          title: "Portfolio",
          description:
            "Track your positions, earnings, and transaction history",
        };
      default:
        // Handle vault details and other dynamic routes
        if (location.pathname.startsWith("/vaults/")) {
          return {
            title: "Vault Details",
            description: "Manage your vault position and view analytics",
          };
        }
        return {
          title: "Neura Vault",
          description: "Decentralized finance platform",
        };
    }
  };

  const pageInfo = getPageInfo();

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
                <h1 className="text-sidebar-foreground font-medium text-xl font-libertinus transition-all duration-300 group-hover:text-white">
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
              {authenticated ? (
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
                  >
                    {/* <Wallet className="h-4 w-4" /> */}
                    <AddressDisplay
                      address={userAddress}
                      className="font-medium font-libertinus"
                      variant="prominent"
                    />
                  </Button>
                </>
              ) : (
                <Button
                  onClick={() => login()}
                  variant="wallet"
                  className="space-x-2"
                >
                  <LogIn className="h-4 w-4" />
                  <span className="font-medium font-libertinus">Login</span>
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

          <div className="space-y-3">
            {/* Network Status and Switch Button */}
            {wallet && !isPrivyWallet && (
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
            )}
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

            {hasEmailLogin && (
              <Button
                onClick={handleExportWallet}
                variant="wallet"
                className="w-full flex items-center justify-between space-x-2"
              >
                <span className="font-libertinus">Export Wallet</span>
                <Upload className="h-4 w-4" />
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