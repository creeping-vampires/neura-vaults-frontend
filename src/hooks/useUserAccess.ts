import { useState, useEffect, useCallback } from 'react';
import { useAccount } from "wagmi";
import { userService, UserAccessResponse } from "../services/userService";

export interface UserAccessState {
  isLoading: boolean;
  isAdmin: boolean;
  hasAccess: boolean;
  error: string | null;
  adminData: UserAccessResponse | null;
}

export const useUserAccess = () => {
  const { address: userAddress } = useAccount();
  const [state, setState] = useState<UserAccessState>({
    isLoading: true,
    isAdmin: false,
    hasAccess: false,
    error: null,
    adminData: null,
  });

  const checkUserAccess = useCallback(
    async (walletAddress: string, force = false) => {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      try {
        const response = await userService.checkAccessCached(
          walletAddress,
          force
        );
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
      }
    },
    []
  );

  // Check user access when wallet address changes; caching prevents repeated calls
  useEffect(() => {
    if (userAddress) {
      checkUserAccess(userAddress, false);
    } else {
      // Reset state when no wallet is connected
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

  return {
    ...state,
    refreshUserAccess,
    walletAddress: userAddress,
  };
};

export default useUserAccess;