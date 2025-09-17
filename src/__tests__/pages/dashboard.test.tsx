import React from "react";
import { render, waitFor, screen, act } from "@testing-library/react";

// Shared mocks per test
const pushMock = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
  usePathname: () => "/",
}));

// We'll re-mock next-auth per test where needed
jest.mock("next-auth/react", () => ({
  useSession: jest.fn(() => ({
    data: { user: { name: "Test User" } },
    status: "authenticated",
  })),
}));

describe("Dashboard page behaviors", () => {
  beforeEach(() => {
    pushMock.mockReset();
    (global.fetch as unknown as jest.Mock).mockReset();
  });

  it("redirects unauthenticated users to /auth/signin", async () => {
    const { useSession } = jest.requireMock("next-auth/react");
    (useSession as jest.Mock).mockReturnValueOnce({
      data: null,
      status: "unauthenticated",
    });

    const Dashboard = (await import("@/app/dashboard/page")).default;

    render(React.createElement(Dashboard));

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith("/auth/signin");
    });
  });

  it("shows loading spinner initially", async () => {
    // Minimal successful responses to allow mounting
    (global.fetch as jest.Mock).mockImplementation(
      async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes("/api/trading212/optimized/accounts")) {
          return { ok: true, json: async () => ({ accounts: [] }) } as any;
        }
        if (url.includes("/api/ai/optimized-analyze")) {
          return {
            ok: true,
            json: async () => ({ recommendations: [] }),
          } as any;
        }
        return { ok: true, json: async () => ({}) } as any;
      },
    );

    const Dashboard = (await import("@/app/dashboard/page")).default;
    const { container } = render(React.createElement(Dashboard));

    // Immediately after render, spinner should be present before effects complete
    expect(container.querySelector(".animate-spin")).toBeInTheDocument();
  });

  it("loads aggregated data when authenticated", async () => {
    (global.fetch as jest.Mock).mockImplementation(
      async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes("/api/trading212/optimized/accounts")) {
          return {
            ok: true,
            json: async () => ({
              accounts: [
                {
                  id: "a1",
                  name: "Acc1",
                  isActive: true,
                  isDefault: true,
                  isPractice: false,
                },
              ],
            }),
          } as any;
        }
        if (url.includes("/api/trading212/optimized/account?accountId=a1")) {
          return {
            ok: true,
            json: async () => ({
              connected: true,
              error: null,
              stats: {
                totalPnL: 1000,
                totalPnLPercent: 10,
                todayPnL: 50,
                todayPnLPercent: 0.5,
                activePositions: 3,
                trailStopOrders: 1,
              },
              account: {
                id: "a1",
                name: "Acc1",
                isPractice: false,
                currency: "USD",
                cash: 5000,
              },
              portfolio: [{ quantity: 1, currentPrice: 600 }],
            }),
          } as any;
        }
        if (url.includes("/api/ai/optimized-analyze")) {
          return {
            ok: true,
            json: async () => ({ recommendations: [1, 2] }),
          } as any;
        }
        return { ok: true, json: async () => ({}) } as any;
      },
    );

    const Dashboard = (await import("@/app/dashboard/page")).default;
    render(React.createElement(Dashboard));

    // Wait for key UI to reflect loaded data
    await waitFor(() => {
      expect(screen.getByText("Dashboard")).toBeInTheDocument();
    });

    // Active Positions = 3
    await waitFor(() => {
      expect(screen.getByText("3")).toBeInTheDocument();
    });

    // AI Recommendations count visible = 2
    await waitFor(() => {
      expect(screen.getAllByText("2").length).toBeGreaterThan(0);
    });
  });

  it("reloads data on window focus", async () => {
    const callCounts: Record<string, number> = {
      accounts: 0,
      account: 0,
      ai: 0,
    };
    (global.fetch as jest.Mock).mockImplementation(
      async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes("/api/trading212/optimized/accounts")) {
          callCounts.accounts++;
          return { ok: true, json: async () => ({ accounts: [] }) } as any;
        }
        if (url.includes("/api/trading212/optimized/account?")) {
          callCounts.account++;
          return {
            ok: true,
            json: async () => ({ connected: false, stats: {} }),
          } as any;
        }
        if (url.includes("/api/ai/optimized-analyze")) {
          callCounts.ai++;
          return {
            ok: true,
            json: async () => ({ recommendations: [] }),
          } as any;
        }
        return { ok: true, json: async () => ({}) } as any;
      },
    );

    const Dashboard = (await import("@/app/dashboard/page")).default;
    render(React.createElement(Dashboard));

    await waitFor(() =>
      expect(
        callCounts.accounts + callCounts.ai + callCounts.account,
      ).toBeGreaterThan(0),
    );

    // Trigger focus
    await act(async () => {
      window.dispatchEvent(new Event("focus"));
    });

    await waitFor(() => {
      // Expect additional calls after focus
      expect(
        callCounts.accounts + callCounts.ai + callCounts.account,
      ).toBeGreaterThan(1);
    });
  });

  it("shows Demo Mode badge when no accounts are connected", async () => {
    (global.fetch as jest.Mock).mockImplementation(
      async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes("/api/trading212/optimized/accounts")) {
          return { ok: true, json: async () => ({ accounts: [] }) } as any;
        }
        if (url.includes("/api/ai/optimized-analyze")) {
          return {
            ok: true,
            json: async () => ({ recommendations: [] }),
          } as any;
        }
        return { ok: true, json: async () => ({}) } as any;
      },
    );

    const Dashboard = (await import("@/app/dashboard/page")).default;
    render(React.createElement(Dashboard));

    await waitFor(
      () => {
        expect(screen.getByText("Demo Mode")).toBeInTheDocument();
      },
      { timeout: 6000 },
    );
  });

  it("switches to single-account data when account is selected", async () => {
    let accountCalls = 0;
    (global.fetch as jest.Mock).mockImplementation(
      async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes("/api/trading212/optimized/accounts")) {
          return {
            ok: true,
            json: async () => ({
              accounts: [
                {
                  id: "a1",
                  name: "Acc1",
                  isActive: true,
                  isDefault: true,
                  isPractice: false,
                },
              ],
            }),
          } as any;
        }
        if (url.includes("/api/trading212/optimized/account?accountId=a1")) {
          accountCalls++;
          return {
            ok: true,
            json: async () => ({
              connected: true,
              error: null,
              stats: {
                totalPnL: 0,
                totalPnLPercent: 0,
                todayPnL: 0,
                todayPnLPercent: 0,
                activePositions: 1,
                trailStopOrders: 0,
              },
              account: {
                id: "a1",
                name: "Acc1",
                isPractice: false,
                currency: "USD",
                cash: 0,
              },
              portfolio: [],
            }),
          } as any;
        }
        if (url.includes("/api/ai/optimized-analyze")) {
          return {
            ok: true,
            json: async () => ({ recommendations: [] }),
          } as any;
        }
        return { ok: true, json: async () => ({}) } as any;
      },
    );

    const Dashboard = (await import("@/app/dashboard/page")).default;
    render(React.createElement(Dashboard));

    // Open account selector and choose Acc1
    const trigger = await screen.findByRole(
      "button",
      { name: /all accounts/i },
      { timeout: 4000 },
    );
    await act(async () => {
      trigger.click();
    });
    const accOption = await screen.findByText("Acc1", undefined, {
      timeout: 4000,
    });
    await act(async () => {
      accOption.click();
    });

    await waitFor(() => {
      expect(accountCalls).toBeGreaterThan(0);
    });
  });

  it("retries on 500 and eventually loads data", async () => {
    let accountCallCount = 0;
    (global.fetch as jest.Mock).mockImplementation(
      async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes("/api/trading212/optimized/accounts")) {
          return {
            ok: true,
            json: async () => ({
              accounts: [
                {
                  id: "a1",
                  name: "Acc1",
                  isActive: true,
                  isDefault: true,
                  isPractice: false,
                },
              ],
            }),
          } as any;
        }
        if (url.includes("/api/trading212/optimized/account?accountId=a1")) {
          accountCallCount++;
          if (accountCallCount === 1) {
            return { ok: false, status: 500 } as any;
          }
          return {
            ok: true,
            json: async () => ({
              connected: true,
              error: null,
              stats: {
                totalPnL: 5,
                totalPnLPercent: 0.1,
                todayPnL: 1,
                todayPnLPercent: 0.02,
                activePositions: 2,
                trailStopOrders: 0,
              },
              account: {
                id: "a1",
                name: "Acc1",
                isPractice: false,
                currency: "USD",
                cash: 0,
              },
              portfolio: [],
            }),
          } as any;
        }
        if (url.includes("/api/ai/optimized-analyze")) {
          return {
            ok: true,
            json: async () => ({ recommendations: [] }),
          } as any;
        }
        return { ok: true, json: async () => ({}) } as any;
      },
    );

    const Dashboard = (await import("@/app/dashboard/page")).default;
    render(React.createElement(Dashboard));

    await waitFor(() => {
      // After retry, content renders
      expect(screen.getByText("Dashboard")).toBeInTheDocument();
    });
  });

  it("handles 429 gracefully and stays in Demo Mode when single-account is rate-limited", async () => {
    (global.fetch as jest.Mock).mockImplementation(
      async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes("/api/trading212/optimized/accounts")) {
          return {
            ok: true,
            json: async () => ({
              accounts: [
                {
                  id: "a1",
                  name: "Acc1",
                  isActive: true,
                  isDefault: true,
                  isPractice: false,
                },
              ],
            }),
          } as any;
        }
        if (url.includes("/api/trading212/optimized/account?accountId=a1")) {
          return { ok: false, status: 429 } as any;
        }
        if (url.includes("/api/ai/optimized-analyze")) {
          return {
            ok: true,
            json: async () => ({ recommendations: [] }),
          } as any;
        }
        return { ok: true, json: async () => ({}) } as any;
      },
    );

    const Dashboard = (await import("@/app/dashboard/page")).default;
    render(React.createElement(Dashboard));

    const trigger = await screen.findByRole(
      "button",
      { name: /all accounts/i },
      { timeout: 4000 },
    );
    await act(async () => {
      trigger.click();
    });
    const accOption = await screen.findByText("Acc1", undefined, {
      timeout: 4000,
    });
    await act(async () => {
      accOption.click();
    });

    await waitFor(
      () => {
        expect(screen.getByText("Demo Mode")).toBeInTheDocument();
      },
      { timeout: 6000 },
    );
  });

  it("shows Latest AI Insights card when there are recommendations", async () => {
    (global.fetch as jest.Mock).mockImplementation(
      async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes("/api/trading212/optimized/accounts")) {
          return { ok: true, json: async () => ({ accounts: [] }) } as any;
        }
        if (url.includes("/api/ai/optimized-analyze")) {
          return {
            ok: true,
            json: async () => ({ recommendations: [1, 2, 3] }),
          } as any;
        }
        return { ok: true, json: async () => ({}) } as any;
      },
    );

    const Dashboard = (await import("@/app/dashboard/page")).default;
    render(React.createElement(Dashboard));

    await waitFor(() => {
      expect(screen.getByText("Latest AI Insights")).toBeInTheDocument();
    });
  });
});
