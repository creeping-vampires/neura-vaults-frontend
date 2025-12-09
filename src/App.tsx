import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Suspense, lazy, useEffect } from "react";
import SkeletonLoader from "@/components/skeleton";
import Navbar from "./components/Navbar";
import Sidebar from "./components/Sidebar";
import { PrivyProvider } from "@privy-io/react-auth";
import { hyperliquid, wagmiConfig } from "./lib/privyConfig";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider } from "@privy-io/wagmi";
import { VaultApiProvider, useVaultApi } from "./hooks/useVaultApi";
import {
  VaultContractProvider,
  useVaultContract,
} from "./hooks/useVaultContract";
import { UserAccessProvider } from "./hooks/useUserAccess";
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
      staleTime: 10 * 1000, // 10 seconds
      gcTime: 1 * 60 * 1000, // 1 minute cacheTime
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
  const { isVaultLoading, vaultError } = useVaultApi();
  const { isLoading: isContractLoading, error: contractError } =
    useVaultContract();

  const isLoading = isVaultLoading || isContractLoading;
  const hasError = Boolean(vaultError || contractError);

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
      <VaultApiProvider>
        <VaultContractProvider>
          <UserAccessProvider>
            <TooltipProvider>
              <AppRoutes />
              <Toaster />
            </TooltipProvider>
          </UserAccessProvider>
        </VaultContractProvider>
      </VaultApiProvider>
    </Router>
  );
};

function App() {
  const privyAppId =
    import.meta.env.VITE_PRIVY_APP_ID || process.env.VITE_PRIVY_APP_ID || "";

  if (!privyAppId) {
    console.error(
      "VITE_PRIVY_APP_ID is not defined. Please check your environment configuration."
    );
  }

  useEffect(() => {
    const interval = setInterval(() => {
      // @ts-ignore
      if (performance.memory) {
        console.log(
          "Memory MB:",
          // @ts-ignore
          Math.round(performance.memory.usedJSHeapSize / 1048576)
        );
      }
    }, 5000);

    return () => clearInterval(interval);
  }, []);
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
          <AppContent />
        </WagmiProvider>
      </QueryClientProvider>
    </PrivyProvider>
  );
}

export default App;
