import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset",
  {
    variants: {
      variant: {
        default: "bg-white/[0.06] text-text-secondary ring-white/[0.06]",
        running: "bg-white/[0.06] text-text-secondary ring-white/[0.06]",
        done: "bg-status-done/8 text-status-done ring-status-done/10",
        waiting: "bg-status-waiting/8 text-status-waiting ring-status-waiting/10",
        failed: "bg-status-failed/8 text-status-failed ring-status-failed/10",
        accent: "bg-white/[0.06] text-text-secondary ring-white/[0.06]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
