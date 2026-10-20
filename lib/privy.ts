/** Client-side Privy helpers. */

export const PRIVY_APP_ID = process.env.NEXT_PUBLIC_PRIVY_APP_ID || "";
export const privyConfigured = Boolean(PRIVY_APP_ID);
export const guestAllowed = !privyConfigured || process.env.NEXT_PUBLIC_ENABLE_GUEST === "true";

interface LinkedAccountLike {
  type?: string;
  chainType?: string;
  address?: string;
}

/** Find the Privy embedded NEAR wallet (an implicit account: hex ed25519 public key). */
export function findNearWallet(user: { linkedAccounts?: unknown[] } | null | undefined): string | null {
  for (const a of (user?.linkedAccounts ?? []) as LinkedAccountLike[]) {
    if (a.type === "wallet" && a.chainType === "near" && a.address) return a.address.toLowerCase();
  }
  return null;
}

interface PrivyUserLike {
  email?: { address?: string } | null;
  google?: { name?: string | null; email?: string } | null;
}

export function privyDisplayName(user: PrivyUserLike | null | undefined) {
  const raw = user?.google?.name || user?.google?.email || user?.email?.address || "Player";
  return raw.includes("@") ? raw.split("@")[0] : raw;
}
