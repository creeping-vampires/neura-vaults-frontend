import React from 'react';
import { useLocation } from 'react-router-dom';
import { useUserAccess } from '../hooks/useUserAccess';

interface AdminRouteProps {
  children: React.ReactNode;
}

const AdminRoute: React.FC<AdminRouteProps> = ({ children }) => {
  const { isAdmin, isLoading, walletAddress } = useUserAccess();
  const location = useLocation();
  
  console.log("AdminRoute - isAdmin:", isAdmin, "isLoading:", isLoading, "walletAddress:", walletAddress);

  // Show loading state while checking admin access
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!walletAddress || !isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen -mt-10">
        <div className="text-center p-8 bg-background backdrop-blur-md border border-border rounded-lg max-w-md shadow-2xl">
          
          <h2 className="text-2xl font-semibold text-foreground mb-4">Access Denied</h2>
          
          <p className="text-muted-foreground mb-6 leading-relaxed">
            {!walletAddress 
              ? "Please connect your wallet to access the admin panel."
              : "Your wallet address does not have admin privileges to access this area."
            }
          </p>
          
          <div className="text-sm bg-muted/30 border border-border p-4 rounded-lg mb-6 space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Wallet:</span>
              <span className="text-foreground font-mono text-xs">
                {walletAddress ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}` : "Not connected"}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Admin Status:</span>
              <span className={`font-medium ${isAdmin ? "text-primary" : "text-destructive"}`}>
                {isAdmin ? "Yes" : "No"}
              </span>
            </div>
          </div>
          
          <button 
            onClick={() => window.location.href = '/'}
            className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-lg transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // Render admin content if user is admin
  return <>{children}</>;
};

export default AdminRoute;