import type { ComponentProps } from "react";

// Adapted from the shadcn/ui New York v4 Skeleton for AgroShift's surface tokens.
export function Skeleton({ className = "", ...props }: ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      aria-hidden="true"
      className={`rounded-lg bg-surface-2 motion-safe:animate-pulse ${className}`}
      {...props}
    />
  );
}
