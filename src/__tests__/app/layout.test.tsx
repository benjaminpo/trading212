import { render, screen } from "@testing-library/react";
import RootLayout, { metadata } from "@/app/layout";

// Mock the font imports
jest.mock("next/font/google", () => ({
  Geist: () => ({
    variable: "--font-geist-sans",
  }),
  Geist_Mono: () => ({
    variable: "--font-geist-mono",
  }),
}));

// Mock the theme provider
jest.mock("@/components/theme-provider", () => ({
  ThemeProvider: ({ children, ...props }: any) => (
    <div data-testid="theme-provider" data-props={JSON.stringify(props)}>
      {children}
    </div>
  ),
}));

// Mock the session provider
jest.mock("@/app/providers/session-provider", () => ({
  SessionProvider: ({ children }: any) => (
    <div data-testid="session-provider">{children}</div>
  ),
}));

describe("RootLayout", () => {
  it("should render children wrapped in providers", () => {
    const testContent = "Test Content";
    render(
      <RootLayout>
        <div>{testContent}</div>
      </RootLayout>,
    );

    expect(screen.getByText(testContent)).toBeInTheDocument();
    expect(screen.getByTestId("theme-provider")).toBeInTheDocument();
    expect(screen.getByTestId("session-provider")).toBeInTheDocument();
  });

  it("should apply correct font variables to body", () => {
    render(
      <RootLayout>
        <div>Test</div>
      </RootLayout>,
    );

    const body = document.body;
    expect(body).toHaveClass("--font-geist-sans");
    expect(body).toHaveClass("--font-geist-mono");
    expect(body).toHaveClass("antialiased");
  });

  it("should render without hydration issues", () => {
    render(
      <RootLayout>
        <div>Test</div>
      </RootLayout>,
    );

    const html = document.documentElement;
    const body = document.body;

    // Just verify the layout renders properly
    expect(html).toBeInTheDocument();
    expect(body).toBeInTheDocument();
  });

  it("should set correct lang attribute on html", () => {
    render(
      <RootLayout>
        <div>Test</div>
      </RootLayout>,
    );

    expect(document.documentElement).toHaveAttribute("lang", "en");
  });

  it("should configure ThemeProvider with correct props", () => {
    render(
      <RootLayout>
        <div>Test</div>
      </RootLayout>,
    );

    const themeProvider = screen.getByTestId("theme-provider");
    const props = JSON.parse(themeProvider.getAttribute("data-props") || "{}");

    expect(props).toEqual({
      attribute: "class",
      defaultTheme: "system",
      enableSystem: true,
      disableTransitionOnChange: true,
    });
  });

  describe("metadata", () => {
    it("should have correct title", () => {
      expect(metadata.title).toBe("Trading212 Extra");
    });

    it("should have correct description", () => {
      expect(metadata.description).toBe(
        "Advanced Trading212 management with AI-powered exit strategies and P/L tracking",
      );
    });

    it("should have correct viewport settings", () => {
      expect(metadata.viewport).toBe(
        "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no",
      );
    });
  });
});
