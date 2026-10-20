"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Mobile bottom sheet. */
export function Sheet({
  title,
  icon,
  subtitle,
  onClose,
  children,
  className,
  right,
}: {
  title: string;
  icon?: ReactNode;
  subtitle?: ReactNode;
  onClose?: () => void;
  children: ReactNode;
  className?: string;
  right?: ReactNode;
}) {
  return (
    <div className="pointer-events-auto absolute inset-x-0 bottom-0 z-40 flex justify-center">
      <div className={cn("sheet-in w-full max-w-xl rounded-t-[28px] bg-white shadow-[0_-10px_40px_rgba(0,0,0,0.18)]", className)}>
        <div className="flex justify-center pt-2.5">
          <div className="h-1.5 w-12 rounded-full bg-slate-200" />
        </div>
        <div className="flex items-center gap-3 px-5 pt-3 pb-2">
          {icon && <div className="flex size-12 items-center justify-center rounded-full bg-slate-100 text-2xl">{icon}</div>}
          <div className="min-w-0 flex-1">
            <div className="text-2xl font-extrabold tracking-tight">{title}</div>
            {subtitle && <div className="text-sm text-slate-500">{subtitle}</div>}
          </div>
          {right}
          {onClose && (
            <button onClick={onClose} className="cursor-pointer rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-600">
              Hide
            </button>
          )}
        </div>
        <div className="max-h-[58vh] overflow-y-auto px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">{children}</div>
      </div>
    </div>
  );
}

export function Pill({ children, className, onClick }: { children: ReactNode; className?: string; onClick?: () => void }) {
  const Comp = onClick ? "button" : "div";
  return (
    <Comp
      onClick={onClick}
      className={cn(
        "pointer-events-auto flex items-center gap-2 rounded-full bg-slate-900/90 px-4 py-2 text-white shadow-lg backdrop-blur",
        onClick && "cursor-pointer active:scale-95",
        className,
      )}
    >
      {children}
    </Comp>
  );
}

export function RoundButton({ children, onClick, className, label }: { children: ReactNode; onClick?: () => void; className?: string; label?: string }) {
  return (
    <button
      aria-label={label}
      onClick={onClick}
      className={cn("pointer-events-auto flex size-14 cursor-pointer items-center justify-center rounded-full bg-white text-xl shadow-lg active:scale-95", className)}
    >
      {children}
    </button>
  );
}
