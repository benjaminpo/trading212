import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

// Mock next-auth and next/navigation
jest.mock("next-auth/react", () => ({
  useSession: () => ({
    data: { user: { name: "Test User" } },
    status: "authenticated",
  }),
}));

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn() }),
  usePathname: () => "/",
}));

// Mock fetch to prevent API calls
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({ orders: [], positions: [] }),
  }),
) as jest.Mock;

describe("Trail Stop quantity input precision", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("allows high precision quantity input like 91.20073327", async () => {
    const TrailStopPage = (await import("@/app/trail-stop/page")).default;
    render(React.createElement(TrailStopPage));

    // Wait for page to load and data to be fetched
    await waitFor(
      () => {
        expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
      },
      { timeout: 5000 },
    );

    // Wait for Create Order button to appear
    const createButton = await screen.findByText("Create Order");
    fireEvent.click(createButton);

    // Find quantity input
    const quantityInput = await screen.findByPlaceholderText(
      /Number of shares \(e\.g\., 91\.20073327\)/,
    );

    // Verify it has step="any" for high precision
    expect(quantityInput).toHaveAttribute("step", "any");

    // Test entering high precision value
    fireEvent.change(quantityInput, { target: { value: "91.20073327" } });
    expect(quantityInput).toHaveValue(91.20073327);
  });

  it("accepts various decimal precisions", async () => {
    const TrailStopPage = (await import("@/app/trail-stop/page")).default;
    render(React.createElement(TrailStopPage));

    // Wait for page to load and data to be fetched
    await waitFor(
      () => {
        expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
      },
      { timeout: 5000 },
    );

    const createButton = await screen.findByText("Create Order");
    fireEvent.click(createButton);

    const quantityInput =
      await screen.findByPlaceholderText(/Number of shares/);

    // Test different precision levels
    const testValues = [
      { input: "1.5", expected: 1.5 },
      { input: "10.25", expected: 10.25 },
      { input: "100.123", expected: 100.123 },
      { input: "1000.1234", expected: 1000.1234 },
      { input: "91.20073327", expected: 91.20073327 },
      { input: "0.000001", expected: 0.000001 },
    ];

    for (const { input, expected } of testValues) {
      fireEvent.change(quantityInput, { target: { value: input } });
      expect(quantityInput).toHaveValue(expected);
    }
  });
});
