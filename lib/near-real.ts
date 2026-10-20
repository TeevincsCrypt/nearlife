/**
 * "Real mode": transactions signed in the browser by the player's Privy embedded NEAR wallet.
 * The game server never holds player keys. Each call builds a NEAR transaction, asks Privy to
 * sign its SHA-256 hash (ed25519, as NEAR expects), and broadcasts it to NEAR RPC.
 */
import {
  JsonRpcProvider,
  KeyType,
  PublicKey,
  Signature,
  SignedTransaction,
  actions,
  baseDecode,
  createTransaction,
  encodeTransaction,
  parseNearAmount,
} from "near-api-js";

export const REAL_NETWORK = (process.env.NEXT_PUBLIC_REAL_NETWORK === "testnet" ? "testnet" : "mainnet") as "mainnet" | "testnet";
export const REAL_RPC =
  process.env.NEXT_PUBLIC_REAL_RPC_URL || (REAL_NETWORK === "mainnet" ? "https://rpc.mainnet.fastnear.com" : "https://rpc.testnet.fastnear.com");
export const REAL_MODE_ENABLED = process.env.NEXT_PUBLIC_REAL_MODE !== "false";
/** Hard cap on NEAR attached to any single real action. */
export const REAL_MAX_NEAR = Number(process.env.NEXT_PUBLIC_REAL_MAX_NEAR || 1);
export const NEARLIFE_DAO = process.env.NEXT_PUBLIC_NEARLIFE_DAO || "";
export const SOCIAL_CONTRACT = REAL_NETWORK === "mainnet" ? "social.near" : "v1.social08.testnet";
export const EXPLORER = REAL_NETWORK === "mainnet" ? "https://nearblocks.io" : "https://testnet.nearblocks.io";

export const txUrl = (hash: string) => `${EXPLORER}/txns/${hash}`;
export const TGAS = 1_000_000_000_000n;

let provider: JsonRpcProvider | null = null;
export function realProvider() {
  provider ??= new JsonRpcProvider({ url: REAL_RPC });
  return provider;
}

export type SignHash = (hash: `0x${string}`) => Promise<`0x${string}`>;

export interface RealAction {
  kind: "transfer" | "call";
  method?: string;
  args?: object;
  gasTgas?: number;
  /** yoctoNEAR */
  deposit?: bigint;
}

