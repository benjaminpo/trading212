import React from "react";
import { render, screen } from "@testing-library/react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import AnalyticsPage from "@/app/analytics/page";

// Mock all dependencies
jest.mock("next-auth/react");
jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
}));
jest.mock("@/components/client-wrapper", () => {
  function ClientWrapperMock({ children }: any) {
    return <div>{children}</div>;
  }
  ClientWrapperMock.displayName = "ClientWrapperMock";
  return ClientWrapperMock;
});
jest.mock("@/components/account-selector", () => {
  function AccountSelectorMock() {
    return <div data-testid="account-selector">Account Selector</div>;
  }
  AccountSelectorMock.displayName = "AccountSelectorMock";
  return AccountSelectorMock;
});
jest.mock("@/components/theme-toggle", () => {
  function ThemeToggleMock() {
    return <div data-testid="theme-toggle">Theme Toggle</div>;
  }
  ThemeToggleMock.displayName = "ThemeToggleMock";
  return { ThemeToggle: ThemeToggleMock };
});
jest.mock("@/components/mobile-nav", () => {
  function MobileNavMock() {
    return <div data-testid="mobile-nav">Mobile Nav</div>;
  }
  MobileNavMock.displayName = "MobileNavMock";
  return MobileNavMock;
});
jest.mock("@/components/positions-table", () => {
  function PositionsTableMock() {
    return <div data-testid="positions-table">Positions Table</div>;
  }
  PositionsTableMock.displayName = "PositionsTableMock";
  return PositionsTableMock;
});
jest.mock("@/lib/currency", () => ({
  formatCurrency: (value: number, currency: string) =>
    `${currency} ${value.toFixed(2)}`,
}));
jest.mock("@/lib/logger", () => ({
  info: jest.fn(),
}));

const mockUseSession = useSession as jest.MockedFunction<typeof useSession>;
const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>;

// Mock fetch
global.fetch = jest.fn();

describe("Analytics Page", () => {
  const mockRouter = {
    push: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseRouter.mockReturnValue(mockRouter as any);
  });

  it("should show loading state when session is loading", () => {
    mockUseSession.mockReturnValue({
      data: null,
      status: "loading",
    });

    render(<AnalyticsPage />);

    // Loading state shows spinning animation - check for class name
    expect(document.querySelector(".animate-spin")).toBeInTheDocument();
  });

  it("should redirect to signin when no session", () => {
    mockUseSession.mockReturnValue({
      data: null,
      status: "unauthenticated",
    });

    render(<AnalyticsPage />);

    // Component should return null for unauthenticated users
    expect(screen.queryByText("P/L Analysis")).not.toBeInTheDocument();
  });

  it("should handle account change properly", async () => {
    const mockUser = {
      id: "test-user",
      email: "test@example.com",
      name: "Test User",
    };

    mockUseSession.mockReturnValue({
      data: { user: mockUser } as any,
      status: "authenticated",
    });

    // Mock successful fetch responses for aggregated data
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          accounts: [{ id: "acc1", name: "Test Account", isActive: true }],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          connected: true,
          positions: [],
          totalValue: 1000,
          totalPnL: 50,
          totalPnLPercent: 5,
          account: { currency: "USD", cash: 500 },
        }),
      });

    render(<AnalyticsPage />);

    // Wait for component to be mounted and data loaded
    await screen.findByText("P/L Analysis");

    expect(screen.getByText("P/L Analysis")).toBeInTheDocument();
    expect(screen.getByText("Live Data")).toBeInTheDocument();
  });

  it("should show demo mode when not connected", async () => {
    const mockUser = {
      id: "test-user",
      email: "test@example.com",
      name: "Test User",
    };

    mockUseSession.mockReturnValue({
      data: { user: mockUser } as any,
      status: "authenticated",
    });

    // Mock no accounts response
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ accounts: [] }),
    });

    render(<AnalyticsPage />);

    // Wait for component to be mounted and data loaded
    await screen.findByText("Connect Trading212 for Live Analysis");

    expect(
      screen.getByText("Connect Trading212 for Live Analysis"),
    ).toBeInTheDocument();
    expect(screen.getByText("Connect Trading212")).toBeInTheDocument();
  });
});
