"use client";

import { useCallback } from "react";
import useSWR from "swr";
import { useAuth } from "@/components/auth-provider";
import { useToast } from "@/components/toaster";
import type { StateSnapshot } from "@/lib/types";

export function useGame() {
  const auth = useAuth();
  const toast = useToast();
  // Load the public world right away; re-key once auth resolves so `me` is filled in.
  const key = ["state", auth.ready ? (auth.userId ?? "anon") : "anon"];

  const { data, error, mutate, isLoading } = useSWR<StateSnapshot>(
    key,
    async () => {
      const res = await fetch("/api/state", { headers: await auth.authHeaders(), cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to load");
      return json.snapshot as StateSnapshot;
    },
    { refreshInterval: 3000, revalidateOnFocus: true, keepPreviousData: true },
  );

  const act = useCallback(
    async <T = unknown>(path: string, body?: unknown, method: "POST" | "DELETE" = "POST"): Promise<T | null> => {
      try {
        const res = await fetch(path, {
          method,
          headers: { "content-type": "application/json", ...(await auth.authHeaders()) },
          body: body === undefined ? undefined : JSON.stringify(body),
        });
        const json = await res.json();
        if (!res.ok) {
          toast(json.error ?? "Something went wrong", "error");
          return null;
        }
        if (json.snapshot) await mutate(json.snapshot as StateSnapshot, { revalidate: false });
        return (json.result ?? true) as T;
      } catch (e) {
        toast((e as Error).message, "error");
        return null;
      }
    },
    [auth, mutate, toast],
  );

  const myHousehold = data?.me?.householdId ? data.households.find((h) => h.id === data.me!.householdId) ?? null : null;

  return { snapshot: data, error, isLoading, act, refresh: mutate, myHousehold };
}
