import React from "react";
import { Skeleton as UISkeleton } from "@/components/ui/skeleton";
import { useLocation } from "react-router-dom";

export default function SkeletonLoader() {
  const { pathname } = useLocation();
  const isDashboard = pathname === "/";
  const isMarkets = pathname.startsWith("/markets");
  const isPortfolio = pathname.startsWith("/portfolio");
  const isVaultDetails = pathname.startsWith("/vaults/");
  return (
    <>
    {isDashboard && (
      <div className="p-4 sm:p-6 space-y-4 sm:space-y-6 min-h-screen">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-gradient-to-br from-card/50 to-background/50 border-border shadow-xl rounded-xl border p-4 sm:p-6"
            >
              <div className="flex items-center justify-between mb-3 sm:mb-4">
                <UISkeleton className="h-5 w-28" />
                <UISkeleton className="h-5 w-4 rounded-full" />
              </div>
              <UISkeleton className="h-6 sm:h-8 w-40" />
            </div>
          ))}
        </div>

        <div className="space-y-4 sm:space-y-6">
          <div className="bg-gradient-to-br from-card/50 to-background/50 border-border shadow-xl rounded-xl border">
            <div className="px-4 sm:px-6 pt-4 sm:pt-6 pb-3 sm:pb-4">
              <div className="flex items-center space-x-2">
                <UISkeleton className="h-5 w-5 rounded-md" />
                <UISkeleton className="h-5 w-40" />
              </div>
            </div>
            <div className="w-full flex flex-col sm:flex-row gap-4 sm:gap-6 p-4 sm:p-6 pt-0 sm:pt-0">
              <div className="w-full p-3 sm:p-4 rounded-xl border border-border">
                <div className="flex items-center justify-between mb-2">
                  <UISkeleton className="h-3 w-28" />
                  <UISkeleton className="h-5 w-16 rounded-md" />
                </div>
                <UISkeleton className="h-7 sm:h-8 w-48" />
              </div>
              <div className="w-full p-3 sm:p-4 rounded-xl border border-border">
                <div className="flex items-center justify-between mb-2">
                  <UISkeleton className="h-3 w-28" />
                  <UISkeleton className="h-5 w-16 rounded-md" />
                </div>
                <UISkeleton className="h-7 sm:h-8 w-48" />
              </div>
            </div>
          </div>
          <div className="bg-gradient-to-br from-card/50 to-background/50 border-border shadow-xl rounded-xl border">
            <div className="px-4 sm:px-6 pt-4 sm:pt-6 pb-3 sm:pb-4 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <UISkeleton className="h-5 w-5 rounded-md" />
                <UISkeleton className="h-5 w-40" />
              </div>
            </div>
            <div className="p-4 sm:p-6 pt-0 sm:pt-0">
              <div className="py-8 flex items-center justify-center">
                <UISkeleton className="h-5 w-32" />
              </div>
            </div>
          </div>
        </div>
      </div>
    )}

    {isMarkets && (
      <div className="p-4 sm:p-6 space-y-4 sm:space-y-6 min-h-screen">
        {/* Market Overview Cards (3) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {[0,1,2].map((i) => (
            <div key={i} className="bg-gradient-to-br from-card/70 to-background/70 border-border shadow-xl rounded-xl border p-4 sm:p-6">
              <div className="flex items-center justify-between mb-3 sm:mb-4">
                <UISkeleton className="h-4 w-36" />
                <UISkeleton className="h-5 w-5 rounded-full" />
              </div>
              <UISkeleton className="h-7 sm:h-8 w-28" />
            </div>
          ))}
        </div>

        {/* Search */}
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="bg-gradient-to-br from-card/70 to-background/70 relative w-full sm:w-96 rounded-md border border-border p-[10px]">
            <div className="absolute left-3 top-1/2 -translate-y-1/2">
              <UISkeleton className="h-4 w-4 rounded" />
            </div>
            <UISkeleton className="h-9 w-full" />
          </div>
        </div>

        {/* Markets Table */}
        <div className="bg-gradient-to-br from-card/50 to-background/50 border-border shadow-xl rounded-xl border">
          <div className="pl-4 pb-0 pt-4 sm:p-6 sm:pb-0">
            <UISkeleton className="h-6 w-28" />
          </div>
          <div className="p-2 pt-0 sm:p-6">
            <div className="relative overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-border">
                    {["Vault","Asset","TVL","APY",""].map((h, idx) => (
                      <th key={idx} className={`${idx===4?"text-right":"text-left"} text-muted-foreground text-xs font-medium uppercase tracking-wide py-3`}>
                        <UISkeleton className="h-3 w-16" />
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[0,1,2,3,4].map((r) => (
                    <tr key={r} className="border-b border-border">
                      <td className="py-4">
                        <div className="flex items-center space-x-3">
                          <UISkeleton className="h-4 w-24" />
                        </div>
                      </td>
                      <td className="py-4">
                        <UISkeleton className="h-4 w-14" />
                      </td>
                      <td className="text-center py-4">
                        <div className="flex justify-center">
                          <UISkeleton className="h-4 w-20" />
                        </div>
                      </td>
                      <td className="text-center py-4">
                        <div className="flex justify-center">
                          <UISkeleton className="h-4 w-14" />
                        </div>
                      </td>
                      <td className="text-right py-4">
                        <div className="flex justify-end">
                          <UISkeleton className="h-5 w-24 rounded-full" />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    )}

    {isPortfolio && (
      <div className="p-4 sm:p-6 space-y-4 sm:space-y-6 min-h-screen">
        {/* Portfolio Overview Card */}
        <div className="bg-gradient-to-br from-card/50 to-background/50 border-border shadow-xl rounded-2xl border p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 w-full">
              <UISkeleton className="h-4 w-28" />
            </div>
            <UISkeleton className="h-6 w-6 rounded-md" />
          </div>
          <div className="flex justify-between">
            <div className="mt-4">
              <UISkeleton className="h-9 w-40" />
            </div>
            <div className="flex justify-end space-x-6 mt-4">
              <div className="flex flex-col items-center">
                <div className="text-muted-foreground text-xs">Net APY</div>
                <UISkeleton className="h-5 w-12 mt-1" />
              </div>
              <div className="flex flex-col items-center">
                <div className="text-muted-foreground text-xs">Points</div>
                <UISkeleton className="h-5 w-16 mt-1" />
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="w-full">
          <div className="h-10 sm:h-12 bg-gradient-to-br from-card to-background backdrop-blur-sm border border-border/50 rounded-lg flex items-center px-2 gap-2">
            {["Positions","Transactions","Rewards","Analytics"].map((t, i) => (
              <UISkeleton key={i} className="h-8 w-24 rounded-md" />
            ))}
          </div>

          {/* Positions Table */}
          <div className="mt-4 sm:mt-6 bg-gradient-to-br from-card/50 to-background/50 border-border shadow-xl rounded-xl border">
            <div className="px-4 pb-0 pt-4 sm:p-6 sm:pb-0 flex items-center justify-between">
              <UISkeleton className="h-6 w-32" />
              <UISkeleton className="h-6 w-24 rounded-full" />
            </div>
            <div className="p-2 pt-0 sm:p-6">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      {["Vault","Shares","Balance","APY","Earnings","Actions"].map((h, idx) => (
                        <th key={idx} className="text-left text-muted-foreground text-xs font-medium uppercase tracking-wide py-3">
                          <UISkeleton className="h-3 w-16" />
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[0,1,2].map((r) => (
                      <tr key={r} className="border-b border-border">
                        <td className="py-4"><UISkeleton className="h-4 w-24" /></td>
                        <td className="py-4"><UISkeleton className="h-4 w-20" /></td>
                        <td className="py-4"><UISkeleton className="h-4 w-24" /></td>
                        <td className="py-4"><UISkeleton className="h-4 w-12" /></td>
                        <td className="py-4"><UISkeleton className="h-4 w-20" /></td>
                        <td className="py-4"><UISkeleton className="h-8 w-28 rounded-md" /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
        </div>
      )}

    {isVaultDetails && (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
          {/* Navigation Header */}
          <div className="flex items-center justify-between mb-4 sm:mb-6">
            <div className="flex items-center space-x-3 sm:space-x-4">
              <UISkeleton className="w-8 h-8 rounded" />
              <div>
                <UISkeleton className="w-40 h-6 rounded mb-1" />
                <UISkeleton className="w-16 h-4 rounded" />
              </div>
            </div>
          </div>

          {/* Main Layout */}
          <div className="flex flex-col lg:flex-row gap-4 sm:gap-6">
            {/* Left Content */}
            <div className="flex-1 space-y-4 sm:space-y-6">
              {/* KPI Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                {/* Total Value Locked Card */}
                <div className="bg-gradient-to-br from-card/50 to-background/50 border border-border shadow-xl rounded-lg">
                  <div className="p-4 sm:p-6">
                    <div className="flex items-center justify-between mb-3 sm:mb-4">
                      <UISkeleton className="w-32 h-4 rounded" />
                      <UISkeleton className="w-5 h-5 rounded" />
                    </div>
                    <UISkeleton className="w-28 h-8 rounded mb-2" />
                    <div className="flex items-center space-x-2">
                      <UISkeleton className="w-4 h-4 rounded" />
                      <UISkeleton className="w-16 h-4 rounded" />
                    </div>
                  </div>
                </div>

                {/* Your Position Card */}
                <div className="bg-gradient-to-br from-card/50 to-background/50 border border-border shadow-xl rounded-lg">
                  <div className="p-4 sm:p-6">
                    <div className="flex items-center justify-between mb-3 sm:mb-4">
                      <UISkeleton className="w-24 h-4 rounded" />
                      <UISkeleton className="w-5 h-5 rounded" />
                    </div>
                    <UISkeleton className="w-24 h-8 rounded mb-2" />
                    <div className="flex items-center space-x-2">
                      <UISkeleton className="w-4 h-4 rounded" />
                      <UISkeleton className="w-16 h-4 rounded" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Performance Chart */}
              <div className="bg-gradient-to-br from-card/50 to-background/50 border border-border shadow-xl rounded-lg">
                <div className="p-4 sm:p-6">
                  <div className="flex items-center justify-between mb-4 sm:mb-6">
                    <UISkeleton className="w-24 h-6 rounded" />
                    <div className="flex space-x-2">
                      <UISkeleton className="w-8 h-6 rounded" />
                      <UISkeleton className="w-8 h-6 rounded" />
                      <UISkeleton className="w-8 h-6 rounded" />
                      <UISkeleton className="w-8 h-6 rounded" />
                    </div>
                  </div>
                  <UISkeleton className="w-full h-64 sm:h-80 rounded" />
                </div>
              </div>

              {/* Tabs Section */}
              <div className="bg-gradient-to-br from-card/50 to-background/50 border border-border shadow-xl rounded-lg">
                {/* Tab Headers */}
                <div className="border-b border-border">
                  <div className="flex space-x-0">
                    <div className="px-4 sm:px-6 py-3 sm:py-4">
                      <UISkeleton className="w-12 h-4 rounded" />
                    </div>
                    <div className="px-4 sm:px-6 py-3 sm:py-4">
                      <UISkeleton className="w-20 h-4 rounded" />
                    </div>
                    <div className="px-4 sm:px-6 py-3 sm:py-4">
                      <UISkeleton className="w-16 h-4 rounded" />
                    </div>
                    <div className="px-4 sm:px-6 py-3 sm:py-4">
                      <UISkeleton className="w-18 h-4 rounded" />
                    </div>
                  </div>
                </div>

                {/* Tab Content */}
                <div className="p-4 sm:p-6">
                  <div className="space-y-4">
                    <div className="w-32 h-6 rounded" />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <UISkeleton className="w-24 h-4 rounded" />
                        <UISkeleton className="w-16 h-6 rounded" />
                      </div>
                      <div className="space-y-2">
                        <UISkeleton className="w-20 h-4 rounded" />
                        <UISkeleton className="w-12 h-6 rounded" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <UISkeleton className="w-28 h-4 rounded" />
                      <UISkeleton className="w-20 h-6 rounded" />
                    </div>

                    {/* Vault Activity Section */}
                    <div className="mt-6">
                      <UISkeleton className="w-24 h-6 rounded mb-4" />
                      <div className="space-y-3">
                        {[1, 2, 3].map((i) => (
                          <div key={i} className="flex items-center justify-between py-3 border-b border-border/50">
                            <div className="flex-1">
                              <div className="flex items-center space-x-2 mb-1">
                                <UISkeleton className="w-16 h-4 rounded" />
                                <UISkeleton className="w-20 h-3 rounded" />
                              </div>
                              <div className="flex items-center justify-between">
                                <UISkeleton className="w-24 h-4 rounded" />
                                <UISkeleton className="w-16 h-3 rounded" />
                              </div>
                            </div>
                            <UISkeleton className="w-4 h-4 rounded ml-2" />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Sidebar */}
            <div className="w-full lg:w-80 flex-shrink-0 space-y-4 sm:space-y-6">
              <div className="sticky top-6 space-y-4 sm:space-y-6">
                {/* Action Panel */}
                <div className="bg-gradient-to-br from-card/50 to-background/50 border border-border shadow-xl rounded-lg sm:h-[435px]">
                  <div className="p-4 pt-2">
                    {/* Tab Headers */}
                    <div className="flex mb-4 border-b border-border">
                      <div className="flex-1 py-3 px-4">
                        <UISkeleton className="w-12 h-4 rounded" />
                      </div>
                      <div className="flex-1 py-3 px-4">
                        <UISkeleton className="w-16 h-4 rounded" />
                      </div>
                    </div>

                    {/* Available Balance */}
                    <div className="mt-4 mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <UISkeleton className="w-16 h-4 rounded" />
                        <UISkeleton className="w-20 h-4 rounded" />
                      </div>
                    </div>

                    {/* Percentage Buttons */}
                    <div className="flex gap-2 mb-4">
                      {[1, 2, 3, 4].map((i) => (
                        <UISkeleton key={i} className="flex-1 h-8 rounded" />
                      ))}
                    </div>

                    {/* Input Field */}
                    <div className="mb-4">
                      <UISkeleton className="w-full h-12 rounded" />
                    </div>

                    {/* Action Button */}
                    <div className="w-full h-10 rounded mb-4" />

                    {/* Latest Transactions */}
                    <div className="mt-2 space-y-1">
                      <UISkeleton className="w-28 h-4 rounded mb-2" />
                      <div className="space-y-2">
                        {[1, 2].map((i) => (
                          <div key={i} className="flex items-center justify-between p-2 py-1 bg-card/50 rounded-md border border-border/50">
                            <div className="flex items-center space-x-2">
                              <UISkeleton className="w-4 h-4 rounded" />
                              <div className="flex flex-col space-y-1">
                                <UISkeleton className="w-20 h-3 rounded" />
                                <UISkeleton className="w-12 h-3 rounded" />
                              </div>
                            </div>
                            <div className="w-3 h-3 rounded" />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Settlement Countdown */}
                <div className="bg-gradient-to-br from-card/50 to-background/50 border border-border shadow-xl rounded-lg h-[180px]">
                  <div className="p-4 sm:p-6">
                    <div className="flex items-center justify-between mb-3 sm:mb-4">
                      <UISkeleton className="w-32 h-4 rounded" />
                      <UISkeleton className="w-5 h-5 rounded" />
                    </div>
                    <UISkeleton className="w-24 h-4 rounded" />
                    <UISkeleton className="w-24 h-6 rounded mb-4" />
                    <div className="flex items-center space-x-2">
                      <UISkeleton className="w-4 h-4 rounded" />
                      <UISkeleton className="w-16 h-4 rounded" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )}
  </>
);
}