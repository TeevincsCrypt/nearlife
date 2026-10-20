import { createRemoteJWKSet } from "jose";
import { verifyAccessToken } from "@privy-io/node";

const PRIVY_APP_ID = process.env.NEXT_PUBLIC_PRIVY_APP_ID || "";
const PRIVY_VERIFICATION_KEY = process.env.PRIVY_VERIFICATION_KEY || "";

export const privyEnabled = Boolean(PRIVY_APP_ID);
/** Guest mode lets judges play without a Privy app. On by default when Privy isn't configured. */
export const guestEnabled = !privyEnabled || process.env.NEXT_PUBLIC_ENABLE_GUEST === "true";

let jwks: ReturnType<typeof createRemoteJWKSet> | null = null;

export interface AuthUser {
  userId: string;
  kind: "privy" | "guest";
}

export async function getUser(req: Request): Promise<AuthUser | null> {
  const auth = req.headers.get("authorization");
  if (privyEnabled && auth?.startsWith("Bearer ")) {
    const token = auth.slice(7);
    try {
      jwks ??= createRemoteJWKSet(new URL(`https://auth.privy.io/api/v1/apps/${PRIVY_APP_ID}/jwks.json`));
      const claims = await verifyAccessToken({
        access_token: token,
        app_id: PRIVY_APP_ID,
        verification_key: PRIVY_VERIFICATION_KEY ? PRIVY_VERIFICATION_KEY.replace(/\\n/g, "\n") : jwks,
      });
      return { userId: claims.user_id, kind: "privy" };
    } catch {
      return null;
    }
  }
  const guest = req.headers.get("x-guest-id");
  if (guestEnabled && guest && /^guest_[a-z0-9]{8,40}$/.test(guest)) return { userId: guest, kind: "guest" };
  return null;
}
