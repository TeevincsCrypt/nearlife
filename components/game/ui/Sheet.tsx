"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Game-style bottom sheet: blue panel, ribbon title, round close button. */
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
      <div className={cn("sheet-in glass-strong relative w-full max-w-xl rounded-t-[28px] border-b-0 pt-1", className)}>
        <div className="flex items-center gap-3 px-4 pt-3 pb-2">
          {icon && <div className="well flex size-12 shrink-0 items-center justify-center rounded-2xl text-2xl">{icon}</div>}
          <div className="min-w-0 flex-1">
            <div className="font-display truncate text-2xl leading-tight text-stroke uppercase">{title}</div>
            {subtitle && <div className="text-sm font-bold text-[#cfe0ff]">{subtitle}</div>}
          </div>
          {right}
          {onClose && <CloseButton onClick={onClose} />}
        </div>
        <div className="max-h-[56vh] overflow-y-auto px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))]">{children}</div>
      </div>
    </div>
  );
}

export function CloseButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-label="Close"
      className="flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-full border-[3px] border-[#0d1b5e] bg-gradient-to-b from-[#7fb2ff] to-[#2f5be8] text-lg font-black text-white shadow-[inset_0_2px_0_rgba(255,255,255,0.5),0_3px_0_#0d1b5e] active:translate-y-0.5"
    >
      ✕
    </button>
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
      className={cn(active ? "btn-gold" : "btn-blue", "pointer-events-auto flex cursor-pointer items-center justify-center rounded-2xl text-xl", className)}
    >
      {children}
    </button>
  );
}
