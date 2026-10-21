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
      <div className="pointer-events-none fixed top-36 left-1/2 z-[60] flex -translate-x-1/2 flex-col items-center gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cn(
              "toast-in pointer-events-auto max-w-sm rounded-2xl border-[3px] border-[#0d1b5e] px-4 py-2 text-sm font-extrabold text-white shadow-[0_4px_0_#0d1b5e]",
              t.kind === "error" && "bg-gradient-to-b from-[#ff7a8a] to-[#e23d55]",
              t.kind === "success" && "bg-gradient-to-b from-[#5ee89b] to-[#22b866]",
              t.kind === "info" && "bg-gradient-to-b from-[#3d6cf2] to-[#2a4ed0]",
            )}
          >
            {t.text}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
