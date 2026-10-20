/**
 * NEP-245 multi-token ledger.
 *
 * Every SimBucks payment and every item (meals, services, furniture) moves through
 * these functions. They mirror the NEP-245 method names (mt_transfer, mt_balance_of, ...)
 * and record standard NEP-297 `nep245` events. The game server is the source of truth for
 * fast gameplay; when on-chain settlement is enabled (see lib/near.ts) the same events are
 * replayed against a NEP-245 contract.
 */
import { ITEMS } from "./catalog";
import type { GameState, Nep245Event } from "./types";

export const NEP245_LOG_CAP = 200;

/** Escrow account that holds tokens while they are listed on the market. */
export const ESCROW_ACCOUNT = process.env.NEARLIFE_ESCROW_ACCOUNT || "market.nearlife.testnet";

export class LedgerError extends Error {}

function bal(state: GameState, accountId: string) {
  return (state.balances[accountId] ??= {});
}

function log(state: GameState, event: Nep245Event) {
  state.nep245Seq = (state.nep245Seq ?? 0) + 1;
  state.nep245Log.unshift({ seq: state.nep245Seq, ts: Date.now(), event });
  if (state.nep245Log.length > NEP245_LOG_CAP) state.nep245Log.length = NEP245_LOG_CAP;
  return event;
}

export function mt_balance_of(state: GameState, accountId: string, tokenId: string): number {
  return state.balances[accountId]?.[tokenId] ?? 0;
}

export function mt_batch_balance_of(state: GameState, accountId: string, tokenIds: string[]) {
  return tokenIds.map((t) => String(mt_balance_of(state, accountId, t)));
}

export function mt_supply(state: GameState, tokenId: string): number {
  let total = 0;
  for (const b of Object.values(state.balances)) total += b[tokenId] ?? 0;
  return total;
}

export function mt_metadata(tokenIds: string[]) {
  return tokenIds.map((id) => {
    const item = ITEMS[id];
    return item
      ? {
          base: { id, name: item.name, symbol: id.toUpperCase(), decimals: 0, icon: item.emoji },
          token: { title: item.name, description: item.description, extra: JSON.stringify({ kind: item.kind, effects: item.effects ?? null, furniture: item.furniture ?? null }) },
        }
      : null;
  });
}

export function mt_mint(state: GameState, ownerId: string, tokenId: string, amount: number, memo?: string) {
  if (amount <= 0) return null;
  const b = bal(state, ownerId);
  b[tokenId] = (b[tokenId] ?? 0) + amount;
  return log(state, {
    standard: "nep245",
    version: "1.0.0",
    event: "mt_mint",
    data: [{ owner_id: ownerId, token_ids: [tokenId], amounts: [String(amount)], memo }],
  });
}

export function mt_burn(state: GameState, ownerId: string, tokenId: string, amount: number, memo?: string) {
  if (amount <= 0) return null;
  const b = bal(state, ownerId);
  if ((b[tokenId] ?? 0) < amount) throw new LedgerError(`Not enough ${ITEMS[tokenId]?.name ?? tokenId}`);
  b[tokenId] -= amount;
  return log(state, {
    standard: "nep245",
    version: "1.0.0",
    event: "mt_burn",
    data: [{ owner_id: ownerId, token_ids: [tokenId], amounts: [String(amount)], memo }],
  });
}

export function mt_transfer(
  state: GameState,
  senderId: string,
  receiverId: string,
  tokenId: string,
  amount: number,
  memo?: string,
) {
  if (amount <= 0) throw new LedgerError("Amount must be positive");
  if (senderId === receiverId) throw new LedgerError("Sender and receiver are the same");
  const from = bal(state, senderId);
  if ((from[tokenId] ?? 0) < amount) throw new LedgerError(`Not enough ${ITEMS[tokenId]?.name ?? tokenId}`);
  from[tokenId] -= amount;
  const to = bal(state, receiverId);
  to[tokenId] = (to[tokenId] ?? 0) + amount;
  return log(state, {
    standard: "nep245",
    version: "1.0.0",
    event: "mt_transfer",
    data: [{ old_owner_id: senderId, new_owner_id: receiverId, token_ids: [tokenId], amounts: [String(amount)], memo }],
  });
}

/** Inventory of an account, excluding zero balances. */
export function inventoryOf(state: GameState, accountId: string): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(state.balances[accountId] ?? {})) if (v > 0) out[k] = v;
  return out;
}
