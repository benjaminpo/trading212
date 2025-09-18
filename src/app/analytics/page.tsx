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
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Target,
  BarChart3,
  PieChart,
  RefreshCw,
} from "lucide-react";
import Link from "next/link";
import ClientWrapper from "@/components/client-wrapper";
import AccountSelector from "@/components/account-selector";
import { ThemeToggle } from "@/components/theme-toggle";
import MobileNav from "@/components/mobile-nav";
import { formatCurrency } from "@/lib/currency";
import PositionsTable from "@/components/positions-table";

interface Position {
  ticker: string;
  quantity: number;
  averagePrice: number;
  currentPrice: number;
  ppl: number;
  pplPercent: number;
  marketValue: number;
  maxBuy: number;
  maxSell: number;
  accountName?: string;
  accountId?: string;
  isPractice?: boolean;
}

interface AnalyticsData {
  connected: boolean;
  positions: Position[];
  totalValue: number;
  totalPnL: number;
  totalPnLPercent: number;
  totalPositions?: number;
  error?: string;
  account?: {
    cash: number;
    currency: string;
  };
  accountSummary?: {
    connectedAccounts: number;
    accountNames: string[];
    totalInvestedValue: number;
  };
}

export default function AnalyticsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData>({
    connected: false,
    positions: [],
    totalValue: 0,
    totalPnL: 0,
    totalPnLPercent: 0,
  });
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(
    null,
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  // Moved up to satisfy initialization order for dependencies

  const loadSingleAccountAnalytics = useCallback(async () => {
    const portfolioUrl = `/api/trading212/portfolio?accountId=${selectedAccountId}`;
    const response = await fetch(portfolioUrl);

    if (response.ok) {
      const data = await response.json();
      logger.info("✅ Single account analytics data loaded:", {
        ...data,
        positionCount: data.positions?.length || 0,
        samplePosition: data.positions?.[0] || null,
      });
      setAnalyticsData(data);
    } else if (response.status === 429) {
      logger.info("⏳ Rate limited, retrying in a moment...");
      setAnalyticsData({
        connected: true,
        positions: [],
        totalValue: 0,
        totalPnL: 0,
        totalPnLPercent: 0,
      });
    } else {
      logger.info("❌ Failed to load analytics data:", response.status);
      const errorData = await response.json().catch(() => ({}));
      logger.info("Error details:", errorData);
    }
  }, [selectedAccountId]);

  const loadAggregatedAnalytics = useCallback(async () => {
    // Load all accounts first
    const accountsResponse = await fetch("/api/trading212/optimized/accounts");
    let accounts = [];

    if (accountsResponse.ok) {
      const accountsData = await accountsResponse.json();
      accounts = accountsData.accounts || [];
    }

    if (accounts.length === 0) {
      logger.info("❌ No accounts found for analytics aggregation");
      setAnalyticsData({
        connected: false,
        positions: [],
        totalValue: 0,
        totalPnL: 0,
        totalPnLPercent: 0,
      });
      return;
    }

    // Fetch portfolio data for each active account
    const portfolioPromises = accounts
      .filter((account: { isActive: boolean }) => account.isActive)
      .map(async (account: { id: string; name: string }) => {
        try {
          const response = await fetch(
            `/api/trading212/optimized/portfolio?accountId=${account.id}`,
          );
          if (response.ok) {
            const data = await response.json();
            return { account, data };
          }
          return { account, data: null };
        } catch (error) {
          console.error(
            `Error loading portfolio for account ${account.name}:`,
            error,
          );
          return { account, data: null };
        }
      });

    const portfolioResults = await Promise.allSettled(portfolioPromises);

    // Aggregate all positions and statistics
    const aggregatedPositions: Position[] = [];
    let totalCurrentValue = 0;
    let totalPnL = 0;
    let connectedAccounts = 0;
    const accountNames: string[] = [];
    let primaryCurrency = "USD"; // Default currency

    for (const result of portfolioResults) {
      if (
        result.status === "fulfilled" &&
        result.value.data?.connected &&
        !result.value.data.error
      ) {
        const { account, data } = result.value;
        connectedAccounts++;
        accountNames.push(account.name);

        // Use the first account's currency as primary currency for aggregated view
        if (connectedAccounts === 1 && data.account?.currency) {
          primaryCurrency = data.account.currency;
        }

        // Add account name to each position for identification
        const accountPositions = (data.positions || []).map(
          (pos: Position) => ({
            ...pos,
            accountName: account.name,
            accountId: account.id,
            isPractice: account.isPractice,
          }),
        );

        aggregatedPositions.push(...accountPositions);

        // Aggregate totals
        totalCurrentValue += data.totalValue || 0;
        totalPnL += data.totalPnL || 0;
      }
    }

    const aggregatedData: AnalyticsData = {
      connected: connectedAccounts > 0,
      positions: aggregatedPositions,
      totalValue: totalCurrentValue,
      totalPnL: totalPnL,
      totalPnLPercent:
        totalCurrentValue !== 0 ? (totalPnL / totalCurrentValue) * 100 : 0,
      account: {
        currency: primaryCurrency,
        cash: 0,
      },
    };

    setAnalyticsData(aggregatedData);
  }, []);

  const loadAnalyticsData = useCallback(async () => {
    try {
      logger.info("📊 Loading P/L analytics data...");

      if (selectedAccountId) {
        // Load data for specific account
        await loadSingleAccountAnalytics();
      } else {
        // Load aggregated data for all accounts
        await loadAggregatedAnalytics();
      }
    } catch (error) {
      console.error("Error loading analytics data:", error);
      setAnalyticsData({
        connected: false,
        positions: [],
        totalValue: 0,
        totalPnL: 0,
        totalPnLPercent: 0,
      });
    } finally {
      setLoading(false);
    }
  }, [selectedAccountId, loadSingleAccountAnalytics, loadAggregatedAnalytics]);

  useEffect(() => {
    if (!mounted || status === "loading") return;
    if (!session) {
      router.push("/auth/signin");
      return;
    }

    loadAnalyticsData();
  }, [mounted, session, status, router, selectedAccountId, loadAnalyticsData]);

  const handleRefresh = async () => {
    setLoading(true);
    await loadAnalyticsData();
  };

  const handleAccountChange = (accountId: string | null) => {
    setSelectedAccountId(accountId);
    setLoading(true);
  };

  const getTopPerformers = () => {
    return [...analyticsData.positions]
      .filter(
        (p) => p.pplPercent != null && !isNaN(p.pplPercent) && p.pplPercent > 0,
      )
      .sort((a, b) => (b.pplPercent || 0) - (a.pplPercent || 0))
      .slice(0, 5);
  };

  const getWorstPerformers = () => {
    return [...analyticsData.positions]
      .filter(
        (p) => p.pplPercent != null && !isNaN(p.pplPercent) && p.pplPercent < 0,
      )
      .sort((a, b) => (a.pplPercent || 0) - (b.pplPercent || 0))
      .slice(0, 5);
  };

  const getLargestPositions = () => {
    return [...analyticsData.positions]
      .filter((p) => p.marketValue != null && !isNaN(p.marketValue))
      .sort((a, b) => (b.marketValue || 0) - (a.marketValue || 0))
      .slice(0, 5);
  };

  const getPositionsByPnL = () => {
    const winners = analyticsData.positions.filter((p) => (p.ppl || 0) > 0);
    const losers = analyticsData.positions.filter((p) => (p.ppl || 0) < 0);

    return {
      winners: winners.length,
      losers: losers.length,
      winnersValue: winners.reduce((sum, p) => sum + (p.ppl || 0), 0),
      losersValue: Math.abs(losers.reduce((sum, p) => sum + (p.ppl || 0), 0)),
    };
  };

  if (!mounted || status === "loading" || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50/40 to-indigo-50/30 dark:from-slate-950 dark:via-slate-900 dark:to-slate-800">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  const pnlStats = getPositionsByPnL();

  return (
    <ClientWrapper>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/40 to-indigo-50/30 dark:from-slate-950 dark:via-slate-900 dark:to-slate-800">
        {/* Header */}
        <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200/60 dark:border-slate-700/60 shadow-sm dark:shadow-slate-950/20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center py-4 lg:py-6 space-y-4 lg:space-y-0">
              {/* Top section - Back button and title */}
              <div className="flex flex-col sm:flex-row sm:items-center space-y-3 sm:space-y-0 sm:space-x-4">
                <Link href="/dashboard">
                  <Button variant="ghost" size="sm" className="w-fit">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back
                  </Button>
                </Link>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-50">
                      P/L Analysis
                    </h1>
                    {analyticsData.connected ? (
                      <Badge className="w-fit bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 border-green-200 dark:border-green-800">
                        <div className="w-2 h-2 bg-green-500 rounded-full mr-1.5"></div>
                        Live Data
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
                  <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 mt-1">
                    Detailed profit and loss analysis
                  </p>
                </div>
              </div>

              {/* Bottom section - Controls */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-3 sm:space-y-0 sm:space-x-4">
                <div className="flex items-center space-x-2 w-full sm:w-auto">
                  <span className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 whitespace-nowrap">
                    Account:
                  </span>
                  <AccountSelector
                    selectedAccountId={selectedAccountId || undefined}
                    onAccountChange={handleAccountChange}
                    className="w-32 sm:w-48"
                  />
                </div>
                <div className="flex items-center space-x-2 w-full sm:w-auto">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRefresh}
                    disabled={loading}
                    className="flex-1 sm:flex-none"
                  >
                    <RefreshCw
                      className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`}
                    />
                    <span className="hidden sm:inline">Refresh</span>
                    <span className="sm:hidden">Update</span>
                  </Button>
                  <MobileNav user={session?.user} />
                  <ThemeToggle className="hidden sm:flex" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
          {!analyticsData.connected ? (
            <Card className="border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-950/20">
              <CardHeader>
                <CardTitle className="flex items-center text-orange-900 dark:text-orange-100">
                  <BarChart3 className="h-5 w-5 mr-2" />
                  Connect Trading212 for Live Analysis
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-orange-800 dark:text-orange-200 mb-4">
                  Connect your Trading212 account to see detailed P/L analysis
                  of your actual positions.
                </p>
                <Link href="/settings">
                  <Button className="bg-orange-600 hover:bg-orange-700">
                    Connect Trading212
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-8">
              {/* Overview Stats */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card className="border border-blue-200/50 dark:border-blue-800/30 shadow-lg bg-gradient-to-br from-white via-blue-50/50 to-cyan-50/80 dark:from-slate-800/90 dark:via-blue-950/20 dark:to-cyan-950/30">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-slate-700 dark:text-slate-200">
                      Total Portfolio Value
                    </CardTitle>
                    <DollarSign className="h-4 w-4 text-blue-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                      {formatCurrency(
                        analyticsData.totalValue,
                        analyticsData.account?.currency || "USD",
                      )}
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                      {analyticsData.positions.length} positions
                      {!selectedAccountId && analyticsData.accountSummary && (
                        <span className="block">
                          across{" "}
                          {analyticsData.accountSummary.connectedAccounts}{" "}
                          accounts
                        </span>
                      )}
                    </p>
                  </CardContent>
                </Card>

                <Card className="border border-green-200/50 dark:border-green-800/30 shadow-lg bg-gradient-to-br from-white via-green-50/50 to-emerald-50/80 dark:from-slate-800/90 dark:via-green-950/20 dark:to-emerald-950/30">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-slate-700 dark:text-slate-200">
                      Total P/L
                    </CardTitle>
                    <TrendingUp className="h-4 w-4 text-green-600" />
                  </CardHeader>
                  <CardContent>
                    <div
                      className={`text-2xl font-bold ${analyticsData.totalPnL >= 0 ? "text-green-700 dark:text-green-300" : "text-red-700 dark:text-red-300"}`}
                    >
                      {formatCurrency(
                        analyticsData.totalPnL,
                        analyticsData.account?.currency || "USD",
                      )}
                    </div>
                    <Badge
                      variant={
                        analyticsData.totalPnLPercent >= 0 ? "success" : "error"
                      }
                      className="text-xs mt-1"
                    >
                      {analyticsData.totalPnLPercent >= 0 ? "+" : ""}
                      {analyticsData.totalPnLPercent.toFixed(2)}%
                    </Badge>
                  </CardContent>
                </Card>

                <Card className="border border-purple-200/50 dark:border-purple-800/30 shadow-lg bg-gradient-to-br from-white via-purple-50/50 to-violet-50/80 dark:from-slate-800/90 dark:via-purple-950/20 dark:to-violet-950/30">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-slate-700 dark:text-slate-200">
                      Winning Positions
                    </CardTitle>
                    <Target className="h-4 w-4 text-purple-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-purple-700 dark:text-purple-300">
                      {pnlStats.winners}
                    </div>
                    <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                      +
                      {formatCurrency(
                        pnlStats.winnersValue,
                        analyticsData.account?.currency || "USD",
                      )}
                    </p>
                  </CardContent>
                </Card>

                <Card className="border border-red-200/50 dark:border-red-800/30 shadow-lg bg-gradient-to-br from-white via-red-50/50 to-rose-50/80 dark:from-slate-800/90 dark:via-red-950/20 dark:to-rose-950/30">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-slate-700 dark:text-slate-200">
                      Losing Positions
                    </CardTitle>
                    <TrendingDown className="h-4 w-4 text-red-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-red-700 dark:text-red-300">
                      {pnlStats.losers}
                    </div>
                    <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                      -
                      {formatCurrency(
                        Math.abs(pnlStats.losersValue),
                        analyticsData.account?.currency || "USD",
                      )}
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Top Performers */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <Card className="shadow-lg bg-white/95 dark:bg-slate-800/95">
                  <CardHeader>
                    <CardTitle className="flex items-center text-green-700 dark:text-green-300">
                      <TrendingUp className="h-5 w-5 mr-2" />
                      Top Performers
                    </CardTitle>
                    <CardDescription>
                      Best performing positions by percentage
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {getTopPerformers().length > 0 ? (
                      getTopPerformers().map((position) => (
                        <div
                          key={position.ticker}
                          className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-950/20 rounded-lg"
                        >
                          <div>
                            <div className="font-semibold text-slate-900 dark:text-slate-100">
                              {position.ticker}
                            </div>
                            <div className="text-sm text-slate-600 dark:text-slate-400">
                              {position.quantity || 0} shares @{" "}
                              {formatCurrency(
                                position.currentPrice || 0,
                                analyticsData.account?.currency || "USD",
                              )}
                              {!selectedAccountId && position.accountName && (
                                <span className="block text-xs opacity-75">
                                  {position.accountName}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-bold text-green-700 dark:text-green-300">
                              +
                              {formatCurrency(
                                position.ppl || 0,
                                analyticsData.account?.currency || "USD",
                              )}
                            </div>
                            <div className="text-sm font-medium text-green-600 dark:text-green-400">
                              +{(position.pplPercent || 0).toFixed(2)}%
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-slate-600 dark:text-slate-400 text-center py-4">
                        No positions to display
                      </p>
                    )}
                  </CardContent>
                </Card>

                <Card className="shadow-lg bg-white/95 dark:bg-slate-800/95">
                  <CardHeader>
                    <CardTitle className="flex items-center text-red-700 dark:text-red-300">
                      <TrendingDown className="h-5 w-5 mr-2" />
                      Worst Performers
                    </CardTitle>
                    <CardDescription>
                      Positions with the largest losses
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {getWorstPerformers().length > 0 ? (
                      getWorstPerformers().map((position) => (
                        <div
                          key={position.ticker}
                          className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-950/20 rounded-lg"
                        >
                          <div>
                            <div className="font-semibold text-slate-900 dark:text-slate-100">
                              {position.ticker}
                            </div>
                            <div className="text-sm text-slate-600 dark:text-slate-400">
                              {position.quantity || 0} shares @{" "}
                              {formatCurrency(
                                position.currentPrice || 0,
                                analyticsData.account?.currency || "USD",
                              )}
                              {!selectedAccountId && position.accountName && (
                                <span className="block text-xs opacity-75">
                                  {position.accountName}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-bold text-red-700 dark:text-red-300">
                              {formatCurrency(
                                position.ppl || 0,
                                analyticsData.account?.currency || "USD",
                              )}
                            </div>
                            <div className="text-sm font-medium text-red-600 dark:text-red-400">
                              {(position.pplPercent || 0).toFixed(2)}%
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-slate-600 dark:text-slate-400 text-center py-4">
                        No positions to display
                      </p>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Largest Positions */}
              <Card className="shadow-lg bg-white/95 dark:bg-slate-800/95">
                <CardHeader>
                  <CardTitle className="flex items-center text-blue-700 dark:text-blue-300">
                    <PieChart className="h-5 w-5 mr-2" />
                    Largest Positions
                  </CardTitle>
                  <CardDescription>
                    Positions with the highest market value
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {getLargestPositions().length > 0 ? (
                      getLargestPositions().map((position, index) => (
                        <div
                          key={position.ticker}
                          className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg"
                        >
                          <div className="flex items-center space-x-4">
                            <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center text-blue-700 dark:text-blue-300 font-bold text-sm">
                              {index + 1}
                            </div>
                            <div>
                              <div className="font-semibold text-slate-900 dark:text-slate-100">
                                {position.ticker}
                              </div>
                              <div className="text-sm text-slate-600 dark:text-slate-400">
                                {position.quantity || 0} shares @{" "}
                                {formatCurrency(
                                  position.currentPrice || 0,
                                  analyticsData.account?.currency || "USD",
                                )}
                                {!selectedAccountId && position.accountName && (
                                  <span className="block text-xs opacity-75">
                                    {position.accountName}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-bold text-slate-900 dark:text-slate-100">
                              {formatCurrency(
                                position.marketValue || 0,
                                analyticsData.account?.currency || "USD",
                              )}
                            </div>
                            <div
                              className={`text-sm font-medium ${(position.ppl || 0) >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}
                            >
                              {(position.ppl || 0) >= 0 ? "+" : ""}
                              {formatCurrency(
                                position.ppl || 0,
                                analyticsData.account?.currency || "USD",
                              )}{" "}
                              ({(position.pplPercent || 0).toFixed(2)}%)
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-slate-600 dark:text-slate-400 text-center py-8">
                        No positions to display
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* All Positions Table */}
              <Card className="shadow-lg bg-white/95 dark:bg-slate-800/95">
                <CardHeader>
                  <CardTitle className="flex items-center text-slate-900 dark:text-slate-100">
                    <BarChart3 className="h-5 w-5 mr-2" />
                    All Positions
                  </CardTitle>
                  <CardDescription>
                    Complete breakdown of your portfolio
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <PositionsTable
                    positions={analyticsData.positions}
                    currency={analyticsData.account?.currency || "USD"}
                    showAccountColumn={!selectedAccountId}
                  />
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </ClientWrapper>
  );
}
