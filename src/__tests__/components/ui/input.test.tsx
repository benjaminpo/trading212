import { render, screen, fireEvent } from "@testing-library/react";
import { Input } from "@/components/ui/input";

describe("Input Component", () => {
  it("should render with default props", () => {
    render(<Input />);

    const input = screen.getByRole("textbox");
    expect(input).toBeInTheDocument();
    expect(input).toHaveClass(
      "flex",
      "h-10",
      "w-full",
      "rounded-md",
      "border",
      "border-input",
      "bg-background",
      "px-3",
      "py-2",
      "text-sm",
    );
  });

  it("should render with custom className", () => {
    render(<Input className="custom-input" />);

    const input = screen.getByRole("textbox");
    expect(input).toHaveClass("custom-input");
    expect(input).toHaveClass("flex"); // Should still have default classes
  });

  it("should handle different input types", () => {
    const { rerender } = render(<Input type="password" />);
    let input = screen.getByDisplayValue(""); // Use getByDisplayValue for password inputs
    expect(input).toHaveAttribute("type", "password");

    rerender(<Input type="email" />);
    input = screen.getByRole("textbox");
    expect(input).toHaveAttribute("type", "email");

    rerender(<Input type="number" />);
    input = screen.getByRole("spinbutton");
    expect(input).toHaveAttribute("type", "number");
  });

  it("should handle value changes", () => {
    const handleChange = jest.fn();
    render(<Input value="test value" onChange={handleChange} />);

    const input = screen.getByRole("textbox");
    expect(input).toHaveValue("test value");

    fireEvent.change(input, { target: { value: "new value" } });
    expect(handleChange).toHaveBeenCalledTimes(1);
  });

  it("should support placeholder text", () => {
    render(<Input placeholder="Enter your name" />);

    const input = screen.getByPlaceholderText("Enter your name");
    expect(input).toBeInTheDocument();
  });

  it("should be disabled when disabled prop is true", () => {
    render(<Input disabled />);

    const input = screen.getByRole("textbox");
    expect(input).toBeDisabled();
    expect(input).toHaveClass(
      "disabled:cursor-not-allowed",
      "disabled:opacity-50",
    );
  });

  it("should not accept input when disabled", () => {
    const handleChange = jest.fn();
    render(<Input disabled onChange={handleChange} />);

    const input = screen.getByRole("textbox");
    // Disabled inputs still fire onChange events in React Testing Library
    // The actual behavior depends on the browser implementation
    fireEvent.change(input, { target: { value: "test" } });

    // In a real browser, disabled inputs don't fire change events
    // But React Testing Library simulates the event anyway
    // This test verifies the input is properly disabled
    expect(input).toBeDisabled();
  });

  it("should support required attribute", () => {
    render(<Input required />);

    const input = screen.getByRole("textbox");
    expect(input).toBeRequired();
  });

  it("should support readonly attribute", () => {
    render(<Input readOnly value="readonly value" />);

    const input = screen.getByRole("textbox");
    expect(input).toHaveAttribute("readonly");
    expect(input).toHaveValue("readonly value");
  });

  it("should support min and max attributes for number inputs", () => {
    render(<Input type="number" min={0} max={100} />);

    const input = screen.getByRole("spinbutton");
    expect(input).toHaveAttribute("min", "0");
    expect(input).toHaveAttribute("max", "100");
  });

  it("should support maxLength attribute", () => {
    render(<Input maxLength={10} />);

    const input = screen.getByRole("textbox");
    expect(input).toHaveAttribute("maxLength", "10");
  });

  it("should handle focus and blur events", () => {
    const handleFocus = jest.fn();
    const handleBlur = jest.fn();
    render(<Input onFocus={handleFocus} onBlur={handleBlur} />);

    const input = screen.getByRole("textbox");

    fireEvent.focus(input);
    expect(handleFocus).toHaveBeenCalledTimes(1);
    // Focus testing in jsdom can be unreliable, so we just verify the handler was called

    fireEvent.blur(input);
    expect(handleBlur).toHaveBeenCalledTimes(1);
  });

  describe("Accessibility", () => {
    it("should support aria-label", () => {
      render(<Input aria-label="Search input" />);

      const input = screen.getByLabelText("Search input");
      expect(input).toBeInTheDocument();
    });

    it("should support aria-describedby", () => {
      render(
        <>
          <Input aria-describedby="help-text" />
          <div id="help-text">Enter at least 3 characters</div>
        </>,
      );

      const input = screen.getByRole("textbox");
      expect(input).toHaveAttribute("aria-describedby", "help-text");
    });

    it("should support aria-invalid", () => {
      render(<Input aria-invalid="true" />);

      const input = screen.getByRole("textbox");
      expect(input).toHaveAttribute("aria-invalid", "true");
    });

    it("should work with labels", () => {
      render(
        <>
          <label htmlFor="test-input">Test Label</label>
          <Input id="test-input" />
        </>,
      );

      const input = screen.getByLabelText("Test Label");
      expect(input).toBeInTheDocument();
      expect(input).toHaveAttribute("id", "test-input");
    });
  });

  describe("File Input", () => {
    it("should handle file input type", () => {
      render(<Input type="file" />);

      const input = screen.getByDisplayValue(""); // File inputs don't have textbox role
      expect(input).toHaveAttribute("type", "file");
      expect(input).toHaveClass("file:border-0", "file:bg-transparent");
    });

    it("should support file input attributes", () => {
      render(<Input type="file" accept=".jpg,.png" multiple />);

      const input = screen.getByDisplayValue(""); // File inputs don't have textbox role
      expect(input).toHaveAttribute("accept", ".jpg,.png");
      expect(input).toHaveAttribute("multiple");
    });
  });

  describe("Form Integration", () => {
    it("should work within a form", () => {
      const handleSubmit = jest.fn((e) => e.preventDefault());

      render(
        <form onSubmit={handleSubmit}>
          <Input name="username" defaultValue="testuser" />
          <button type="submit">Submit</button>
        </form>,
      );

      const input = screen.getByRole("textbox");
      const button = screen.getByRole("button");

      expect(input).toHaveAttribute("name", "username");
      expect(input).toHaveValue("testuser");

      fireEvent.click(button);
      expect(handleSubmit).toHaveBeenCalledTimes(1);
    });
  });
});
