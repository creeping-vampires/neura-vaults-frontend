import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { useAccount } from "wagmi";
import { userService, UserAccessResponse } from "@/services/userService";

export interface UserAccessState {
  isLoading: boolean;
  isAdmin: boolean;
  hasAccess: boolean;
  error: string | null;
  adminData: UserAccessResponse | null;
}

export interface UserAccessContextType extends UserAccessState {
  refreshUserAccess: () => void;
  walletAddress: string | undefined;
}

const UserAccessContext = createContext<UserAccessContextType | undefined>(undefined);

export const UserAccessProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { address: userAddress } = useAccount();
  const [state, setState] = useState<UserAccessState>({
    isLoading: true,
    isAdmin: false,
    hasAccess: false,
    error: null,
    adminData: null,
  });

  const lastCheckedAddress = useRef<string | null>(null);
  const isChecking = useRef(false);

  const checkUserAccess = useCallback(
    async (walletAddress: string, force = false) => {
      // Prevent duplicate calls for the same address unless forced
      if (!force && lastCheckedAddress.current === walletAddress) {
        // If we already have data for this address, just return (or ensure loading is false)
        setState(prev => ({ ...prev, isLoading: false }));
        return;
      }
      
      // Prevent concurrent checks for the same address
      if (isChecking.current) return;

      isChecking.current = true;
      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      try {
        const response = await userService.checkAccess(walletAddress);
        
        lastCheckedAddress.current = walletAddress;
        
        setState({
          isLoading: false,
          isAdmin: response.is_admin,
          hasAccess: response.has_access,
          error: null,
          adminData: response,
        });
      } catch (error) {
        console.error("Error checking user access:", error);
        setState({
          isLoading: false,
          isAdmin: false,
          hasAccess: false,
          error:
            error instanceof Error
              ? error.message
              : "Failed to check user access",
          adminData: {
            wallet_address: walletAddress,
            has_access: false,
            is_admin: false,
            invite_code_used: "",
            redeemed_at: "",
          },
        });
      } finally {
        isChecking.current = false;
      }
    },
    []
  );

  // Check user access when wallet address changes
  useEffect(() => {
    if (userAddress) {
      checkUserAccess(userAddress, false);
    } else {
      // Reset state when no wallet is connected
      lastCheckedAddress.current = null;
      setState({
        isLoading: false,
        isAdmin: false,
        hasAccess: false,
        error: null,
        adminData: null,
      });
    }
  }, [userAddress, checkUserAccess]);

  // Refresh function to manually check user access
  const refreshUserAccess = useCallback(() => {
    if (userAddress) {
      checkUserAccess(userAddress, true);
    }
  }, [userAddress, checkUserAccess]);

  const value = {
    ...state,
    refreshUserAccess,
    walletAddress: userAddress,
  };

  return (
    <UserAccessContext.Provider value={value}>
      {children}
    </UserAccessContext.Provider>
  );
};

export const useUserAccess= () => {
  const context = useContext(UserAccessContext);
  if (context === undefined) {
    throw new Error("useUserAccessContext must be used within a UserAccessProvider");
  }
  return context;
};
