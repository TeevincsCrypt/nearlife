"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Dark glass bottom sheet. */
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
    <div className="pointer-events-auto absolute inset-x-0 bottom-0 z-40 flex justify-center px-2">
      <div className={cn("sheet-in glass-strong w-full max-w-xl rounded-t-3xl shadow-[0_-12px_40px_rgba(0,0,0,0.5)]", className)}>
        <div className="h-[3px] rounded-t-3xl bg-gradient-to-r from-[#00ec97] via-[#22d3ee] to-[#a78bfa]" />
        <div className="flex items-center gap-3 px-5 pt-4 pb-2">
          {icon && <div className="flex size-11 items-center justify-center rounded-2xl bg-white/5 text-2xl">{icon}</div>}
          <div className="min-w-0 flex-1">
            <div className="text-xl font-extrabold tracking-tight text-white">{title}</div>
            {subtitle && <div className="text-sm text-slate-400">{subtitle}</div>}
          </div>
          {right}
          {onClose && (
            <button onClick={onClose} aria-label="Close" className="flex size-9 cursor-pointer items-center justify-center rounded-full bg-white/10 text-slate-300">
              ✕
            </button>
          )}
        </div>
        <div className="max-h-[56vh] overflow-y-auto px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">{children}</div>
      </div>
    </div>
  );
}

export function GlassButton({
  children,
  onClick,
  className,
  label,
  active,
}: {
  children: ReactNode;
  onClick?: () => void;
  className?: string;
  label?: string;
  active?: boolean;
}) {
  return (
    <button
      aria-label={label}
      onClick={onClick}
      className={cn(
        "glass pointer-events-auto flex cursor-pointer items-center justify-center rounded-2xl text-xl shadow-lg active:scale-95",
        active && "neon-ring text-[#00ec97]",
        className,
      )}
    >
      {children}
    </button>
  );
}
