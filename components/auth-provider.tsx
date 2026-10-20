"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { PrivyProvider, usePrivy } from "@privy-io/react-auth";
import { useCreateWallet, useSignRawHash } from "@privy-io/react-auth/extended-chains";
import { PRIVY_APP_ID, findNearWallet, guestAllowed, privyConfigured, privyDisplayName } from "@/lib/privy";

export interface AuthState {
  ready: boolean;
  authenticated: boolean;
  method: "privy" | "guest" | null;
  userId: string | null;
  displayName: string;
  /** Privy embedded NEAR wallet address, when available. */
  nearAddress: string | null;
  privyAvailable: boolean;
  guestAvailable: boolean;
  login: () => void;
  loginAsGuest: (name: string) => void;
  logout: () => Promise<void>;
  authHeaders: () => Promise<Record<string, string>>;
  /** Signs a 32-byte hash with the Privy NEAR wallet (ed25519). Only set when real mode is possible. */
  signNearHash: ((hash: `0x${string}`) => Promise<`0x${string}`>) | null;
}

const AuthContext = createContext<AuthState | null>(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}

const GUEST_KEY = "nearlife:guest";

function useGuest() {
  const [guest, setGuest] = useState<{ id: string; name: string } | null>(null);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(GUEST_KEY);
      if (raw) setGuest(JSON.parse(raw));
    } catch {}
    setLoaded(true);
  }, []);
  const login = useCallback((name: string) => {
    const g = { id: `guest_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`, name: name.trim().slice(0, 24) || "Guest" };
    try {
      localStorage.setItem(GUEST_KEY, JSON.stringify(g));
    } catch {}
    setGuest(g);
  }, []);
  const logout = useCallback(() => {
    try {
      localStorage.removeItem(GUEST_KEY);
    } catch {}
    setGuest(null);
  }, []);
  return { guest: guestAllowed ? guest : null, loaded, login, logout };
}

function GuestOnlyBridge({ children }: { children: React.ReactNode }) {
  const g = useGuest();
  const value = useMemo<AuthState>(
    () => ({
      ready: g.loaded,
      authenticated: Boolean(g.guest),
      method: g.guest ? "guest" : null,
      userId: g.guest?.id ?? null,
      displayName: g.guest?.name ?? "",
      nearAddress: null,
      privyAvailable: false,
      guestAvailable: true,
      login: () => {},
      loginAsGuest: g.login,
      logout: async () => g.logout(),
      authHeaders: async (): Promise<Record<string, string>> => (g.guest ? { "x-guest-id": g.guest.id } : {}),
      signNearHash: null,
    }),
    [g],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

function PrivyBridge({ children }: { children: React.ReactNode }) {
  const { ready, authenticated, user, login, logout, getAccessToken } = usePrivy();
  const { createWallet } = useCreateWallet();
  const { signRawHash } = useSignRawHash();
  const g = useGuest();
  const [nearAddress, setNearAddress] = useState<string | null>(null);
  const creating = useRef(false);

  // Silently create a Privy embedded NEAR wallet the first time a user signs in.
  useEffect(() => {
    if (!ready || !authenticated || !user) return;
    const existing = findNearWallet(user);
    if (existing) {
      setNearAddress(existing);
      return;
    }
    if (creating.current) return;
    creating.current = true;
    createWallet({ chainType: "near" })
      .then(({ wallet }) => setNearAddress((wallet as { address?: string }).address?.toLowerCase() ?? null))
      .catch((e) => console.warn("Privy NEAR wallet creation failed; server will derive an implicit account", e));
  }, [ready, authenticated, user, createWallet]);

  const value = useMemo<AuthState>(() => {
    const privyActive = ready && authenticated && Boolean(user);
    const guestActive = !privyActive && Boolean(g.guest);
    return {
      ready: ready && g.loaded,
      authenticated: privyActive || guestActive,
      method: privyActive ? "privy" : guestActive ? "guest" : null,
      userId: privyActive ? user!.id : guestActive ? g.guest!.id : null,
      displayName: privyActive ? privyDisplayName(user) : (g.guest?.name ?? ""),
      nearAddress: privyActive ? nearAddress : null,
      privyAvailable: true,
      guestAvailable: guestAllowed,
      login: () => login({ loginMethods: ["email", "google"] }),
      loginAsGuest: g.login,
      logout: async () => {
        if (privyActive) await logout();
        g.logout();
      },
      authHeaders: async (): Promise<Record<string, string>> => {
        if (privyActive) {
          const token = await getAccessToken();
          return token ? { authorization: `Bearer ${token}` } : {};
        }
        return g.guest ? { "x-guest-id": g.guest.id } : {};
      },
      signNearHash:
        privyActive && nearAddress
          ? async (hash: `0x${string}`) => (await signRawHash({ address: nearAddress, chainType: "near", hash })).signature
          : null,
    };
  }, [ready, authenticated, user, login, logout, getAccessToken, g, nearAddress, signRawHash]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  if (!privyConfigured) return <GuestOnlyBridge>{children}</GuestOnlyBridge>;
  return (
    <PrivyProvider
      appId={PRIVY_APP_ID}
      config={{
        loginMethods: ["email", "google"],
        appearance: { theme: "light", accentColor: "#16a34a", landingHeader: "Move in to NEARLIFE", showWalletLoginFirst: false },
        embeddedWallets: { ethereum: { createOnLogin: "off" }, solana: { createOnLogin: "off" } },
      }}
    >
      <PrivyBridge>{children}</PrivyBridge>
    </PrivyProvider>
  );
}
