import React from "react";
import { render } from "@testing-library/react";
import { useSession } from "next-auth/react";

export const setSession = (
  status: "authenticated" | "unauthenticated" | "loading",
  user: unknown = { name: "Test User" },
) => {
  (useSession as unknown as jest.Mock).mockReturnValue({
    data: status === "authenticated" ? { user } : null,
    status,
  });
};

export const mockFetchJson = (data: unknown, ok: boolean = true) => {
  (global.fetch as unknown as jest.Mock).mockResolvedValue({
    ok,
    json: async () => data,
  });
};

export const renderPageByPath = async (path: string) => {
  const Page = (await import(path)).default;
  render(React.createElement(Page));
};

export const withDefaultFetch = (overrides: Record<string, unknown> = {}) => {
  (global.fetch as unknown as jest.Mock).mockImplementation((url: string) => {
    if (url.includes("/api/trail-stop/orders")) {
      return Promise.resolve({ ok: true, json: async () => ({ orders: [] }) });
    }
    if (url.includes("/api/trading212/optimized/accounts")) {
      return Promise.resolve({ ok: true, json: async () => ({ accounts: [] }) });
    }
    if (url.includes("/api/trading212/optimized/portfolio") || url.includes("/api/trading212/portfolio")) {
      return Promise.resolve({ ok: true, json: async () => ({ positions: [] }) });
    }
    return Promise.resolve({ ok: true, json: async () => (overrides[url] ?? {}) });
  });
};

export const fixtures = {
  account: (over: Partial<{ id: string; name: string; isPractice: boolean }> = {}) => ({
    id: "account1",
    name: "Acc1",
    isPractice: false,
    ...over,
  }),
  position: (over: Partial<{ ticker: string; quantity: number; currentPrice: number; ppl: number; pplPercent: number; marketValue: number }> = {}) => ({
    ticker: "AAPL",
    quantity: 10,
    currentPrice: 150,
    marketValue: 1500,
    ppl: 50,
    pplPercent: 3.45,
    ...over,
  }),
  order: (over: Partial<{ id: string; symbol: string; quantity: number; trailAmount: number; trailPercent?: number; stopPrice?: number; isActive: boolean; isPractice: boolean; createdAt: string; updatedAt: string }> = {}) => ({
    id: "1",
    symbol: "AAPL",
    quantity: 10,
    trailAmount: 5,
    isActive: true,
    isPractice: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...over,
  }),
};
