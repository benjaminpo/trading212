import { render, screen } from "@testing-library/react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";

describe("Card Components", () => {
  describe("Card", () => {
    it("should render with default styles", () => {
      render(<Card data-testid="card">Card content</Card>);

      const card = screen.getByTestId("card");
      expect(card).toBeInTheDocument();
      expect(card).toHaveClass(
        "rounded-lg",
        "border",
        "bg-card",
        "text-card-foreground",
        "shadow-sm",
      );
    });

    it("should accept custom className", () => {
      render(
        <Card className="custom-card" data-testid="card">
          Content
        </Card>,
      );

      const card = screen.getByTestId("card");
      expect(card).toHaveClass("custom-card");
      expect(card).toHaveClass("rounded-lg"); // Should still have default classes
    });

    it("should forward props to div element", () => {
      render(
        <Card data-testid="card" id="test-card">
          Content
        </Card>,
      );

      const card = screen.getByTestId("card");
      expect(card).toHaveAttribute("id", "test-card");
    });

    it("should render children", () => {
      render(
        <Card>
          <div>Child content</div>
        </Card>,
      );

      expect(screen.getByText("Child content")).toBeInTheDocument();
    });
  });

  describe("CardHeader", () => {
    it("should render with default styles", () => {
      render(<CardHeader data-testid="header">Header content</CardHeader>);

      const header = screen.getByTestId("header");
      expect(header).toBeInTheDocument();
      expect(header).toHaveClass("flex", "flex-col", "space-y-1.5", "p-6");
    });

    it("should accept custom className", () => {
      render(
        <CardHeader className="custom-header" data-testid="header">
          Content
        </CardHeader>,
      );

      const header = screen.getByTestId("header");
      expect(header).toHaveClass("custom-header");
      expect(header).toHaveClass("flex"); // Should still have default classes
    });
  });

  describe("CardTitle", () => {
    it("should render as h3 element with default styles", () => {
      render(<CardTitle>Test Title</CardTitle>);

      const title = screen.getByRole("heading", { level: 3 });
      expect(title).toBeInTheDocument();
      expect(title).toHaveTextContent("Test Title");
      expect(title).toHaveClass(
        "text-2xl",
        "font-semibold",
        "leading-none",
        "tracking-tight",
      );
    });

    it("should accept custom className", () => {
      render(<CardTitle className="custom-title">Title</CardTitle>);

      const title = screen.getByRole("heading");
      expect(title).toHaveClass("custom-title");
      expect(title).toHaveClass("text-2xl"); // Should still have default classes
    });

    it("should forward props", () => {
      render(<CardTitle id="test-title">Title</CardTitle>);

      const title = screen.getByRole("heading");
      expect(title).toHaveAttribute("id", "test-title");
    });
  });

  describe("CardDescription", () => {
    it("should render as p element with default styles", () => {
      render(<CardDescription>Test description</CardDescription>);

      const description = screen.getByText("Test description");
      expect(description).toBeInTheDocument();
      expect(description.tagName).toBe("P");
      expect(description).toHaveClass("text-sm", "text-muted-foreground");
    });

    it("should accept custom className", () => {
      render(
        <CardDescription className="custom-desc">Description</CardDescription>,
      );

      const description = screen.getByText("Description");
      expect(description).toHaveClass("custom-desc");
      expect(description).toHaveClass("text-sm"); // Should still have default classes
    });
  });

  describe("CardContent", () => {
    it("should render with default styles", () => {
      render(<CardContent data-testid="content">Content text</CardContent>);

      const content = screen.getByTestId("content");
      expect(content).toBeInTheDocument();
      expect(content).toHaveClass("p-6", "pt-0");
    });

    it("should accept custom className", () => {
      render(
        <CardContent className="custom-content" data-testid="content">
          Content
        </CardContent>,
      );

      const content = screen.getByTestId("content");
      expect(content).toHaveClass("custom-content");
      expect(content).toHaveClass("p-6"); // Should still have default classes
    });
  });

  describe("CardFooter", () => {
    it("should render with default styles", () => {
      render(<CardFooter data-testid="footer">Footer content</CardFooter>);

      const footer = screen.getByTestId("footer");
      expect(footer).toBeInTheDocument();
      expect(footer).toHaveClass("flex", "items-center", "p-6", "pt-0");
    });

    it("should accept custom className", () => {
      render(
        <CardFooter className="custom-footer" data-testid="footer">
          Footer
        </CardFooter>,
      );

      const footer = screen.getByTestId("footer");
      expect(footer).toHaveClass("custom-footer");
      expect(footer).toHaveClass("flex"); // Should still have default classes
    });
  });

  describe("Complete Card Example", () => {
    it("should render a complete card structure", () => {
      render(
        <Card data-testid="complete-card">
          <CardHeader>
            <CardTitle>Card Title</CardTitle>
            <CardDescription>Card description text</CardDescription>
          </CardHeader>
          <CardContent>
            <p>Main content goes here</p>
          </CardContent>
          <CardFooter>
            <button>Action Button</button>
          </CardFooter>
        </Card>,
      );

      const card = screen.getByTestId("complete-card");
      expect(card).toBeInTheDocument();

      expect(
        screen.getByRole("heading", { name: "Card Title" }),
      ).toBeInTheDocument();
      expect(screen.getByText("Card description text")).toBeInTheDocument();
      expect(screen.getByText("Main content goes here")).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "Action Button" }),
      ).toBeInTheDocument();
    });
  });

  describe("Accessibility", () => {
    it("should support ARIA attributes", () => {
      render(
        <Card
          role="region"
          aria-labelledby="card-title"
          data-testid="accessible-card"
        >
          <CardHeader>
            <CardTitle id="card-title">Accessible Card</CardTitle>
          </CardHeader>
          <CardContent>Content</CardContent>
        </Card>,
      );

      const card = screen.getByTestId("accessible-card");
      expect(card).toHaveAttribute("role", "region");
      expect(card).toHaveAttribute("aria-labelledby", "card-title");

      const title = screen.getByRole("heading");
      expect(title).toHaveAttribute("id", "card-title");
    });
  });
});
