import { NEED_META } from "@/lib/catalog";
import type { NeedKey } from "@/lib/types";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

export function needColor(v: number) {
  if (v >= 60) return "bg-emerald-500";
  if (v >= 30) return "bg-amber-400";
  return "bg-red-500";
}

export function NeedsBar({ need, value, compact = false }: { need: NeedKey; value: number; compact?: boolean }) {
  const meta = NEED_META[need];
  const v = Math.round(value);
  return (
    <div className={cn("flex items-center gap-2", compact ? "text-[11px]" : "text-xs")}>
      <span className="w-5 text-center" title={meta.label}>
        {meta.emoji}
      </span>
      {!compact && <span className="text-muted-foreground w-14">{meta.label}</span>}
      <Progress value={v} className={compact ? "h-1.5" : "h-2.5"} indicatorClassName={needColor(v)} />
      <span className={cn("w-7 text-right tabular-nums", v < 30 && "font-semibold text-red-600")}>{v}</span>
    </div>
  );
}
