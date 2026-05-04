import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium transition-colors",
  {
    variants: {
      variant: {
        default: "border-primary/40 bg-primary/20 text-primary",
        success: "border-success/40 bg-success/20 text-success",
        warning: "border-warning/40 bg-warning/20 text-warning",
        danger:  "border-danger/40 bg-danger/20 text-danger",
        purple:  "border-purple/40 bg-purple/20 text-purple",
        muted:   "border-border bg-layer-2 text-text-muted",
      },
    },
    defaultVariants: { variant: "default" },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
