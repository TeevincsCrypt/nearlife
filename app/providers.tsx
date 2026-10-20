"use client";

import { AuthProvider } from "@/components/auth-provider";
import { Toaster } from "@/components/toaster";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <Toaster>{children}</Toaster>
    </AuthProvider>
  );
}
