import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const spinnerVariants = cva("animate-spin rounded-full border-solid", {
  variants: {
    size: {
      sm: "h-4 w-4 border-2",
      default: "h-6 w-6 border-2",
      lg: "h-8 w-8 border-2",
      xl: "h-12 w-12 border-4",
      "2xl": "h-16 w-16 border-4",
      "3xl": "h-32 w-32 border-4",
    },
    variant: {
      default: "border-gray-300 border-t-primary",
      primary: "border-primary/20 border-t-primary",
      secondary: "border-secondary/20 border-t-secondary",
      muted: "border-muted border-t-foreground",
      accent: "border-accent/20 border-t-accent",
    },
  },
  defaultVariants: {
    size: "default",
    variant: "default",
  },
});

export interface SpinnerProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof spinnerVariants> {}

const Spinner = React.forwardRef<HTMLDivElement, SpinnerProps>(
  ({ className, size, variant, ...props }, ref) => {
    return (
      <div
        className={cn(spinnerVariants({ size, variant }), className)}
        ref={ref}
        {...props}
      />
    );
  },
);

Spinner.displayName = "Spinner";

export { Spinner, spinnerVariants };
