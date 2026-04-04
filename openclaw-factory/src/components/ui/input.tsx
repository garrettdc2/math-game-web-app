import * as React from "react";
import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-9 w-full rounded-lg border border-white/[0.08] bg-transparent px-3 py-1 text-sm text-text-primary placeholder:text-text-tertiary focus-visible:outline-none focus-visible:border-white/[0.2] disabled:cursor-not-allowed disabled:opacity-50 transition-colors duration-100",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input };