const hexToBytes = (hex: string) => {
  const h = hex.startsWith("0x") ? hex.slice(2) : hex;
  const out = new Uint8Array(h.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(h.slice(i * 2, i * 2 + 2), 16);
  return out;
};
const bytesToHex = (b: Uint8Array) => Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");

/** Implicit account id is the hex ed25519 public key. */
export function implicitPublicKey(accountId: string) {
  return new PublicKey({ keyType: KeyType.ED25519, data: hexToBytes(accountId) });
}

export function nearToYocto(near: number | string) {
  const y = parseNearAmount(String(near) as `${number}`);
  if (!y) throw new Error("Invalid NEAR amount");
  return BigInt(y);
}

export function yoctoToNear(yocto: bigint | string, digits = 4) {
  const v = BigInt(yocto);
  const whole = v / 10n ** 24n;
  const frac = (v % 10n ** 24n).toString().padStart(24, "0").slice(0, digits);
  return `${whole}.${frac}`;
}

export function totalDeposit(list: RealAction[]) {
  return list.reduce((s, a) => s + (a.deposit ?? 0n), 0n);
}

/** Native NEAR balance of an account on the real network, or null if it doesn't exist yet. */
export async function realBalance(accountId: string): Promise<bigint | null> {
  try {
    const v = await realProvider().viewAccount({ accountId });
    return BigInt(String(v.amount));
  } catch (e) {
    if (/does not exist|UNKNOWN_ACCOUNT/i.test(String((e as Error)?.message ?? e))) return null;
    throw e;
  }
}

export async function realView<T>(contractId: string, method: string, args: Record<string, unknown> = {}): Promise<T> {
  return (await realProvider().callFunction({ contractId, method, args })) as T;
}

/**
 * Build, sign (via Privy) and broadcast a transaction. Returns the transaction hash once the
 * transaction is executed (or throws with the chain's error).
 */
export async function signAndSend(signerId: string, signHash: SignHash, receiverId: string, list: RealAction[]) {
  const deposit = totalDeposit(list);
  if (deposit > nearToYocto(REAL_MAX_NEAR) + nearToYocto("0.01")) throw new Error(`Real actions are capped at ${REAL_MAX_NEAR} NEAR`);
  const p = realProvider();
  const publicKey = implicitPublicKey(signerId);
  const key = await p.viewAccessKey({ accountId: signerId, publicKey: publicKey.toString() }).catch(() => {
    throw new Error("Your NEAR account isn't on-chain yet. Send some NEAR to it first (Wallet → Receive).");
  });
  const block = await p.viewBlock({ finality: "final" });
  const nearActions = list.map((a) =>
    a.kind === "transfer" ? actions.transfer(a.deposit ?? 0n) : actions.functionCall(a.method!, a.args ?? {}, BigInt(a.gasTgas ?? 30) * TGAS, a.deposit ?? 0n),
  );
  const tx = createTransaction(signerId, publicKey, receiverId, BigInt(String(key.nonce)) + 1n, nearActions, baseDecode(block.header.hash));
  const bytes = encodeTransaction(tx);
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", bytes as BufferSource));
  const sigHex = await signHash(`0x${bytesToHex(digest)}`);
  const signed = new SignedTransaction({ transaction: tx, signature: new Signature({ keyType: KeyType.ED25519, data: hexToBytes(sigHex) }) });
  const res = await p.sendTransaction(signed);
  const status = res.status as { Failure?: unknown } | string;
  if (typeof status === "object" && status && "Failure" in status) {
    throw new Error(`Transaction failed on-chain: ${JSON.stringify(status.Failure).slice(0, 200)}`);
  }
  return res.transaction_outcome?.id ?? (res.transaction as { hash?: string })?.hash ?? "";
}

// ---------------------------------------------------------------------------
// Real actions offered in the game
// ---------------------------------------------------------------------------

/** NEAR Social post: writes to the player's own key in SocialDB. */
export function socialPostActions(accountId: string, text: string): RealAction[] {
  const main = JSON.stringify({ type: "md", text });
  return [
    {
      kind: "call",
      method: "set",
      args: { data: { [accountId]: { post: { main }, index: { post: JSON.stringify({ key: "main", value: { type: "md" } }) } } } },
      gasTgas: 100,
      // Covers SocialDB storage for the post; unused storage balance stays withdrawable.
      deposit: nearToYocto("0.01"),
    },
  ];
}

export interface DaoProposal {
  id: number;
  proposer: string;
  description: string;
  status: string;
  kind: unknown;
  votes: Record<string, string>;
}

export async function daoProposals(dao: string, limit = 5): Promise<DaoProposal[]> {
  const last = await realView<number>(dao, "get_last_proposal_id");
  const from = Math.max(0, last - limit);
  const list = await realView<DaoProposal[]>(dao, "get_proposals", { from_index: from, limit });
  return list.reverse();
}

export function daoVoteActions(id: number, approve: boolean): RealAction[] {
  return [{ kind: "call", method: "act_proposal", args: { id, action: approve ? "VoteApprove" : "VoteReject" }, gasTgas: 200 }];
}

// ---------------------------------------------------------------------------
// NEAR Intents (1Click API) swaps: NEAR -> another asset
// ---------------------------------------------------------------------------

export const ONECLICK = "https://1click.chaindefuser.com";

export interface IntentsToken {
  assetId: string;
  decimals: number;
  blockchain: string;
  symbol: string;
  price?: number;
}

export async function intentsTokens(): Promise<IntentsToken[]> {
  const r = await fetch(`${ONECLICK}/v0/tokens`);
  if (!r.ok) throw new Error(`1Click tokens: ${r.status}`);
  return r.json();
}

export interface IntentsQuote {
  quote: {
    depositAddress?: string;
    amountIn: string;
    amountInFormatted?: string;
    amountOut: string;
    amountOutFormatted?: string;
    amountOutUsd?: string;
    deadline?: string;
    timeEstimate?: number;
  };
}

/** Quote NEAR (as wNEAR) -> destination asset, delivered to the player's NEAR account. */
export async function intentsQuote(opts: { accountId: string; amountYocto: bigint; destinationAsset: string; dry: boolean }): Promise<IntentsQuote> {
  const body = {
    dry: opts.dry,
    swapType: "EXACT_INPUT",
    slippageTolerance: 100,
    originAsset: "nep141:wrap.near",
    depositType: "ORIGIN_CHAIN",
    destinationAsset: opts.destinationAsset,
    amount: opts.amountYocto.toString(),
    refundTo: opts.accountId,
    refundType: "ORIGIN_CHAIN",
    recipient: opts.accountId,
    recipientType: "DESTINATION_CHAIN",
    deadline: new Date(Date.now() + 10 * 60_000).toISOString(),
    referral: "nearlife",
  };
  const r = await fetch(`${ONECLICK}/v0/quote`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const json = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error((json as { message?: string }).message ?? `1Click quote failed (${r.status})`);
  return json as IntentsQuote;
}

/** Wrap NEAR, register the deposit address on wrap.near, and send it the wNEAR. One transaction to wrap.near. */
export function intentsDepositActions(depositAddress: string, amountYocto: bigint): RealAction[] {
  return [
    { kind: "call", method: "near_deposit", args: {}, gasTgas: 10, deposit: amountYocto },
    { kind: "call", method: "storage_deposit", args: { account_id: depositAddress, registration_only: true }, gasTgas: 10, deposit: nearToYocto("0.00125") },
    { kind: "call", method: "ft_transfer", args: { receiver_id: depositAddress, amount: amountYocto.toString(), memo: "nearlife" }, gasTgas: 20, deposit: 1n },
  ];
}

export async function intentsSubmitDeposit(txHash: string, depositAddress: string) {
  await fetch(`${ONECLICK}/v0/deposit/submit`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ txHash, depositAddress }),
  }).catch(() => undefined);
}

