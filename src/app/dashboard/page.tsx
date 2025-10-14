"use client";

export const dynamic = "force-dynamic";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import logger from "@/lib/logger";
import { Button } from "@/components/ui/button";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Settings,
  Brain,
  Target,
  BarChart3,
  Zap,
} from "lucide-react";
import Link from "next/link";
import ClientWrapper from "@/components/client-wrapper";
import LogoutButton from "@/components/logout-button";
import { ThemeToggle } from "@/components/theme-toggle";
import { Badge } from "@/components/ui/badge";
import AccountSelector from "@/components/account-selector";
import NotificationBell from "@/components/notification-bell";
import MobileNav from "@/components/mobile-nav";
import DailyPnLChart from "@/components/daily-pnl-chart";
import { formatCurrency } from "@/lib/currency";
import { Spinner } from "@/components/ui/spinner";
import { Skeleton } from "@/components/ui/skeleton";

interface DashboardStats {
  totalPnL: number;
  totalPnLPercent: number;
  todayPnL: number;
  todayPnLPercent: number;
  activePositions: number;
  aiRecommendations: number;
  currency?: string;
}

interface ConnectionStatus {
  connected: boolean;
  accountId?: string;
  accountName?: string;
  mode?: "LIVE" | "DEMO" | "AGGREGATED";
  cash?: number | null;
  currency?: string | null;
}

interface Trading212Account {
  id: string;
  name: string;
  isActive: boolean;
  isDefault: boolean;
  isPractice: boolean;
}

