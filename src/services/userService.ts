import { apiPost, apiGet, API_ROUTES } from './config';

// Simple in-memory cache for user access responses per wallet
const userAccessCache = new Map<string, UserAccessResponse>();

async function fetchUserAccess(
  walletAddress: string
): Promise<UserAccessResponse> {
  const requestBody: UserAccessRequest = {
    wallet_address: walletAddress,
  };

  const response = await apiPost<UserAccessResponse>(
    API_ROUTES.CHECK_USER_ACCESS,
    requestBody
  );
  return response;
}

export interface UserAccessRequest {
  wallet_address: string;
}

export interface UserAccessResponse {
  wallet_address: string;
  has_access: boolean;
  is_admin: boolean;
  invite_code_used: string;
  redeemed_at: string;
}

export interface RedeemInviteCodeRequest {
  code: string;
  wallet_address: string;
}

export interface RedeemInviteCodeResponse {
  success: boolean;
  message: string;
}

export interface CreateInviteCodeRequest {
  expires_at: string;
}

export interface CreateInviteCodeResponse {
  code: string;
  expires_at: string;
  assign_kol_role: boolean;
  created_by: string;
}

export interface InviteCode {
  id: number;
  code: string;
  created_by: number;
  created_by_privy_id: string;
  creator_role: string;
  redeemable_credits: number;
  assign_kol_role: boolean;
  status: string;
  status_display: string;
  redeemed_by: number | null;
  redeemed_by_privy_id: string | null;
  redeemed_at: string | null;
  created_at: string;
  expires_at: string;
}

export type GetInviteCodesResponse = InviteCode[];

// Access Requests
export interface AccessRequest {
  id?: number;
  wallet_address?: string;
  twitter_handle?: string;
  created_at?: string;
  status?: string;
  status_display?: string;
  updated_at?: string;
  processed_at?: string;
  notes?: string;
}

export type GetAccessRequestsResponse = AccessRequest[];

export const userService = {
  /**
   * Check wallet address access
   */
  checkAccess: async (walletAddress: string): Promise<UserAccessResponse> => {
    try {
      const response = await fetchUserAccess(walletAddress);
      return response;
    } catch (error) {
      console.error("Error checking user access:", error);
      throw error;
    }
  },

  /**
   * Cached variant: returns cached response unless force=true; caches fresh responses.
   */
  checkAccessCached: async (
    walletAddress: string,
    force: boolean = false
  ): Promise<UserAccessResponse> => {
    try {
      if (!force && userAccessCache.has(walletAddress)) {
        return userAccessCache.get(walletAddress)!;
      }

      const response = await fetchUserAccess(walletAddress);
      userAccessCache.set(walletAddress, response);
      return response;
    } catch (error) {
      console.error("Error checking user access (cached):", error);
      throw error;
    }
  },

  /**
   * Redeem an invite code for a wallet address
   */
  redeemInviteCode: async (
    code: string,
    walletAddress: string
  ): Promise<RedeemInviteCodeResponse> => {
    try {
      const requestBody: RedeemInviteCodeRequest = {
        code: code.trim().toUpperCase(),
        wallet_address: walletAddress,
      };

      const response = await apiPost<RedeemInviteCodeResponse>(
        API_ROUTES.REDEEM_INVITE_CODE,
        requestBody,
        0 // No caching
      );

      return response;
    } catch (error) {
      console.error("Error redeeming invite code:", error);
      throw error;
    }
  },

  /**
   * Create a new invite code using the authenticated user's wallet
   */
  createInviteCode: async (
    expiresAt: string,
    walletAddress: string
  ): Promise<CreateInviteCodeResponse> => {
    try {
      const requestBody: CreateInviteCodeRequest = {
        expires_at: expiresAt,
      };

      // Add apiKey query parameter with the admin wallet address
      const urlWithApiKey = `${API_ROUTES.CREATE_INVITE_CODE}`;

      const response = await apiPost<CreateInviteCodeResponse>(
        urlWithApiKey,
        requestBody,
        0 // No caching
      );

      return response;
    } catch (error) {
      console.error("Error creating invite code:", error);
      throw error;
    }
  },

  /**
   * Get all invite codes (Admin only)
   */
  getInviteCodes: async (): Promise<GetInviteCodesResponse> => {
    try {
      const response = await apiGet<GetInviteCodesResponse>(
        API_ROUTES.GET_INVITE_CODES
      );

      return response;
    } catch (error) {
      console.error("Error fetching invite codes:", error);
      throw error;
    }
  },

  /**
   * Get all access requests (Admin only)
   */
  getAccessRequests: async (
    walletAddress: string
  ): Promise<GetAccessRequestsResponse> => {
    try {
      const response = await apiGet<GetAccessRequestsResponse>(
        API_ROUTES.ACCESS_REQUESTS,
        { api_key: walletAddress },
        0
      );
      return response;
    } catch (error) {
      console.error("Error fetching access requests:", error);
      throw error;
    }
  },
};

export default userService;