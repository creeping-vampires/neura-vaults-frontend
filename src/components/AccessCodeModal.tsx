import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { X, Lock } from 'lucide-react';
import { Button } from './ui/button';
import { useActiveWallet } from "@/hooks/useActiveWallet";
import { userService } from "@/services/userService";
import { useToast } from "@/hooks/use-toast";
import { useUserAccess } from "@/hooks/useUserAccess";

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
  const [code, setCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { userAddress } = useActiveWallet();
  const { toast } = useToast();
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
      window.location.reload()
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
    onClose();
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
                : description}
            </DialogDescription>
          </DialogHeader>

          {/* Form - only show if user doesn't have access */}
          {!hasAccess && (
            <form onSubmit={handleSubmit} className="w-full space-y-6">
              <div className="space-y-2">
                <Input
                  type="text"
                  placeholder="CODE"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  className="h-12 text-center text-lg font-mono tracking-widest bg-muted/30 border-borderfocus:border-primary focus:bg-muted/70 transition-all duration-200"
                  disabled={isLoading}
                  maxLength={20}
                />
              </div>

              <Button
                variant="wallet"
                disabled={!code.trim() || isLoading}
                className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-medium text-base transition-all duration-200 disabled:hover:scale-100"
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
          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              Don't have a code?{" "}
              <button
                type="button"
                className="text-white hover:text-primary/80 underline underline-offset-4 transition-colors"
                onClick={() => {
                  // TODO: Implement waitlist functionality when backend is ready
                  console.log("Join waitlist clicked");
                }}
              >
                Join the waitlist
              </button>
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AccessCodeModal;