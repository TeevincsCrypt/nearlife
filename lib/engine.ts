/**
 * Core simulation: needs decay, actions, inventory use, market listings and purchases.
 * All functions mutate a GameState in place and are called inside mutateState().
 */
import { ACTIONS, CURRENCY, CURRENCY_SYMBOL, DECAY_PER_MIN, ITEMS } from "./catalog";
import { ESCROW_ACCOUNT, LedgerError, inventoryOf, mt_balance_of, mt_burn, mt_mint, mt_transfer } from "./nep245";
import { runNpcTick } from "./npc-agent";
import type { ActivityEvent, Character, GameState, Household, HouseholdView, Listing, NeedKey, Needs, StateSnapshot } from "./types";
import { NEED_KEYS } from "./types";

export const NPC_TICK_MS = Number(process.env.NPC_TICK_MS || 10_000);
const MAX_CATCHUP_MS = 10 * 60_000;
/** Player households stop decaying when nobody has looked at them for a while. */
const PLAYER_IDLE_FREEZE_MS = 15 * 60_000;
const ACTIVITY_CAP = 150;
export const MAX_LISTING_PRICE = 500;

export class GameError extends Error {}

export function uid(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

export const clamp = (v: number) => Math.max(0, Math.min(100, v));

export function moodOf(c: Character) {
  return Math.round(NEED_KEYS.reduce((s, k) => s + c.needs[k], 0) / NEED_KEYS.length);
}

export function lowestNeed(c: Character): [NeedKey, number] {
  let best: NeedKey = "hunger";
  for (const k of NEED_KEYS) if (c.needs[k] < c.needs[best]) best = k;
  return [best, c.needs[best]];
}

export function applyEffects(c: Character, effects: Partial<Needs>) {
  for (const k of NEED_KEYS) if (effects[k]) c.needs[k] = clamp(c.needs[k] + effects[k]!);
}

export function addActivity(state: GameState, ev: Omit<ActivityEvent, "id" | "ts"> & { ts?: number }) {
  const full: ActivityEvent = { id: uid("ev"), ts: ev.ts ?? Date.now(), ...ev };
  state.activity.unshift(full);
  if (state.activity.length > ACTIVITY_CAP) state.activity.length = ACTIVITY_CAP;
  return full;
}

export function getHousehold(state: GameState, id: string) {
  const hh = state.households[id];
  if (!hh) throw new GameError("Household not found");
  return hh;
}

export function getCharacter(hh: Household, characterId: string) {
  const c = hh.characters.find((x) => x.id === characterId);
  if (!c) throw new GameError("Character not found");
  return c;
}

export function balanceOf(state: GameState, hh: Household) {
  return mt_balance_of(state, hh.accountId, CURRENCY);
}

export function owns(state: GameState, hh: Household, itemId: string) {
  return mt_balance_of(state, hh.accountId, itemId) > 0;
}

function who(hh: Household) {
  return { householdId: hh.id, householdName: hh.name, isNpc: hh.kind === "npc" };
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

export function startAction(state: GameState, hh: Household, c: Character, actionId: string, now: number) {
  const action = ACTIONS[actionId];
  if (!action) throw new GameError("Unknown action");
  if (c.busy && c.busy.until > now) throw new GameError(`${c.name} is busy ${c.busy.label}`);
  if (action.cost > 0) {
    if (balanceOf(state, hh) < action.cost) throw new GameError(`Need ${action.cost} ${CURRENCY_SYMBOL}`);
    mt_burn(state, hh.accountId, CURRENCY, action.cost, `${action.id}:supplies`);
  }
  c.busy = { action: action.id, label: action.verb, startedAt: now, until: now + action.durationSec * 1000 };
  if (hh.kind === "player") {
    hh.lastActive = now;
    if (action.category !== "care") {
      addActivity(state, {
        ...who(hh),
        ts: now,
        type: "action",
        emoji: action.emoji,
        text: `${c.name} (${hh.name}) started ${action.verb}`,
      });
    }
  }
}

export function completeAction(state: GameState, hh: Household, c: Character, now: number) {
  const busy = c.busy;
  c.busy = null;
  if (!busy) return;
  const action = ACTIONS[busy.action];
  if (!action) return; // item use or unknown: effects were applied at start

  applyEffects(c, action.effects);

  // Furniture bonuses
  for (const item of Object.values(ITEMS)) {
    if (item.bonus && item.bonus.action === action.id && owns(state, hh, item.id)) {
      applyEffects(c, { [item.bonus.need]: item.bonus.amount });
    }
  }

  if (action.pay) {
    const factor = 0.5 + 0.5 * (moodOf(c) / 100);
    const pay = Math.max(5, Math.round(action.pay * factor));
    mt_mint(state, hh.accountId, CURRENCY, pay, `wage:${c.name}`);
    if (hh.kind === "player") {
      addActivity(state, { ...who(hh), ts: now, type: "action", emoji: "💼", amount: pay, text: `${c.name} (${hh.name}) earned ${pay} ${CURRENCY_SYMBOL} at work` });
    }
  }

  if (action.produces) {
    const p = action.produces;
    const itemId = "itemId" in p ? p.itemId : p.random[Math.floor(Math.random() * p.random.length)];
    mt_mint(state, hh.accountId, itemId, p.qty, `${action.id}:${c.name}`);
    const item = ITEMS[itemId];
    if (hh.kind === "player") {
      addActivity(state, {
        ...who(hh),
        ts: now,
        type: "production",
        emoji: item.emoji,
        text: `${c.name} (${hh.name}) made ${p.qty}× ${item.name}`,
      });
    }
  }

  if (action.id === "socialize") {
    const others = Object.values(state.households).filter((h) => h.id !== hh.id && h.characters.length);
    // Prefer chatting across the player/NPC boundary so interactions are visible.
    const pool = others.filter((h) => h.kind !== hh.kind).length && Math.random() < 0.6 ? others.filter((h) => h.kind !== hh.kind) : others;
    const target = pool[Math.floor(Math.random() * pool.length)];
    if (target) {
      const friend = target.characters[Math.floor(Math.random() * target.characters.length)];
      applyEffects(friend, { social: 12 });
      if (hh.kind === "player" || target.kind === "player" || Math.random() < 0.25) {
        addActivity(state, {
          ...who(hh),
          ts: now,
          type: "social",
          emoji: "💬",
          counterpartyHouseholdId: target.id,
          counterpartyIsNpc: target.kind === "npc",
          text: `${c.name} (${hh.name}) chatted with ${friend.name} (${target.name})`,
        });
      }
    }
  }
}

/** Consume an owned consumable/service token on a character. */
export function useItem(state: GameState, hh: Household, c: Character, itemId: string, now: number, silent = false) {
  const item = ITEMS[itemId];
  if (!item || !item.effects) throw new GameError("That item can't be used directly");
  if (c.busy && c.busy.until > now) throw new GameError(`${c.name} is busy ${c.busy.label}`);
  mt_burn(state, hh.accountId, itemId, 1, `use:${c.name}`);
  applyEffects(c, item.effects);
  c.busy = { action: `use:${itemId}`, label: `enjoying ${item.name}`, startedAt: now, until: now + 5000, itemId };
  if (hh.kind === "player") hh.lastActive = now;
  if (!silent && hh.kind === "player") {
    addActivity(state, { ...who(hh), ts: now, type: "action", emoji: item.emoji, text: `${c.name} (${hh.name}) used ${item.name}` });
  }
}

// ---------------------------------------------------------------------------
// Market
// ---------------------------------------------------------------------------

export function createListing(state: GameState, hh: Household, itemId: string, quantity: number, price: number, now: number) {
  const item = ITEMS[itemId];
  if (!item || item.kind === "currency") throw new GameError("Unknown item");
  if (!Number.isInteger(quantity) || quantity < 1) throw new GameError("Quantity must be at least 1");
  if (!Number.isInteger(price) || price < 1 || price > MAX_LISTING_PRICE) throw new GameError(`Price must be 1–${MAX_LISTING_PRICE} ${CURRENCY_SYMBOL}`);
  // Escrow the tokens with the market account until sold or cancelled.
  mt_transfer(state, hh.accountId, ESCROW_ACCOUNT, itemId, quantity, `list:${itemId}`);
  const listing: Listing = {
    id: uid("lst"),
    sellerHouseholdId: hh.id,
    sellerAccountId: hh.accountId,
    itemId,
    price,
    quantity,
    initialQuantity: quantity,
    createdAt: now,
  };
  state.listings[listing.id] = listing;
  if (hh.kind === "player") hh.lastActive = now;
  addActivity(state, {
    ...who(hh),
    ts: now,
    type: "listing",
    emoji: "🏷️",
    amount: price,
    text: `${hh.name} listed ${quantity}× ${item.emoji} ${item.name} at ${price} ${CURRENCY_SYMBOL}`,
  });
  return listing;
}

export function cancelListing(state: GameState, hh: Household, listingId: string, now: number) {
  const l = state.listings[listingId];
  if (!l) throw new GameError("Listing not found");
  if (l.sellerHouseholdId !== hh.id) throw new GameError("Not your listing");
  if (l.quantity > 0) mt_transfer(state, ESCROW_ACCOUNT, hh.accountId, l.itemId, l.quantity, `delist:${l.itemId}`);
  delete state.listings[listingId];
  if (hh.kind === "player") hh.lastActive = now;
}

export function buyListing(state: GameState, buyer: Household, listingId: string, now: number) {
  const l = state.listings[listingId];
  if (!l || l.quantity < 1) throw new GameError("Listing is sold out");
  if (l.sellerHouseholdId === buyer.id) throw new GameError("You can't buy your own listing");
  const seller = state.households[l.sellerHouseholdId];
  const item = ITEMS[l.itemId];
  if (balanceOf(state, buyer) < l.price) throw new GameError(`Not enough ${CURRENCY_SYMBOL} (need ${l.price})`);

  try {
    mt_transfer(state, buyer.accountId, l.sellerAccountId, CURRENCY, l.price, `buy:${l.id}`);
    mt_transfer(state, ESCROW_ACCOUNT, buyer.accountId, l.itemId, 1, `buy:${l.id}`);
  } catch (e) {
    if (e instanceof LedgerError) throw new GameError(e.message);
    throw e;
  }

  l.quantity -= 1;
  l.lastSoldAt = now;
  const soldOutFast = l.quantity === 0 && now - l.createdAt < 60_000;
  if (l.quantity === 0) delete state.listings[l.id];

  state.stats.trades += 1;
  state.stats.volume += l.price;
  const sellerIsNpc = seller?.kind === "npc";
  const buyerIsNpc = buyer.kind === "npc";
  if (buyerIsNpc && seller && !sellerIsNpc) state.stats.npcBuysFromPlayers += 1;
  if (!buyerIsNpc && sellerIsNpc) state.stats.playerBuysFromNpcs += 1;
  if (!buyerIsNpc && seller && !sellerIsNpc) state.stats.playerToPlayer += 1;

  // Seller demand signal for NPC dynamic pricing.
  if (seller && sellerIsNpc && soldOutFast) {
    const mem = (seller.priceMemory ??= {});
    mem[l.itemId] = Math.min(Math.round(item.basePrice * 1.6), Math.ceil(l.price * 1.1));
  }

  if (buyer.kind === "player") buyer.lastActive = now;
  return { listing: l, seller, item };
}

export function logPurchase(
  state: GameState,
  buyer: Household,
  seller: Household | undefined,
  itemId: string,
  price: number,
  now: number,
  detail?: string,
) {
  const item = ITEMS[itemId];
  return addActivity(state, {
    ...who(buyer),
    ts: now,
    type: "purchase",
    emoji: buyer.kind === "npc" ? "🤖" : "🛒",
    amount: price,
    counterpartyHouseholdId: seller?.id,
    counterpartyIsNpc: seller?.kind === "npc",
    text: `${detail ?? buyer.name} bought ${item.emoji} ${item.name} from ${seller?.name ?? "a former neighbor"} for ${price} ${CURRENCY_SYMBOL}`,
  });
}

// ---------------------------------------------------------------------------
// Time
// ---------------------------------------------------------------------------

function decay(c: Character, minutes: number) {
  for (const k of NEED_KEYS) c.needs[k] = clamp(c.needs[k] - DECAY_PER_MIN[k] * minutes);
}

/** Fast-forward NPC needs (used by the manual "NPC tick" button so judges don't have to wait). */
export function fastForwardNpcs(state: GameState, minutes: number, now: number) {
  for (const hh of Object.values(state.households)) {
    if (hh.kind !== "npc") continue;
    for (const c of hh.characters) {
      decay(c, minutes);
      if (c.busy) completeAction(state, hh, c, now);
    }
  }
}

/** Advance the world to `now`: decay needs, finish actions, run NPC agents if due. */
export function advance(state: GameState, now: number, opts: { forceNpcTick?: boolean } = {}) {
  const dt = Math.min(Math.max(0, now - state.lastAdvance), MAX_CATCHUP_MS);
  const minutes = dt / 60_000;
  for (const hh of Object.values(state.households)) {
    const frozen = hh.kind === "player" && now - hh.lastActive > PLAYER_IDLE_FREEZE_MS;
    for (const c of hh.characters) {
      if (!frozen) decay(c, minutes);
      if (c.busy && c.busy.until <= now) completeAction(state, hh, c, now);
    }
  }
  state.lastAdvance = now;

  let ticked = false;
  if (opts.forceNpcTick || now - state.lastNpcTick >= NPC_TICK_MS) {
    npcTick(state, now);
    ticked = true;
  }
  return { ticked };
}

export function npcTick(state: GameState, now: number) {
  runNpcTick(state, now);
  state.lastNpcTick = now;
  state.tickCount += 1;
}

// ---------------------------------------------------------------------------
// Views
// ---------------------------------------------------------------------------

export function householdView(state: GameState, hh: Household): HouseholdView {
  const inventory = inventoryOf(state, hh.accountId);
  const balance = inventory[CURRENCY] ?? 0;
  delete inventory[CURRENCY];
  const moods = hh.characters.map(moodOf);
  return {
    ...hh,
    balance,
    inventory,
    activeListings: Object.values(state.listings).filter((l) => l.sellerHouseholdId === hh.id).length,
    mood: moods.length ? Math.round(moods.reduce((a, b) => a + b, 0) / moods.length) : 0,
  };
}

export function snapshot(
  state: GameState,
  now: number,
  userId: string | null,
  config: StateSnapshot["config"],
): StateSnapshot {
  const households = Object.values(state.households)
    .map((h) => householdView(state, h))
    .sort((a, b) => (a.kind === b.kind ? b.lastActive - a.lastActive : a.kind === "player" ? -1 : 1));
  return {
    now,
    households,
    listings: Object.values(state.listings).sort((a, b) => b.createdAt - a.createdAt),
    activity: state.activity.slice(0, 60),
    stats: { ...state.stats, tickCount: state.tickCount, lastNpcTick: state.lastNpcTick },
    me: userId ? { userId, householdId: state.players[userId] ?? null } : null,
    config,
  };
}
