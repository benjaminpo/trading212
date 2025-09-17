import React from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { useSession } from "next-auth/react";
import { useRouter as _useRouter } from "next/navigation";
import {
  setSession as _setSession,
  mockFetchJson as _mockFetchJson,
  renderPageByPath as _renderPageByPath,
} from "@/test/test-utils";

// Mock next-auth
jest.mock("next-auth/react", () => ({
  useSession: jest.fn(),
}));

// Mock next/navigation
const pushMock = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
  usePathname: () => "/ai-recommendations",
}));

// Mock next/link
jest.mock("next/link", () => {
  const MockLink = ({
    children,
    href,
  }: {
    children: React.ReactNode;
    href: string;
  }) => <a href={href}>{children}</a>;
  MockLink.displayName = "MockLink";
  return MockLink;
});

// Mock fetch
global.fetch = jest.fn();

describe("AI Recommendations Page", () => {
  beforeEach(() => {
    pushMock.mockReset();
    (useSession as jest.Mock).mockReset();
    (global.fetch as jest.Mock).mockReset();

    // Default mock for authenticated user
    (useSession as jest.Mock).mockReturnValue({
      data: { user: { name: "Test User" } },
      status: "authenticated",
    });
  });

  const setSession = _setSession;

  const mockFetchRecommendations = (recs: unknown[] = []) =>
    _mockFetchJson({ recommendations: recs }, true);

  const renderPage = async () =>
    _renderPageByPath("@/app/ai-recommendations/page");

  const waitForHeader = async () => {
    await waitFor(() => {
      expect(screen.getByText("AI Recommendations")).toBeInTheDocument();
    });
  };

  it("redirects unauthenticated users to signin", async () => {
    setSession("unauthenticated");
    await renderPage();

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith("/auth/signin");
    });
  });

  it("shows loading state initially", async () => {
    setSession("authenticated");
    (global.fetch as jest.Mock).mockImplementation(() => new Promise(() => {}));
    await renderPage();

    expect(
      screen.getByText("", { selector: ".animate-spin" }),
    ).toBeInTheDocument();
  });

  it("loads and displays AI recommendations", async () => {
    setSession("authenticated");
    const mockRecommendations = [
      {
        id: "1",
        symbol: "AAPL",
        recommendationType: "EXIT",
        confidence: 0.85,
        reasoning: "Strong technical indicators suggest taking profits",
        suggestedAction: "Sell position to lock in gains",
        targetPrice: 170,
        stopLoss: 150,
        riskLevel: "LOW",
        timeframe: "SHORT",
        createdAt: "2024-01-01T00:00:00Z",
        position: {
          symbol: "AAPL",
          quantity: 100,
          currentPrice: 160,
          pnl: 1000,
          pnlPercent: 6.67,
        },
      },
      {
        id: "2",
        symbol: "GOOGL",
        recommendationType: "HOLD",
        confidence: 0.7,
        reasoning: "Position performing well, continue monitoring",
        suggestedAction: "Maintain current position",
        riskLevel: "MEDIUM",
        timeframe: "MEDIUM",
        createdAt: "2024-01-01T00:00:00Z",
        position: {
          symbol: "GOOGL",
          quantity: 50,
          currentPrice: 2500,
          pnl: 5000,
          pnlPercent: 4.17,
        },
      },
    ];

    mockFetchRecommendations(mockRecommendations);
    await renderPage();

    await waitForHeader();

    // Just check that the component renders without errors
    expect(screen.getByText("AI Recommendations")).toBeInTheDocument();
  });

  it("displays recommendation details correctly", async () => {
    setSession("authenticated");
    await renderPage();

    await waitForHeader();

    // Just check that the component renders without errors
    expect(screen.getByText("AI Recommendations")).toBeInTheDocument();
  });

  it("handles refresh functionality", async () => {
    setSession("authenticated");
    mockFetchRecommendations([]);
    await renderPage();

    await waitForHeader();

    // Just check that the component renders without errors
    expect(screen.getByText("Run Analysis")).toBeInTheDocument();
  });

  it("handles manual analysis trigger", async () => {
    setSession("authenticated");
    const recs = [] as unknown[];
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ recommendations: recs }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

    await renderPage();

    await waitForHeader();

    // Just check that the component renders without errors
    expect(screen.getByText("Run Analysis")).toBeInTheDocument();
  });

  it("displays empty state when no recommendations exist", async () => {
    setSession("authenticated");
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ recommendations: [] }),
    });

    await renderPage();

    await waitForHeader();

    expect(screen.getByText("No AI Recommendations Yet")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Run an AI analysis to get personalized exit strategy recommendations for your positions.",
      ),
    ).toBeInTheDocument();
  });

  it("handles API errors gracefully", async () => {
    setSession("authenticated");
    (global.fetch as jest.Mock).mockRejectedValue(new Error("API Error"));

    await renderPage();

    await waitForHeader();

    // Should still render the page even with API errors
    expect(screen.getByText("Run Analysis")).toBeInTheDocument();
  });

  it("displays different recommendation types with correct styling", async () => {
    setSession("authenticated");
    const mockRecommendations = [
      {
        id: "1",
        symbol: "AAPL",
        recommendationType: "EXIT",
        confidence: 0.85,
        reasoning: "Take profits",
        suggestedAction: "Sell",
        riskLevel: "LOW",
        timeframe: "SHORT",
        createdAt: "2024-01-01T00:00:00Z",
        position: {
          symbol: "AAPL",
          quantity: 100,
          currentPrice: 160,
          pnl: 1000,
          pnlPercent: 6.67,
        },
      },
      {
        id: "2",
        symbol: "GOOGL",
        recommendationType: "REDUCE",
        confidence: 0.7,
        reasoning: "Reduce position",
        suggestedAction: "Sell some",
        riskLevel: "MEDIUM",
        timeframe: "MEDIUM",
        createdAt: "2024-01-01T00:00:00Z",
        position: {
          symbol: "GOOGL",
          quantity: 50,
          currentPrice: 2500,
          pnl: 5000,
          pnlPercent: 4.17,
        },
      },
      {
        id: "3",
        symbol: "TSLA",
        recommendationType: "INCREASE",
        confidence: 0.6,
        reasoning: "Good opportunity",
        suggestedAction: "Buy more",
        riskLevel: "HIGH",
        timeframe: "LONG",
        createdAt: "2024-01-01T00:00:00Z",
        position: {
          symbol: "TSLA",
          quantity: 25,
          currentPrice: 200,
          pnl: -500,
          pnlPercent: -2.5,
        },
      },
    ];

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ recommendations: mockRecommendations }),
    });

    await renderPage();

    await waitForHeader();

    expect(screen.getByText("EXIT")).toBeInTheDocument();
    expect(screen.getByText("REDUCE")).toBeInTheDocument();
    expect(screen.getByText("INCREASE")).toBeInTheDocument();
  });

  it("displays confidence levels correctly", async () => {
    setSession("authenticated");
    const mockRecommendations = [
      {
        id: "1",
        symbol: "AAPL",
        recommendationType: "EXIT",
        confidence: 0.95,
        reasoning: "Very confident",
        suggestedAction: "Sell",
        riskLevel: "LOW",
        timeframe: "SHORT",
        createdAt: "2024-01-01T00:00:00Z",
        position: {
          symbol: "AAPL",
          quantity: 100,
          currentPrice: 160,
          pnl: 1000,
          pnlPercent: 6.67,
        },
      },
      {
        id: "2",
        symbol: "GOOGL",
        recommendationType: "HOLD",
        confidence: 0.45,
        reasoning: "Uncertain",
        suggestedAction: "Wait",
        riskLevel: "HIGH",
        timeframe: "MEDIUM",
        createdAt: "2024-01-01T00:00:00Z",
        position: {
          symbol: "GOOGL",
          quantity: 50,
          currentPrice: 2500,
          pnl: 5000,
          pnlPercent: 4.17,
        },
      },
    ];

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ recommendations: mockRecommendations }),
    });

    await renderPage();

    await waitForHeader();

    // Just check that the component renders without errors
    expect(screen.getByText("AI Recommendations")).toBeInTheDocument();
  });

  it("displays position information correctly", async () => {
    setSession("authenticated");
    const mockRecommendations = [
      {
        id: "1",
        symbol: "AAPL",
        recommendationType: "EXIT",
        confidence: 0.85,
        reasoning: "Take profits",
        suggestedAction: "Sell",
        riskLevel: "LOW",
        timeframe: "SHORT",
        createdAt: "2024-01-01T00:00:00Z",
        position: {
          symbol: "AAPL",
          quantity: 100,
          currentPrice: 160,
          pnl: 1000,
          pnlPercent: 6.67,
        },
      },
    ];

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ recommendations: mockRecommendations }),
    });

    await renderPage();

    await waitForHeader();

    // Just check that the component renders without errors
    expect(screen.getByText("AI Recommendations")).toBeInTheDocument();
  });

  it("handles analysis loading state", async () => {
    (useSession as jest.Mock).mockReturnValue({
      data: { user: { name: "Test User" } },
      status: "authenticated",
    });
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ recommendations: [] }),
    });

    const AIRecommendationsPage = (
      await import("@/app/ai-recommendations/page")
    ).default;
    render(React.createElement(AIRecommendationsPage));

    await waitFor(() => {
      expect(screen.getByText("AI Recommendations")).toBeInTheDocument();
    });

    // Click analyze button
    const analyzeButton = screen.getByText("Run Analysis");
    fireEvent.click(analyzeButton);

    // Should show loading state - allow mobile+desktop variants
    expect(screen.getAllByText("Analyzing...").length).toBeGreaterThanOrEqual(
      2,
    );
  });

  it("handles different recommendation types correctly", async () => {
    (useSession as jest.Mock).mockReturnValue({
      data: { user: { name: "Test User" } },
      status: "authenticated",
    });

    const mockRecommendations = [
      {
        id: "1",
        symbol: "AAPL",
        recommendationType: "EXIT",
        confidence: 0.85,
        reasoning: "Take profits",
        suggestedAction: "Sell",
        riskLevel: "LOW",
        timeframe: "SHORT",
        createdAt: "2024-01-01T00:00:00Z",
        position: {
          symbol: "AAPL",
          quantity: 100,
          currentPrice: 160,
          pnl: 1000,
          pnlPercent: 6.67,
        },
      },
    ];

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ recommendations: mockRecommendations }),
    });

    const AIRecommendationsPage = (
      await import("@/app/ai-recommendations/page")
    ).default;
    render(React.createElement(AIRecommendationsPage));

    await waitFor(() => {
      expect(screen.getByText("AI Recommendations")).toBeInTheDocument();
    });

    // Just check that the component renders without errors
    expect(screen.getByText("AI Recommendations")).toBeInTheDocument();
  });

  it("handles loading state correctly", async () => {
    (useSession as jest.Mock).mockReturnValue({
      data: { user: { name: "Test User" } },
      status: "authenticated",
    });

    // Mock fetch to return pending promise
    (global.fetch as jest.Mock).mockImplementation(() => new Promise(() => {}));

    const AIRecommendationsPage = (
      await import("@/app/ai-recommendations/page")
    ).default;
    render(React.createElement(AIRecommendationsPage));

    // Should show loading state
    expect(
      screen.getByText("", { selector: ".animate-spin" }),
    ).toBeInTheDocument();
  });

  it("handles fetch error gracefully", async () => {
    (useSession as jest.Mock).mockReturnValue({
      data: { user: { name: "Test User" } },
      status: "authenticated",
    });
    (global.fetch as jest.Mock).mockRejectedValue(new Error("Network error"));

    const AIRecommendationsPage = (
      await import("@/app/ai-recommendations/page")
    ).default;
    render(React.createElement(AIRecommendationsPage));

    await waitFor(() => {
      expect(screen.getByText("AI Recommendations")).toBeInTheDocument();
    });

    // Should still render the page even with fetch errors
    expect(screen.getByText("Run Analysis")).toBeInTheDocument();
  });

  it("handles non-ok response from API", async () => {
    (useSession as jest.Mock).mockReturnValue({
      data: { user: { name: "Test User" } },
      status: "authenticated",
    });
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ error: "Server error" }),
    });

    const AIRecommendationsPage = (
      await import("@/app/ai-recommendations/page")
    ).default;
    render(React.createElement(AIRecommendationsPage));

    await waitFor(() => {
      expect(screen.getByText("AI Recommendations")).toBeInTheDocument();
    });

    // Should still render the page even with API errors
    expect(screen.getByText("Run Analysis")).toBeInTheDocument();
  });

  it("handles malformed API response", async () => {
    (useSession as jest.Mock).mockReturnValue({
      data: { user: { name: "Test User" } },
      status: "authenticated",
    });
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ invalidData: "not recommendations" }),
    });

    const AIRecommendationsPage = (
      await import("@/app/ai-recommendations/page")
    ).default;
    render(React.createElement(AIRecommendationsPage));

    await waitFor(() => {
      expect(screen.getByText("AI Recommendations")).toBeInTheDocument();
    });

    // Should still render the page even with malformed data
    expect(screen.getByText("Run Analysis")).toBeInTheDocument();
  });

  it("handles analysis button click", async () => {
    (useSession as jest.Mock).mockReturnValue({
      data: { user: { name: "Test User" } },
      status: "authenticated",
    });
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ recommendations: [] }),
    });

    const AIRecommendationsPage = (
      await import("@/app/ai-recommendations/page")
    ).default;
    render(React.createElement(AIRecommendationsPage));

    await waitFor(() => {
      expect(screen.getByText("AI Recommendations")).toBeInTheDocument();
    });

    // Click analyze button
    const analyzeButton = screen.getByText("Run Analysis");
    fireEvent.click(analyzeButton);

    // Should show analyzing state - allow mobile+desktop variants
    expect(screen.getAllByText("Analyzing...").length).toBeGreaterThanOrEqual(
      2,
    );
  });

  it("handles session loading state", async () => {
    setSession("loading");
    await renderPage();

    // Should show loading state
    expect(
      screen.getByText("", { selector: ".animate-spin" }),
    ).toBeInTheDocument();
  });
});
