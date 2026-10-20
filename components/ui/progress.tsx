import * as React from "react";
import { cn } from "@/lib/utils";

function Progress({ value = 0, className, indicatorClassName }: { value?: number; className?: string; indicatorClassName?: string }) {
  return (
    <div data-slot="progress" className={cn("relative h-2 w-full overflow-hidden rounded-full bg-muted", className)}>
      <div
        data-slot="progress-indicator"
        className={cn("h-full rounded-full bg-primary transition-all duration-700", indicatorClassName)}
        style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
      />
    </div>
  );
}

export { Progress };