export async function intentsStatus(depositAddress: string): Promise<{ status?: string }> {
  const r = await fetch(`${ONECLICK}/v0/status?depositAddress=${encodeURIComponent(depositAddress)}`);
  return r.ok ? r.json() : {};
}

// ---------------------------------------------------------------------------
// OutLayer (configured via env so the exact job is explicit)
// ---------------------------------------------------------------------------

export const OUTLAYER_CONTRACT = process.env.NEXT_PUBLIC_OUTLAYER_CONTRACT || (REAL_NETWORK === "mainnet" ? "outlayer.near" : "outlayer.testnet");
/** JSON args for request_execution, e.g. {"source":{"GitHub":{"repo":"...","commit":"main"}},"input_data":"..."} */
export const OUTLAYER_ARGS = process.env.NEXT_PUBLIC_OUTLAYER_ARGS || "";
export const OUTLAYER_DEPOSIT_NEAR = process.env.NEXT_PUBLIC_OUTLAYER_DEPOSIT_NEAR || "0.1";

export function outlayerActions(): RealAction[] {
  if (!OUTLAYER_ARGS) throw new Error("OutLayer job not configured (set NEXT_PUBLIC_OUTLAYER_ARGS)");
  return [{ kind: "call", method: "request_execution", args: JSON.parse(OUTLAYER_ARGS), gasTgas: 300, deposit: nearToYocto(OUTLAYER_DEPOSIT_NEAR) }];
}
