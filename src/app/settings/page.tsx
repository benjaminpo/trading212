"use client";

export const dynamic = "force-dynamic";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ArrowLeft,
  CheckCircle,
  XCircle,
  User,
  Key,
  Palette,
  Activity,
  Plus,
  Trash2,
  Star,
  AlertCircle,
} from "lucide-react";
import Link from "next/link";
import LogoutButton from "@/components/logout-button";
import ClientWrapper from "@/components/client-wrapper";
import { ThemeToggle } from "@/components/theme-toggle";
import MobileNav from "@/components/mobile-nav";

interface Trading212Account {
  id: string;
  name: string;
  isPractice: boolean;
  isActive: boolean;
  isDefault: boolean;
  currency?: string;
  cash?: number;
  lastConnected?: string;
  lastError?: string;
  apiKeyPreview?: string;
  createdAt: string;
  updatedAt: string;
}

export default function SettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [accounts, setAccounts] = useState<Trading212Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Add account form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [newAccountName, setNewAccountName] = useState("");
  const [newApiKey, setNewApiKey] = useState("");
  const [newIsPractice, setNewIsPractice] = useState(false);
  const [newIsDefault, setNewIsDefault] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || status === "loading") return;
    if (!session) {
      router.push("/auth/signin");
      return;
    }

    loadAccounts();
  }, [mounted, session, status, router]);

  const loadAccounts = async () => {
    try {
      const response = await fetch("/api/trading212/optimized/accounts");
      if (response.ok) {
        const data = await response.json();
        setAccounts(data.accounts || []);
      } else {
        console.error("Failed to load accounts");
      }
    } catch (error) {
      console.error("Error loading accounts:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAccountName || !newApiKey) return;

    setSubmitting(true);

    try {
      const response = await fetch("/api/trading212/optimized/accounts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: newAccountName,
          apiKey: newApiKey,
          isPractice: newIsPractice,
          isDefault: newIsDefault,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        await loadAccounts();
        setNewAccountName("");
        setNewApiKey("");
        setNewIsPractice(false);
        setNewIsDefault(false);
        setShowAddForm(false);
        alert(data.message || "Account added successfully!");
      } else {
        console.error("Failed to add account:", data);
        const errorMessage = data.error || "Failed to add Trading212 account";
        alert(errorMessage);
      }
    } catch (error) {
      console.error("Error adding account:", error);
      alert("Error adding Trading212 account");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteAccount = async (
    accountId: string,
    accountName: string,
  ) => {
    if (
      !confirm(
        `Are you sure you want to delete the account "${accountName}"? This action cannot be undone.`,
      )
    )
      return;

    try {
      const response = await fetch(
        `/api/trading212/optimized/accounts/${accountId}`,
        {
          method: "DELETE",
        },
      );

      if (response.ok) {
        await loadAccounts();
        alert("Account deleted successfully!");
      } else {
        alert("Failed to delete account");
      }
    } catch (error) {
      console.error("Error deleting account:", error);
      alert("Error deleting account");
    }
  };

  const handleSetDefault = async (accountId: string, accountName: string) => {
    try {
      const response = await fetch(
        `/api/trading212/optimized/accounts/${accountId}/set-default`,
        {
          method: "POST",
        },
      );

      if (response.ok) {
        await loadAccounts();
        alert(`"${accountName}" is now your default account!`);
      } else {
        alert("Failed to set default account");
      }
    } catch (error) {
      console.error("Error setting default account:", error);
      alert("Error setting default account");
    }
  };

  const handleToggleActive = async (accountId: string, isActive: boolean) => {
    try {
      const response = await fetch(
        `/api/trading212/optimized/accounts/${accountId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ isActive: !isActive }),
        },
      );

      if (response.ok) {
        await loadAccounts();
      } else {
        alert("Failed to update account status");
      }
    } catch (error) {
      console.error("Error updating account:", error);
      alert("Error updating account");
    }
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

  return (
    <ClientWrapper>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/40 to-indigo-50/30 dark:from-slate-950 dark:via-slate-900 dark:to-slate-800">
        {/* Header */}
        <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200/60 dark:border-slate-700/60 shadow-sm dark:shadow-slate-950/20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center py-4 lg:py-6 space-y-4 lg:space-y-0">
              <div className="flex flex-col sm:flex-row sm:items-center space-y-3 sm:space-y-0 sm:space-x-4">
                <Link href="/dashboard">
                  <Button variant="ghost" size="sm" className="w-fit">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back
                  </Button>
                </Link>
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-50">
                    Settings
                  </h1>
                  <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300">
                    Manage your account and Trading212 connections
                  </p>
                </div>
              </div>
              <div className="flex space-x-4">
                <MobileNav user={session.user} />
                <ThemeToggle className="hidden sm:flex" />
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
          <div className="space-y-4 sm:space-y-6">
            {/* Account Information */}
            <Card className="border border-slate-200/50 dark:border-slate-700/50 shadow-lg bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center text-slate-900 dark:text-slate-50">
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center mr-3 shadow-lg shadow-blue-500/20">
                    <User className="h-4 w-4 text-white" />
                  </div>
                  Account Information
                </CardTitle>
                <CardDescription className="text-slate-600 dark:text-slate-300">
                  Your account details and preferences
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label
                    htmlFor="account-name"
                    className="block text-sm font-medium mb-2 text-slate-700 dark:text-slate-300"
                  >
                    Name
                  </label>
                  <Input
                    id="account-name"
                    value={session.user?.name || ""}
                    disabled
                    className="bg-slate-100/70 dark:bg-slate-700/70 border-slate-200/50 dark:border-slate-600/50"
                  />
                </div>
                <div>
                  <label
                    htmlFor="account-email"
                    className="block text-sm font-medium mb-2 text-slate-700 dark:text-slate-300"
                  >
                    Email
                  </label>
                  <Input
                    id="account-email"
                    value={session.user?.email || ""}
                    disabled
                    className="bg-slate-100/70 dark:bg-slate-700/70 border-slate-200/50 dark:border-slate-600/50"
                  />
                </div>
                <LogoutButton />
              </CardContent>
            </Card>

            {/* Theme Settings */}
            <Card className="border border-slate-200/50 dark:border-slate-700/50 shadow-lg bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center text-slate-900 dark:text-slate-50">
                  <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-violet-600 rounded-lg flex items-center justify-center mr-3 shadow-lg shadow-purple-500/20">
                    <Palette className="h-4 w-4 text-white" />
                  </div>
                  Theme Settings
                </CardTitle>
                <CardDescription className="text-slate-600 dark:text-slate-300">
                  Customize the appearance of your application
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      Dark Mode
                    </label>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      Toggle between light and dark theme
                    </p>
                  </div>
                  <ThemeToggle />
                </div>
              </CardContent>
            </Card>

            {/* Trading212 Accounts */}
            <Card className="border border-slate-200/50 dark:border-slate-700/50 shadow-lg bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center text-slate-900 dark:text-slate-50">
                      <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center mr-3 shadow-lg shadow-green-500/20">
                        <Key className="h-4 w-4 text-white" />
                      </div>
                      Trading212 Accounts
                    </CardTitle>
                    <CardDescription className="text-slate-600 dark:text-slate-300">
                      Manage multiple Trading212 account connections
                    </CardDescription>
                  </div>
                  <Button
                    onClick={() => setShowAddForm(!showAddForm)}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Account
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Add Account Form */}
                {showAddForm && (
                  <Card className="bg-slate-50 dark:bg-slate-700/50 border-slate-200 dark:border-slate-600">
                    <CardHeader>
                      <CardTitle className="text-lg text-slate-900 dark:text-slate-100">
                        Add New Trading212 Account
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <form onSubmit={handleAddAccount} className="space-y-4">
                        <div>
                          <label
                            htmlFor="new-account-name"
                            className="block text-sm font-medium mb-2 text-slate-700 dark:text-slate-300"
                          >
                            Account Name
                          </label>
                          <Input
                            id="new-account-name"
                            type="text"
                            placeholder="e.g., Personal, Business, Demo"
                            value={newAccountName}
                            onChange={(e) => setNewAccountName(e.target.value)}
                            required
                            className="bg-white dark:bg-slate-800"
                          />
                        </div>
                        <div>
                          <label
                            htmlFor="new-api-key"
                            className="block text-sm font-medium mb-2 text-slate-700 dark:text-slate-300"
                          >
                            Trading212 API Key
                          </label>
                          <Input
                            id="new-api-key"
                            type="password"
                            placeholder="Enter your Trading212 API key"
                            value={newApiKey}
                            onChange={(e) => setNewApiKey(e.target.value)}
                            required
                            className="bg-white dark:bg-slate-800"
                          />
                        </div>
                        <div className="flex items-center space-x-4">
                          <label
                            htmlFor="practice-checkbox"
                            className="flex items-center cursor-pointer"
                          >
                            <input
                              id="practice-checkbox"
                              type="checkbox"
                              checked={newIsPractice}
                              onChange={(e) =>
                                setNewIsPractice(e.target.checked)
                              }
                              className="mr-2"
                            />
                            <span className="text-sm text-slate-700 dark:text-slate-300">
                              Practice Account
                            </span>
                          </label>
                          <label
                            htmlFor="default-checkbox"
                            className="flex items-center cursor-pointer"
                          >
                            <input
                              id="default-checkbox"
                              type="checkbox"
                              checked={newIsDefault}
                              onChange={(e) =>
                                setNewIsDefault(e.target.checked)
                              }
                              className="mr-2"
                            />
                            <span className="text-sm text-slate-700 dark:text-slate-300">
                              Set as Default
                            </span>
                          </label>
                        </div>
                        <div className="flex space-x-2">
                          <Button
                            type="submit"
                            disabled={submitting}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            {submitting ? "Adding..." : "Add Account"}
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setShowAddForm(false)}
                          >
                            Cancel
                          </Button>
                        </div>
                      </form>
                    </CardContent>
                  </Card>
                )}

                {/* Existing Accounts */}
                {accounts.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Key className="h-8 w-8 text-slate-400" />
                    </div>
                    <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-2">
                      No Trading212 accounts
                    </h3>
                    <p className="text-slate-600 dark:text-slate-400 mb-4">
                      Add your first Trading212 account to get started with
                      automated trading features.
                    </p>
                    <Button
                      onClick={() => setShowAddForm(true)}
                      className="bg-green-600 hover:bg-green-700 text-white"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Your First Account
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {accounts.map((account) => (
                      <Card
                        key={account.id}
                        className={`${account.isDefault ? "ring-2 ring-green-500" : ""} ${!account.isActive ? "opacity-60" : ""}`}
                      >
                        <CardContent className="pt-6">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-4">
                              <div className="flex items-center space-x-2">
                                {account.isDefault && (
                                  <Star className="h-4 w-4 text-yellow-500 fill-current" />
                                )}
                                <h3 className="font-medium text-slate-900 dark:text-slate-100">
                                  {account.name}
                                </h3>
                                {account.isPractice && (
                                  <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 text-xs rounded-full">
                                    Practice
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              {account.lastError ? (
                                <div className="flex items-center text-red-600">
                                  <AlertCircle className="h-4 w-4 mr-1" />
                                  <span className="text-sm">Error</span>
                                </div>
                              ) : account.lastConnected ? (
                                <div className="flex items-center text-green-600">
                                  <CheckCircle className="h-4 w-4 mr-1" />
                                  <span className="text-sm">Connected</span>
                                </div>
                              ) : (
                                <div className="flex items-center text-slate-500">
                                  <XCircle className="h-4 w-4 mr-1" />
                                  <span className="text-sm">Not tested</span>
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="text-slate-600 dark:text-slate-400">
                                API Key:
                              </span>
                              <span className="ml-2 text-slate-900 dark:text-slate-100 font-mono">
                                {account.apiKeyPreview}
                              </span>
                            </div>
                            {account.currency && (
                              <div>
                                <span className="text-slate-600 dark:text-slate-400">
                                  Currency:
                                </span>
                                <span className="ml-2 text-slate-900 dark:text-slate-100">
                                  {account.currency}
                                </span>
                              </div>
                            )}
                            {account.cash !== null &&
                              account.cash !== undefined && (
                                <div>
                                  <span className="text-slate-600 dark:text-slate-400">
                                    Cash:
                                  </span>
                                  <span className="ml-2 text-slate-900 dark:text-slate-100">
                                    ${account.cash.toFixed(2)}
                                  </span>
                                </div>
                              )}
                            {account.lastConnected && (
                              <div>
                                <span className="text-slate-600 dark:text-slate-400">
                                  Last Connected:
                                </span>
                                <span className="ml-2 text-slate-900 dark:text-slate-100">
                                  {new Date(
                                    account.lastConnected,
                                  ).toLocaleDateString()}
                                </span>
                              </div>
                            )}
                          </div>

                          {account.lastError && (
                            <div className="mt-3 p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg">
                              <p className="text-sm text-red-800 dark:text-red-200">
                                <strong>Connection Error:</strong>{" "}
                                {account.lastError}
                              </p>
                            </div>
                          )}

                          <div className="mt-4 flex items-center space-x-2">
                            {!account.isDefault && account.isActive && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  handleSetDefault(account.id, account.name)
                                }
                                className="text-green-600 border-green-300 hover:bg-green-50 dark:hover:bg-green-950/20"
                              >
                                <Star className="h-3 w-3 mr-1" />
                                Set Default
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                handleToggleActive(account.id, account.isActive)
                              }
                              className={
                                account.isActive
                                  ? "text-orange-600"
                                  : "text-green-600"
                              }
                            >
                              {account.isActive ? "Deactivate" : "Activate"}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                handleDeleteAccount(account.id, account.name)
                              }
                              className="text-red-600 border-red-300 hover:bg-red-50 dark:hover:bg-red-950/20"
                            >
                              <Trash2 className="h-3 w-3 mr-1" />
                              Delete
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}

                <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
                    Multi-Account Features:
                  </h4>
                  <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                    <li>
                      • <strong>Default Account:</strong> Used when no specific
                      account is selected
                    </li>
                    <li>
                      • <strong>Account Switching:</strong> Switch between
                      accounts on dashboard and analytics
                    </li>
                    <li>
                      • <strong>Practice vs Live:</strong> Separate practice and
                      live accounts
                    </li>
                    <li>
                      • <strong>Aggregated View:</strong> See combined portfolio
                      across all accounts
                    </li>
                    <li>
                      • <strong>Individual Rate Limits:</strong> Each account
                      has its own API rate limit
                    </li>
                  </ul>
                </div>

                <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                  <h4 className="font-medium text-amber-900 dark:text-amber-100 mb-2">
                    🔧 Troubleshooting Connection Issues:
                  </h4>
                  <ul className="text-sm text-amber-800 dark:text-amber-200 space-y-1">
                    <li>
                      • <strong>401 Unauthorized:</strong> Check if your API key
                      is correct and complete
                    </li>
                    <li>
                      • <strong>Key too short:</strong> Trading212 API keys
                      should be 40+ characters
                    </li>
                    <li>
                      • <strong>Access denied:</strong> Enable API access in
                      Trading212 → Settings → API
                    </li>
                    <li>
                      • <strong>Account issues:</strong> Ensure your Trading212
                      account is fully verified
                    </li>
                    <li>
                      • <strong>Still not working:</strong> Try regenerating
                      your API key
                    </li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            {/* API Information */}
            <Card className="border border-slate-200/50 dark:border-slate-700/50 shadow-lg bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center text-slate-900 dark:text-slate-50">
                  <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-amber-600 rounded-lg flex items-center justify-center mr-3 shadow-lg shadow-orange-500/20">
                    <Activity className="h-4 w-4 text-white" />
                  </div>
                  API Information
                </CardTitle>
                <CardDescription className="text-slate-600 dark:text-slate-300">
                  Understanding Trading212 API limitations and modes
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                    <h4 className="font-medium text-green-900 dark:text-green-100 mb-2">
                      Practice Mode
                    </h4>
                    <ul className="text-sm text-green-800 dark:text-green-200 space-y-1">
                      <li>• Full API functionality</li>
                      <li>• Trail stop orders work</li>
                      <li>• AI recommendations with execution</li>
                      <li>• Real-time data</li>
                      <li>• No real money involved</li>
                    </ul>
                  </div>
                  <div className="bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4">
                    <h4 className="font-medium text-orange-900 dark:text-orange-100 mb-2">
                      Production Mode
                    </h4>
                    <ul className="text-sm text-orange-800 dark:text-orange-200 space-y-1">
                      <li>• Limited API functionality</li>
                      <li>• Orders saved but not executed</li>
                      <li>• AI recommendations for guidance</li>
                      <li>• Real account data</li>
                      <li>• Manual execution required</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </ClientWrapper>
  );
}
