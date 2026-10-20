"use client";

import { createContext, useCallback, useContext, useState } from "react";
import { cn } from "@/lib/utils";

interface Toast {
  id: number;
  text: string;
  kind: "info" | "error" | "success";
}

const ToastContext = createContext<(text: string, kind?: Toast["kind"]) => void>(() => {});

export function useToast() {
  return useContext(ToastContext);
}

export function Toaster({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const push = useCallback((text: string, kind: Toast["kind"] = "info") => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t.slice(-3), { id, text, kind }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3500);
  }, []);
  return (
    <ToastContext.Provider value={push}>
      {children}
      <div className="pointer-events-none fixed top-28 left-1/2 z-[60] flex -translate-x-1/2 flex-col items-center gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cn(
              "toast-in pointer-events-auto max-w-sm rounded-xl px-4 py-2 text-sm shadow-lg backdrop-blur",
              t.kind === "error" && "border border-rose-400/40 bg-rose-950/90 text-rose-100",
              t.kind === "success" && "border border-[#00ec97]/40 bg-[#06261b]/90 text-[#b7ffe1]",
              t.kind === "info" && "border border-white/10 bg-[#0e1020]/90 text-slate-100",
            )}
          >
            {t.text}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