export default function Dashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats>({
    totalPnL: 0,
    totalPnLPercent: 0,
    todayPnL: 0,
    todayPnLPercent: 0,
    activePositions: 0,
    aiRecommendations: 0,
  });
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
    connected: false,
  });
  const [dataLoading, setDataLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(
    null,
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  // Redirect unauthenticated users to sign-in
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
    }
  }, [status, router]);

  // Define data loaders before using them in loadDashboardData
  const fetchWithRetry = useCallback(
    async (
      input: RequestInfo | URL,
      init?: RequestInit,
      retries: number = 2,
      delayMs: number = 500,
    ): Promise<Response | null> => {
      for (let attempt = 0; attempt <= retries; attempt++) {
        try {
          const res = await fetch(input, init);
          if (res.ok) return res;
          // Retry on 429/5xx transient issues
          if (res.status === 429 || (res.status >= 500 && res.status < 600)) {
            if (attempt < retries) {
              await new Promise((r) => setTimeout(r, delayMs * (attempt + 1)));
              continue;
            }
          }
          // Non-retryable
          return res;
        } catch {
          if (attempt < retries) {
            await new Promise((r) => setTimeout(r, delayMs * (attempt + 1)));
            continue;
          }
          return null;
        }
      }
      return null;
    },
    [],
  );

  const loadSingleAccountData = useCallback(async () => {
    setDataLoading(true);
    const controller = new AbortController();
    const signal = controller.signal;

    try {
      const accountUrl = `/api/trading212/optimized/account?accountId=${selectedAccountId}`;
      const [accountResponse, aiResponse] = await Promise.all([
        fetchWithRetry(accountUrl, { signal }),
        fetchWithRetry("/api/ai/optimized-analyze", { signal }),
      ]);

      let aiCount = 0;
      if (aiResponse && aiResponse.ok) {
        const aiData = await aiResponse.json();
        aiCount = aiData.recommendations?.length || 0;
      }

      let accountData = null;
      if (accountResponse && accountResponse.ok) {
        accountData = await accountResponse.json();
      } else if (accountResponse && accountResponse.status === 429) {
        logger.info("Trading212 API rate limited, using cached data");
      }

      if (!accountResponse || !accountResponse.ok) {
        setStats({
          totalPnL: 0,
          totalPnLPercent: 0,
          todayPnL: 0,
          todayPnLPercent: 0,
          activePositions: 0,
          aiRecommendations: aiCount,
        });
        setConnectionStatus({ connected: false });
      } else if (accountData && accountData.connected && !accountData.error) {
        setStats({
          totalPnL: accountData.stats.totalPnL || 0,
          totalPnLPercent: accountData.stats.totalPnLPercent || 0,
          todayPnL: accountData.stats.todayPnL || 0,
          todayPnLPercent: accountData.stats.todayPnLPercent || 0,
          activePositions: accountData.stats.activePositions || 0,
          aiRecommendations: aiCount,
          currency: accountData.account?.currency || "USD",
        });
        setConnectionStatus({
          connected: true,
          accountId: accountData.account?.id,
          accountName: accountData.account?.name,
          mode: accountData.account?.isPractice ? "DEMO" : "LIVE",
          cash: accountData.account?.cash,
          currency: accountData.account?.currency,
        });
      } else if (accountResponse && accountResponse.ok) {
        const reason = accountData?.error || "Trading212 not connected";
        logger.info(`${reason}, using demo data`);
        setStats({
          totalPnL: 0,
          totalPnLPercent: 0,
          todayPnL: 0,
          todayPnLPercent: 0,
          activePositions: 0,
          aiRecommendations: aiCount,
        });
        setConnectionStatus({ connected: false });
      }
    } catch {
      // ignore abort errors
    } finally {
      setDataLoading(false);
    }
  }, [selectedAccountId, fetchWithRetry]);

  const loadAggregatedAccountData = useCallback(async () => {
    setDataLoading(true);
    const controller = new AbortController();
    const signal = controller.signal;

    // Load accounts and AI in parallel
    const [accountsResponse, aiResponse] = await Promise.all([
      fetchWithRetry("/api/trading212/optimized/accounts", { signal }),
      fetchWithRetry("/api/ai/optimized-analyze", { signal }),
    ]);
    let accounts = [] as Trading212Account[];
    if (accountsResponse && accountsResponse.ok) {
      const accountsData = await accountsResponse.json();
      accounts = accountsData.accounts || [];
    }
    let aiCount = 0;
    if (aiResponse && aiResponse.ok) {
      const aiData = await aiResponse.json();
      aiCount = aiData.recommendations?.length || 0;
    }

    if (accounts.length === 0 && accountsResponse && accountsResponse.ok) {
      // No accounts found
      setStats({
        totalPnL: 0,
        totalPnLPercent: 0,
        todayPnL: 0,
        todayPnLPercent: 0,
        activePositions: 0,
        aiRecommendations: aiCount,
      });
      setConnectionStatus({
        connected: false,
      });
      setDataLoading(false);
      return;
    }

    // Fetch data for each account and aggregate
    const accountDataPromises = accounts
      .filter((account: Trading212Account) => account.isActive)
      .map(async (account: Trading212Account) => {
        try {
          const response = await fetchWithRetry(
            `/api/trading212/optimized/account?accountId=${account.id}`,
          );
          if (response && response.ok) {
            const data = await response.json();
            return { account, data };
          }
          return { account, data: null };
        } catch (error) {
          console.error(
            `Error loading data for account ${account.name}:`,
            error,
          );
          return { account, data: null };
        }
      });

    const accountResults = await Promise.allSettled(accountDataPromises);

    // Aggregate the data
    const aggregatedStats = {
      totalPnL: 0,
      totalPnLPercent: 0,
      todayPnL: 0,
      todayPnLPercent: 0,
      activePositions: 0,
      aiRecommendations: aiCount,
      currency: "USD", // Default currency for aggregated view
    };

    let connectedAccounts = 0;
    let totalCurrentValue = 0;
    let totalInvestedValue = 0;
    const accountNames = [];

    for (const result of accountResults) {
      if (
        result.status === "fulfilled" &&
        result.value.data?.connected &&
        !result.value.data.error
      ) {
        const { account, data } = result.value;
        connectedAccounts++;
        accountNames.push(account.name);

        // Aggregate absolute values
        aggregatedStats.totalPnL += data.stats.totalPnL || 0;
        aggregatedStats.todayPnL += data.stats.todayPnL || 0;
        aggregatedStats.activePositions += data.stats.activePositions || 0;

        // Calculate current portfolio value from positions
        const accountCurrentValue =
          data.portfolio?.reduce(
            (sum: number, pos: { quantity: number; currentPrice: number }) =>
              sum + pos.quantity * pos.currentPrice,
            0,
          ) || 0;

        // Calculate invested value (current value - P&L)
        const accountInvestedValue =
          accountCurrentValue - (data.stats.totalPnL || 0);

        totalCurrentValue += accountCurrentValue;
        totalInvestedValue += accountInvestedValue;
      }
    }

    // Calculate aggregated percentages using the correct formula
    // P&L% = (Total P&L / Total Invested) * 100
    if (totalInvestedValue > 0) {
      aggregatedStats.totalPnLPercent =
        (aggregatedStats.totalPnL / totalInvestedValue) * 100;
      aggregatedStats.todayPnLPercent =
        (aggregatedStats.todayPnL / totalInvestedValue) * 100;
    }

    logger.info("📊 Aggregated Dashboard Data:", {
      connectedAccounts,
      accountNames,
      aggregatedStats,
      totalCurrentValue,
      totalInvestedValue,
      calculationDetails: {
        totalPnL: aggregatedStats.totalPnL,
        totalInvested: totalInvestedValue,
        calculatedPnLPercent:
          totalInvestedValue > 0
            ? (aggregatedStats.totalPnL / totalInvestedValue) * 100
            : 0,
      },
    });

    setStats(aggregatedStats);
    setConnectionStatus({
      connected: connectedAccounts > 0,
      accountName:
        connectedAccounts > 0
          ? `${connectedAccounts} Accounts (${accountNames.join(", ")})`
          : "No accounts connected",
      mode: "AGGREGATED",
      cash: null, // Don't show total cash in aggregated view
      currency: null,
    });

    setDataLoading(false);
  }, [fetchWithRetry]);

  // Load dashboard data when authenticated and component is mounted
  useEffect(() => {
    if (!mounted || status !== "authenticated") return;

    // Set initial data loading to false once we're ready to show UI
    setDataLoading(false);
    if (selectedAccountId) {
      void loadSingleAccountData();
    } else {
      void loadAggregatedAccountData();
    }
  }, [
    mounted,
    status,
    selectedAccountId,
    loadSingleAccountData,
    loadAggregatedAccountData,
  ]);

  // Note: Removed window focus event listener to avoid unnecessary data refreshes
  // when users switch back from other windows

  if (!mounted || status === "loading") {
    return (
      <div className="min-h-screen pt-safe pb-safe flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50/40 to-indigo-50/30 dark:from-slate-950 dark:via-slate-900 dark:to-slate-800">
        <Spinner size="3xl" variant="primary" />
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <ClientWrapper>
      <div className="min-h-screen pt-safe pb-safe bg-gradient-to-br from-slate-50 via-blue-50/40 to-indigo-50/30 dark:from-slate-950 dark:via-slate-900 dark:to-slate-800">
        {/* Header */}
        <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200/60 dark:border-slate-700/60 shadow-sm dark:shadow-slate-950/20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center py-4 lg:py-6 space-y-4 lg:space-y-0">
              {/* Top row - Title and status */}
              <div className="flex-1">
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-2">
                  <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-50">
                    Dashboard
                  </h1>
                  {dataLoading ? (
                    <Badge
                      variant="secondary"
                      className="w-fit bg-slate-100 text-slate-800 dark:bg-slate-900/30 dark:text-slate-300 border-slate-200 dark:border-slate-800"
                    >
                      <Spinner size="sm" variant="muted" className="mr-1.5" />
                      <span className="truncate max-w-[200px] sm:max-w-none">
                        Loading...
                      </span>
                    </Badge>
                  ) : connectionStatus.connected ? (
                    <Badge
                      className={`w-fit ${
                        connectionStatus.mode === "AGGREGATED"
                          ? "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300 border-purple-200 dark:border-purple-800"
                          : connectionStatus.mode === "DEMO"
                            ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200 dark:border-blue-800"
                            : "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 border-green-200 dark:border-green-800"
                      }`}
                    >
                      <div
                        className={`w-2 h-2 ${
                          connectionStatus.mode === "AGGREGATED"
                            ? "bg-purple-500"
                            : connectionStatus.mode === "DEMO"
                              ? "bg-blue-500"
                              : "bg-green-500"
                        } rounded-full mr-1.5`}
                      ></div>
                      <span className="truncate max-w-[200px] sm:max-w-none">
                        {connectionStatus.mode === "AGGREGATED"
                          ? connectionStatus.accountName
                          : `${connectionStatus.accountName} (${connectionStatus.mode})`}
                      </span>
                    </Badge>
                  ) : (
                    <Badge
                      variant="secondary"
                      className="w-fit bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300 border-orange-200 dark:border-orange-800"
                    >
                      <div className="w-2 h-2 bg-orange-500 rounded-full mr-1.5"></div>
                      Demo Mode
                    </Badge>
                  )}
                </div>

                {/* Welcome message and cash info */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
                  <div className="text-sm sm:text-base text-slate-600 dark:text-slate-300">
                    Welcome back, {session.user?.name}
                    {dataLoading ? (
                      <span className="block sm:inline sm:ml-2 text-xs sm:text-sm">
                        • <Skeleton className="inline-block h-4 w-24" />
                      </span>
                    ) : connectionStatus.connected &&
                      connectionStatus.cash !== undefined ? (
                      <span className="block sm:inline sm:ml-2 text-xs sm:text-sm">
                        • Available Cash:{" "}
                        {formatCurrency(
                          connectionStatus.cash || 0,
                          connectionStatus.currency || "USD",
                        )}
                      </span>
                    ) : null}
                  </div>

                  {/* Account selector and notification - mobile optimized */}
                  <div className="flex items-center justify-between sm:justify-end space-x-2 sm:space-x-4">
                    <div className="flex items-center space-x-2 min-w-0 flex-1 sm:flex-initial">
                      <span className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 whitespace-nowrap">
                        Account:
                      </span>
                      <AccountSelector
                        selectedAccountId={selectedAccountId || undefined}
                        onAccountChange={setSelectedAccountId}
                        className="w-32 sm:w-48"
                      />
                    </div>
                    <NotificationBell />
                  </div>
                </div>
              </div>

              {/* Action buttons - mobile optimized */}
              <div className="flex items-center justify-end space-x-2 sm:space-x-4">
                <MobileNav user={session.user} />
                <ThemeToggle className="hidden sm:flex" />
                <Link href="/settings">
                  <Button
                    variant="outline"
                    size="sm"
                    className="hidden sm:flex"
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    Settings
                  </Button>
                </Link>
                <LogoutButton size="sm" className="hidden sm:flex" />
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
          {/* Stats Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 mb-6 sm:mb-8">
            <Card className="hover:shadow-xl hover:shadow-green-500/10 transition-all duration-300 border border-green-200/50 dark:border-green-800/30 shadow-lg bg-gradient-to-br from-white via-green-50/50 to-emerald-50/80 dark:from-slate-800/90 dark:via-green-950/20 dark:to-emerald-950/30 backdrop-blur-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2">
                <CardTitle className="text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-200">
                  Total P/L
                </CardTitle>
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg shadow-green-500/20">
                  <DollarSign className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                </div>
              </CardHeader>
              <CardContent className="pt-2">
                {dataLoading ? (
                  <>
                    <Skeleton className="h-8 sm:h-10 w-24 sm:w-32 mb-2" />
                    <div className="flex items-center space-x-2">
                      <Skeleton className="h-5 w-16" />
                      <Skeleton className="h-4 w-16 hidden sm:block" />
                    </div>
                  </>
                ) : (
                  <>
                    <div
                      className={`text-lg sm:text-3xl font-bold mb-1 ${stats.totalPnL >= 0 ? "profit" : "loss"}`}
                    >
                      {formatCurrency(stats.totalPnL, stats.currency || "USD")}
                    </div>
                    <div className="flex items-center space-x-1 sm:space-x-2">
                      <Badge
                        variant={
                          stats.totalPnLPercent >= 0 ? "success" : "error"
                        }
                        className="text-xs"
                      >
                        {stats.totalPnLPercent >= 0 ? "+" : ""}
                        {stats.totalPnLPercent.toFixed(2)}%
                      </Badge>
                      <span className="text-xs text-slate-600 dark:text-slate-400 hidden sm:inline">
                        from start
                      </span>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            <Card className="hover:shadow-xl hover:shadow-blue-500/10 transition-all duration-300 border border-blue-200/50 dark:border-blue-800/30 shadow-lg bg-gradient-to-br from-white via-blue-50/50 to-cyan-50/80 dark:from-slate-800/90 dark:via-blue-950/20 dark:to-cyan-950/30 backdrop-blur-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2">
                <CardTitle className="text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-200">
                  Today&apos;s P/L
                </CardTitle>
                <div
                  className={`w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shadow-lg ${stats.todayPnL >= 0 ? "bg-gradient-to-br from-green-500 to-emerald-600 shadow-green-500/20" : "bg-gradient-to-br from-red-500 to-rose-600 shadow-red-500/20"}`}
                >
                  {stats.todayPnL >= 0 ? (
                    <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                  ) : (
                    <TrendingDown className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                  )}
                </div>
              </CardHeader>
              <CardContent className="pt-2">
                {dataLoading ? (
                  <>
                    <Skeleton className="h-8 sm:h-10 w-24 sm:w-32 mb-2" />
                    <div className="flex items-center space-x-2">
                      <Skeleton className="h-5 w-16" />
                      <Skeleton className="h-4 w-16 hidden sm:block" />
                    </div>
                  </>
                ) : (
                  <>
                    <div
                      className={`text-lg sm:text-3xl font-bold mb-1 ${stats.todayPnL >= 0 ? "profit" : "loss"}`}
                    >
                      {formatCurrency(stats.todayPnL, stats.currency || "USD")}
                    </div>
                    <div className="flex items-center space-x-1 sm:space-x-2">
                      <Badge
                        variant={
                          stats.todayPnLPercent >= 0 ? "success" : "error"
                        }
                        className="text-xs"
                      >
                        {stats.todayPnLPercent >= 0 ? "+" : ""}
                        {stats.todayPnLPercent.toFixed(2)}%
                      </Badge>
                      <span className="text-xs text-slate-600 dark:text-slate-400 hidden sm:inline">
                        today
                      </span>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            <Card className="hover:shadow-xl hover:shadow-purple-500/10 transition-all duration-300 border border-purple-200/50 dark:border-purple-800/30 shadow-lg bg-gradient-to-br from-white via-purple-50/50 to-violet-50/80 dark:from-slate-800/90 dark:via-purple-950/20 dark:to-violet-950/30 backdrop-blur-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2">
                <CardTitle className="text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-200">
                  Active Positions
                </CardTitle>
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-purple-500 to-violet-600 rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/20">
                  <Target className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                </div>
              </CardHeader>
              <CardContent className="pt-2">
                {dataLoading ? (
                  <>
                    <Skeleton className="h-8 sm:h-10 w-12 sm:w-16 mb-2" />
                    <div className="flex items-center space-x-2">
                      <Skeleton className="h-5 w-12" />
                      <Skeleton className="h-4 w-16 hidden sm:block" />
                    </div>
                  </>
                ) : (
                  <>
                    <div className="text-lg sm:text-3xl font-bold mb-1 text-purple-700 dark:text-purple-300">
                      {stats.activePositions}
                    </div>
                    <div className="flex items-center space-x-1 sm:space-x-2">
                      <Badge
                        variant="secondary"
                        className="text-xs bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300"
                      >
                        Active
                      </Badge>
                      <span className="text-xs text-slate-600 dark:text-slate-400 hidden sm:inline">
                        positions
                      </span>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            <Card className="hover:shadow-xl hover:shadow-orange-500/10 transition-all duration-300 border border-orange-200/50 dark:border-orange-800/30 shadow-lg bg-gradient-to-br from-white via-orange-50/50 to-amber-50/80 dark:from-slate-800/90 dark:via-orange-950/20 dark:to-amber-950/30 backdrop-blur-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2">
                <CardTitle className="text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-200">
                  AI Recommendations
                </CardTitle>
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-orange-500 to-amber-600 rounded-xl flex items-center justify-center shadow-lg shadow-orange-500/20">
                  <Brain className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                </div>
              </CardHeader>
              <CardContent className="pt-2">
                {dataLoading ? (
                  <>
                    <Skeleton className="h-8 sm:h-10 w-12 sm:w-16 mb-2" />
                    <div className="flex items-center space-x-2">
                      <Skeleton className="h-5 w-12" />
                      <Skeleton className="h-4 w-16 hidden sm:block" />
                    </div>
                  </>
                ) : (
                  <>
                    <div className="text-lg sm:text-3xl font-bold mb-1 text-orange-700 dark:text-orange-300">
                      {stats.aiRecommendations}
                    </div>
                    <div className="flex items-center space-x-1 sm:space-x-2">
                      <Badge className="text-xs bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300 border-0">
                        <Zap className="w-3 h-3 mr-1" />
                        New
                      </Badge>
                      <span className="text-xs text-slate-600 dark:text-slate-400 hidden sm:inline">
                        suggestions
                      </span>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            <Card className="group hover:shadow-xl hover:shadow-blue-500/20 transition-all duration-300 border border-blue-200/50 dark:border-blue-800/30 shadow-lg bg-gradient-to-br from-white via-blue-50/70 to-indigo-100/80 dark:from-slate-800/95 dark:via-blue-950/30 dark:to-indigo-950/40 backdrop-blur-sm hover:scale-105">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center text-slate-900 dark:text-slate-50 text-sm sm:text-base">
                  <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center mr-2 sm:mr-3 group-hover:from-blue-700 group-hover:to-indigo-700 transition-all shadow-lg shadow-blue-500/20">
                    <Brain className="h-3 w-3 sm:h-4 sm:w-4 text-white" />
                  </div>
                  <span className="truncate">AI Recommendations</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <CardDescription className="mb-3 sm:mb-4 text-slate-600 dark:text-slate-300 leading-relaxed text-xs sm:text-sm">
                  Get AI-powered exit strategy suggestions for your positions
                </CardDescription>
                <Link href="/ai-recommendations">
                  <Button className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-md text-xs sm:text-sm h-8 sm:h-10">
                    <Zap className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                    <span className="hidden sm:inline">View AI Insights</span>
                    <span className="sm:hidden">AI Insights</span>
                  </Button>
                </Link>
              </CardContent>
            </Card>

            <Card className="group hover:shadow-xl hover:shadow-purple-500/20 transition-all duration-300 border border-purple-200/50 dark:border-purple-800/30 shadow-lg bg-gradient-to-br from-white via-purple-50/70 to-violet-100/80 dark:from-slate-800/95 dark:via-purple-950/30 dark:to-violet-950/40 backdrop-blur-sm hover:scale-105">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center text-slate-900 dark:text-slate-50 text-sm sm:text-base">
                  <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gradient-to-br from-purple-600 to-violet-600 rounded-lg flex items-center justify-center mr-2 sm:mr-3 group-hover:from-purple-700 group-hover:to-violet-700 transition-all shadow-lg shadow-purple-500/20">
                    <BarChart3 className="h-3 w-3 sm:h-4 sm:w-4 text-white" />
                  </div>
                  <span className="truncate">P/L Analysis</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <CardDescription className="mb-3 sm:mb-4 text-slate-600 dark:text-slate-300 leading-relaxed text-xs sm:text-sm">
                  View detailed profit and loss analysis
                </CardDescription>
                <Link href="/analytics">
                  <Button className="w-full text-xs sm:text-sm h-8 sm:h-10">
                    <span className="hidden sm:inline">View Analytics</span>
                    <span className="sm:hidden">Analytics</span>
                  </Button>
                </Link>
              </CardContent>
            </Card>

            <Card className="group hover:shadow-xl hover:shadow-slate-500/20 transition-all duration-300 border border-slate-200/50 dark:border-slate-700/30 shadow-lg bg-gradient-to-br from-white via-slate-50/70 to-gray-100/80 dark:from-slate-800/95 dark:via-slate-900/30 dark:to-slate-950/40 backdrop-blur-sm hover:scale-105">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center text-slate-900 dark:text-slate-50 text-sm sm:text-base">
                  <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gradient-to-br from-slate-600 to-gray-700 rounded-lg flex items-center justify-center mr-2 sm:mr-3 group-hover:from-slate-700 group-hover:to-gray-800 transition-all shadow-lg shadow-slate-500/20">
                    <Settings className="h-3 w-3 sm:h-4 sm:w-4 text-white" />
                  </div>
                  <span className="truncate">Trading212 Connection</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <CardDescription className="mb-3 sm:mb-4 text-slate-600 dark:text-slate-300 leading-relaxed text-xs sm:text-sm">
                  Manage your Trading212 API connection
                </CardDescription>
                <Link href="/settings">
                  <Button
                    className="w-full text-xs sm:text-sm h-8 sm:h-10"
                    variant="outline"
                  >
                    <span className="hidden sm:inline">Configure</span>
                    <span className="sm:hidden">Settings</span>
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>

          {/* Daily P/L Chart */}
          <div className="mt-8">
            {dataLoading ? (
              <Card className="p-6">
                <div className="flex items-center justify-center h-64">
                  <div className="flex flex-col items-center space-y-4">
                    <Spinner size="xl" variant="primary" />
                    <p className="text-sm text-muted-foreground">
                      Loading chart data...
                    </p>
                  </div>
                </div>
              </Card>
            ) : (
              <DailyPnLChart
                selectedAccountId={selectedAccountId || undefined}
              />
            )}
          </div>

          {/* AI Recommendations Preview */}
          {!dataLoading && stats.aiRecommendations > 0 && (
            <Card className="mt-8 border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/20">
              <CardHeader>
                <CardTitle className="flex items-center text-blue-900 dark:text-blue-100">
                  <Brain className="h-5 w-5 mr-2" />
                  Latest AI Insights
                </CardTitle>
                <CardDescription className="text-blue-700 dark:text-blue-300">
                  You have {stats.aiRecommendations} new AI recommendations
                  waiting for review
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <p className="text-blue-800 dark:text-blue-200">
                    Our AI has analyzed your positions and found actionable exit
                    strategies to optimize your portfolio.
                  </p>
                  <Link href="/ai-recommendations">
                    <Button className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700">
                      Review Now
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </ClientWrapper>
  );
}
