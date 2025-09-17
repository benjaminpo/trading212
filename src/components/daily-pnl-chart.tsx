"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, BarChart3, RefreshCw } from "lucide-react";
import { formatCurrency } from "@/lib/currency";

interface DailyPnLData {
  id: string;
  date: string;
  totalPnL: number;
  todayPnL: number;
  totalValue: number;
  cash?: number;
  currency: string;
  positions: number;
}

interface DailyPnLSummary {
  totalDays: number;
  totalPnLChange: number;
  bestDay?: {
    date: string;
    todayPnL: number;
  };
  worstDay?: {
    date: string;
    todayPnL: number;
  };
  averageDailyPnL: number;
}

interface DailyPnLChartProps {
  selectedAccountId?: string;
  className?: string;
}

export default function DailyPnLChart({
  selectedAccountId,
  className = "",
}: DailyPnLChartProps) {
  const [dailyPnL, setDailyPnL] = useState<DailyPnLData[]>([]);
  const [summary, setSummary] = useState<DailyPnLSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDailyPnL = useCallback(
    async (refresh = false) => {
      try {
        if (refresh) setRefreshing(true);
        setError(null);

        const params = new URLSearchParams({
          days: "30",
        });

        if (selectedAccountId) {
          params.append("accountId", selectedAccountId);
        }

        const response = await fetch(`/api/daily-pnl?${params}`);
        if (!response.ok) {
          throw new Error("Failed to fetch daily P/L data");
        }

        const data = await response.json();
        setDailyPnL(data.dailyPnL || []);
        setSummary(data.summary || null);
      } catch (err) {
        console.error("Error fetching daily P/L:", err);
        setError(
          err instanceof Error ? err.message : "Failed to fetch daily P/L data",
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [selectedAccountId],
  );

  const captureSnapshot = async () => {
    try {
      setRefreshing(true);
      const response = await fetch("/api/daily-pnl", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          accountId: selectedAccountId,
          forceRefresh: true,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to capture daily P/L snapshot");
      }

      // Refresh the data after capturing
      await fetchDailyPnL();
    } catch (err) {
      console.error("Error capturing snapshot:", err);
      setError(
        err instanceof Error ? err.message : "Failed to capture snapshot",
      );
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDailyPnL();
  }, [selectedAccountId, fetchDailyPnL]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  const getMaxValue = () => {
    if (dailyPnL.length === 0) return 100;
    return Math.max(
      ...dailyPnL.map((d) => Math.abs(d.todayPnL)),
      100, // Minimum scale
    );
  };

  const maxValue = getMaxValue();

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center">
            <BarChart3 className="h-5 w-5 mr-2" />
            Daily P/L History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center">
            <BarChart3 className="h-5 w-5 mr-2" />
            Daily P/L History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-red-600 dark:text-red-400">
            <p className="mb-2">{error}</p>
            <Button onClick={() => fetchDailyPnL()} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (dailyPnL.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center">
              <BarChart3 className="h-5 w-5 mr-2" />
              Daily P/L History
            </div>
            <Button
              onClick={captureSnapshot}
              disabled={refreshing}
              size="sm"
              variant="outline"
            >
              {refreshing ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Calendar className="h-4 w-4" />
              )}
            </Button>
          </CardTitle>
          <CardDescription>
            Capture your first daily P/L snapshot to start tracking your
            performance
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center text-slate-600 dark:text-slate-400 py-8">
            <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="mb-4">No daily P/L data available yet</p>
            <Button onClick={captureSnapshot} disabled={refreshing}>
              {refreshing ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Capturing...
                </>
              ) : (
                <>
                  <Calendar className="h-4 w-4 mr-2" />
                  Capture First Snapshot
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center">
            <BarChart3 className="h-5 w-5 mr-2" />
            Daily P/L History
          </div>
          <div className="flex items-center space-x-2">
            <Button
              onClick={captureSnapshot}
              disabled={refreshing}
              size="sm"
              variant="outline"
            >
              {refreshing ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Calendar className="h-4 w-4" />
              )}
            </Button>
            <Button
              onClick={() => fetchDailyPnL(true)}
              disabled={refreshing}
              size="sm"
              variant="outline"
            >
              <RefreshCw
                className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
              />
            </Button>
          </div>
        </CardTitle>
        <CardDescription>
          Last {summary?.totalDays || 0} days •{" "}
          {selectedAccountId ? "Single Account" : "All Accounts"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Summary Stats */}
        {summary && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                {summary.totalDays}
              </div>
              <div className="text-xs text-slate-600 dark:text-slate-400">
                Days Tracked
              </div>
            </div>
            <div className="text-center">
              <div
                className={`text-2xl font-bold ${summary.totalPnLChange >= 0 ? "text-green-600" : "text-red-600"}`}
              >
                {summary.totalPnLChange >= 0 ? "+" : ""}
                {formatCurrency(summary.totalPnLChange, "USD")}
              </div>
              <div className="text-xs text-slate-600 dark:text-slate-400">
                Total Change
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(summary.bestDay?.todayPnL || 0, "USD")}
              </div>
              <div className="text-xs text-slate-600 dark:text-slate-400">
                Best Day
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">
                {formatCurrency(summary.worstDay?.todayPnL || 0, "USD")}
              </div>
              <div className="text-xs text-slate-600 dark:text-slate-400">
                Worst Day
              </div>
            </div>
          </div>
        )}

        {/* Simple Bar Chart */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 mb-2">
            <span>Daily P/L</span>
            <span>Last 30 days</span>
          </div>

          <div className="flex items-end justify-between h-32 space-x-1">
            {dailyPnL.slice(0, 30).map((day) => {
              const height = (Math.abs(day.todayPnL) / maxValue) * 100;
              const isPositive = day.todayPnL >= 0;

              return (
                <div
                  key={day.id}
                  className="flex flex-col items-center flex-1 group relative"
                >
                  <div
                    className={`w-full rounded-t transition-all duration-200 hover:opacity-80 ${
                      isPositive
                        ? "bg-gradient-to-t from-green-500 to-green-400"
                        : "bg-gradient-to-t from-red-500 to-red-400"
                    }`}
                    style={{ height: `${Math.max(height, 2)}%` }}
                    title={`${formatDate(day.date)}: ${formatCurrency(day.todayPnL, day.currency)}`}
                  />

                  {/* Tooltip */}
                  <div className="absolute bottom-full mb-2 hidden group-hover:block bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs rounded px-2 py-1 whitespace-nowrap z-10">
                    <div className="font-medium">{formatDate(day.date)}</div>
                    <div
                      className={
                        isPositive
                          ? "text-green-300 dark:text-green-600"
                          : "text-red-300 dark:text-red-600"
                      }
                    >
                      {formatCurrency(day.todayPnL, day.currency)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* X-axis labels */}
          <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 mt-2">
            <span>
              {dailyPnL.length > 0
                ? formatDate(dailyPnL[dailyPnL.length - 1].date)
                : ""}
            </span>
            <span>
              {dailyPnL.length > 0 ? formatDate(dailyPnL[0].date) : ""}
            </span>
          </div>
        </div>

        {/* Recent Days List */}
        <div className="mt-6 space-y-2">
          <h4 className="text-sm font-medium text-slate-900 dark:text-slate-100">
            Recent Days
          </h4>
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {dailyPnL.slice(0, 7).map((day) => {
              const isPositive = day.todayPnL >= 0;
              return (
                <div
                  key={day.id}
                  className="flex items-center justify-between text-sm"
                >
                  <div className="flex items-center">
                    <div
                      className={`w-2 h-2 rounded-full mr-2 ${isPositive ? "bg-green-500" : "bg-red-500"}`}
                    />
                    <span className="text-slate-600 dark:text-slate-400">
                      {formatDate(day.date)}
                    </span>
                  </div>
                  <div
                    className={`font-medium ${isPositive ? "text-green-600" : "text-red-600"}`}
                  >
                    {isPositive ? "+" : ""}
                    {formatCurrency(day.todayPnL, day.currency)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
