import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { PrivyProvider } from "@privy-io/react-auth";
import { WagmiProvider } from "@privy-io/wagmi";
import { hyperliquid, wagmiConfig } from "./lib/privyConfig";
import React, { Suspense, useEffect, useState, lazy } from "react";
import { useMultiVault } from "./hooks/useMultiVault";
import { usePrice } from "@/hooks/usePrice";
import { useTransactionHistory } from "@/hooks/useTransactionHistory";
import { useActiveWallet } from "@/hooks/useActiveWallet";
import SkeletonLoader from "@/components/skeleton";
import Navbar from "./components/Navbar";
import Sidebar from "./components/Sidebar";
const AppContainer = lazy(() => import("./pages/AppContainer"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Vaults = lazy(() => import("./pages/Vaults"));
const VaultDetails = lazy(() => import("./pages/VaultDetails"));
const Portfolio = lazy(() => import("./pages/Portfolio"));
const Admin = lazy(() => import("./pages/Admin"));
const AdminRoute = lazy(() => import("./components/AdminRoute"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes cacheTime
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      retry: 1,
    },
    mutations: {
      retry: 1,
    },
  },
});

const Loader = () => (
  <div className="h-screen flex flex-row relative">
    <Sidebar />
    <div
      className={`w-full flex flex-col overflow-hidden transition-all duration-300`}
    >
      <Navbar />
      <main className="w-full flex-1 overflow-auto relative z-1">
        <SkeletonLoader />
      </main>
    </div>
  </div>
);
const AppRoutes = () => {
  const { isLoading: isVaultsLoading, error: vaultsError } = useMultiVault();
  const { isPriceLoading, priceError } = usePrice();
  const { userAddress } = useActiveWallet();
  const isConnected = Boolean(userAddress);
  const { isLoading: isTxLoading, error: txError } = useTransactionHistory();

  const isLoading =
    isVaultsLoading || isPriceLoading || (isConnected && isTxLoading);

  const hasError = Boolean(
    vaultsError || priceError || (isConnected && txError)
  );

  if (isLoading || hasError) {
    return <Loader />;
  }

  return (
    <Suspense fallback={<Loader />}>
      <AppContainer>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/vaults" element={<Vaults />} />
          <Route path="/vaults/:vaultId" element={<VaultDetails />} />
          <Route path="/portfolio" element={<Portfolio />} />
          <Route
            path="/admin"
            element={
              <AdminRoute>
                <Admin />
              </AdminRoute>
            }
          />
        </Routes>
      </AppContainer>
    </Suspense>
  );
};

const AppContent = () => {
  return (
    <Router>
      <AppRoutes />
    </Router>
  );
};

// Use hyperliquid chain definition from privyConfig
function App() {
  // Get Privy App ID with fallback
  const privyAppId =
    import.meta.env.VITE_PRIVY_APP_ID || process.env.VITE_PRIVY_APP_ID || "";

  if (!privyAppId) {
    console.error(
      "VITE_PRIVY_APP_ID is not defined. Please check your environment configuration."
    );
  }

  return (
    <PrivyProvider
      appId={privyAppId}
      config={{
        defaultChain: hyperliquid,
        supportedChains: [hyperliquid],
        loginMethods: ["wallet"],
      }}
    >
      <QueryClientProvider client={queryClient}>
        <WagmiProvider config={wagmiConfig}>
          <TooltipProvider>
            <AppContent />
            <Toaster />
            <Sonner position="top-center" />
          </TooltipProvider>
        </WagmiProvider>
      </QueryClientProvider>
    </PrivyProvider>
  );
}

export default App;
