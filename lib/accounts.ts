import { createHash } from "node:crypto";
import { ed25519 } from "@noble/curves/ed25519.js";
import { base58 } from "@scure/base";

const SECRET = process.env.NEARLIFE_ACCOUNT_SECRET || "nearlife-dev-secret-change-me";

/**
 * Deterministic NEAR implicit account (ed25519) derived from a stable label.
 * Used as a fallback when a player has no Privy NEAR wallet.
 * The implicit account id is the hex-encoded public key, exactly as NEAR defines it.
 */
export function deriveImplicitAccount(label: string) {
  const seed = createHash("sha256").update(`${SECRET}:${label}`).digest();
  const pub = ed25519.getPublicKey(seed);
  const accountId = Buffer.from(pub).toString("hex");
  const secretKey = new Uint8Array(64);
  secretKey.set(seed, 0);
  secretKey.set(pub, 32);
  return {
    accountId,
    publicKey: `ed25519:${base58.encode(pub)}`,
    /** near-api-js KeyPairString */
    privateKey: `ed25519:${base58.encode(secretKey)}` as `ed25519:${string}`,
  };
}

export function isImplicitAccount(id: string) {
  return /^[0-9a-f]{64}$/.test(id);
}

export function isValidNearAccountId(id: string) {
  return isImplicitAccount(id) || /^(([a-z\d]+[-_])*[a-z\d]+\.)*([a-z\d]+[-_])*[a-z\d]+$/.test(id);
}
