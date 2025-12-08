import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { X } from "lucide-react";
import { Button } from "./ui/button";
import { useAccount } from "wagmi";
import { userService } from "@/services/userService";
import { useToast, toast } from "@/hooks/use-toast";
import { useUserAccess } from "@/hooks/useUserAccess";
import { apiPost, API_ROUTES } from "@/services/config";

interface AccessCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  hasAccess?: boolean;
}

export const AccessCodeModal: React.FC<AccessCodeModalProps> = ({
  isOpen,
  onClose,
  title = "Welcome to Neura Vaults",
  description = "Enter your invite code to access the platform",
  hasAccess = false,
}) => {
  const { toast } = useToast();
  const [code, setCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showWaitlist, setShowWaitlist] = useState(false);
  const [twitterHandle, setTwitterHandle] = useState("");
  const [isWaitlistLoading, setIsWaitlistLoading] = useState(false);
  const [waitlistError, setWaitlistError] = useState<string | null>(null);
  const [waitlistSuccess, setWaitlistSuccess] = useState(false);
  const { address: userAddress } = useAccount();
  const { refreshUserAccess } = useUserAccess();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;

    setIsLoading(true);
    try {
      if (!userAddress) {
        toast({
          title: "Wallet Required",
          description:
            "Please connect your wallet first to redeem an invite code.",
          variant: "destructive",
        });
        return;
      }

      // Check if user already has access
      if (hasAccess) {
        toast({
          title: "Already Redeemed",
          description:
            "You have already redeemed an invite code and have access to Neura Vaults.",
          variant: "destructive",
        });
        return;
      }

      await userService.redeemInviteCode(code.trim(), userAddress);

      toast({
        title: "Success!",
        description:
          "Invite code redeemed successfully. Welcome to Neura Vaults!",
      });

      refreshUserAccess();
      window.location.reload();
      onClose();
    } catch (error: any) {
      toast({
        title: "Redemption Failed",
        description:
          error.message || "Failed to redeem invite code. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setCode("");
    setIsLoading(false);
    setShowWaitlist(false);
    setTwitterHandle("");
    setIsWaitlistLoading(false);
    setWaitlistError(null);
    setWaitlistSuccess(false);
    onClose();
  };

  const normalizeTwitterHandle = (handle: string) => {
    const trimmed = handle.trim();
    const noAt = trimmed.startsWith("@") ? trimmed.slice(1) : trimmed;
    return noAt;
  };

  const validateWaitlistForm = (): { ok: boolean; message?: string } => {
    const handle = normalizeTwitterHandle(twitterHandle);
    if (!handle) {
      return { ok: false, message: "Twitter handle is required." };
    }

    const twitterRegex = /^[A-Za-z0-9_]{1,15}$/;
    if (!twitterRegex.test(handle)) {
      return { ok: false, message: "Enter a valid Twitter handle." };
    }

    return { ok: true };
  };

  const handleWaitlistSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setWaitlistError(null);
    setWaitlistSuccess(false);

    const validation = validateWaitlistForm();
    if (!validation.ok) {
      setWaitlistError(validation.message || "Invalid input.");
      toast({
        title: "Invalid Waitlist Details",
        description:
          validation.message ||
          "Please check your wallet connection and Twitter handle.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsWaitlistLoading(true);
      const payload = {
        wallet_address: userAddress as string,
        twitter_handle: normalizeTwitterHandle(twitterHandle),
      };
      await apiPost(API_ROUTES.ACCESS_REQUESTS, payload);

      setWaitlistSuccess(true);
      toast({
        title: "Request Submitted",
        description:
          "You have been added to the waitlist. We will reach out via Twitter.",
      });
    } catch (error: any) {
      const message = "Failed to submit waitlist request.";
      setWaitlistError(message);
      toast({
        title: "Submission Failed",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsWaitlistLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md bg-background/95 backdrop-blur-md border border-border shadow-2xl">
        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none disabled:pointer-events-none z-10"
        >
          <X className="h-5 w-5" />
          <span className="sr-only">Close</span>
        </button>

        <div className="flex flex-col items-center space-y-6 py-6">
          <div className={`flex items-center transition-all duration-1000`}>
            <img
              src="/logo.webp"
              className="w-[100px] h-[100px] rounded-xl transition-all duration-300"
            />
          </div>

          {/* Header */}
          <DialogHeader className="text-center space-y-2">
            <DialogTitle className="text-2xl font-semibold text-foreground text-center">
              {hasAccess ? "Access Already Granted" : title}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground text-base">
              {hasAccess
                ? "You already have access to Neura Vaults. No need to redeem another invite code."
                : !showWaitlist
                ? description
                : "Enter Twitter handle to join the waitlist."}
            </DialogDescription>
          </DialogHeader>

          {/* Form - only show if user doesn't have access */}
          {!hasAccess && !showWaitlist && (
            <form onSubmit={handleSubmit} className="w-full space-y-6">
              <div className="space-y-2">
                <Input
                  type="text"
                  placeholder="CODE"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  className="h-12 text-center text-lg font-mono tracking-widest bg-muted/30 border-border transition-all duration-200"
                  disabled={isLoading}
                  maxLength={20}
                />
              </div>

              <Button
                variant="wallet"
                disabled={!code.trim() || isLoading}
                className="w-full h-12 font-medium text-base transition-all border border-white/30 duration-200 disabled:hover:scale-100"
              >
                {isLoading ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                    <span>Verifying...</span>
                  </div>
                ) : (
                  "Continue"
                )}
              </Button>
            </form>
          )}

          {/* Waitlist form for users without access */}
          {!hasAccess && showWaitlist && (
            <form onSubmit={handleWaitlistSubmit} className="w-full space-y-4">
              <div className="space-y-2">
                <div className="relative">
                  <span className="absolute left-0 w-10 flex items-center justify-center h-full top-1/2 -translate-y-1/2 text-lg text-muted-foreground">
                    @
                  </span>
                  <Input
                    type="text"
                    placeholder="Enter Twitter handle"
                    value={twitterHandle}
                    onChange={(e) =>
                      setTwitterHandle(normalizeTwitterHandle(e.target.value))
                    }
                    className="h-12 text-base transition-all duration-200 pl-10"
                    disabled={isWaitlistLoading}
                    maxLength={15}
                  />
                </div>
                {waitlistError && (
                  <p className="text-xs text-red-500 mt-1">{waitlistError}</p>
                )}
                {waitlistSuccess && (
                  <p className="text-xs text-green-500 mt-1">
                    Successfully joined the waitlist.
                  </p>
                )}
              </div>

              <div className="flex gap-3">
                <Button
                  type="submit"
                  variant="wallet"
                  disabled={isWaitlistLoading}
                  className="flex-1 h-12 font-medium text-base transition-all border-white/30 duration-200"
                >
                  {isWaitlistLoading ? (
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                      <span>Submitting...</span>
                    </div>
                  ) : (
                    "Join Waitlist"
                  )}
                </Button>
                <Button
                  type="button"
                  variant="wallet"
                  onClick={() => {
                    setShowWaitlist(false);
                    setTwitterHandle("");
                    setWaitlistError(null);
                    setWaitlistSuccess(false);
                  }}
                  className="h-12 border-white/30"
                >
                  Cancel
                </Button>
              </div>
            </form>
          )}

          {/* Show close button for users who already have access */}
          {hasAccess && (
            <Button
              variant="wallet"
              onClick={handleClose}
              className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-medium text-base transition-all duration-200"
            >
              Close
            </Button>
          )}

          {/* Footer */}
          {!hasAccess && !showWaitlist && (
            <div className="text-center">
              <p className="text-sm text-muted-foreground">
                Don't have a code?{" "}
                <button
                  type="button"
                  className="text-white underline underline-offset-4 transition-colors"
                  onClick={() => {
                    if (!userAddress) {
                      toast({
                        title: "Wallet Required",
                        description:
                          "Please connect your wallet first to join the waitlist.",
                        variant: "destructive",
                      });
                    }
                    setShowWaitlist(true);
                  }}
                >
                  Join Waitlist
                </button>
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AccessCodeModal;