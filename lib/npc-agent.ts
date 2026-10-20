/**
 * Autonomous NPC households.
 *
 * Each NPC household owns a NEAR account (NEP-245 balances) and runs this loop every tick:
 *   1. A character with low needs first uses an owned item, otherwise buys the cheapest
 *      suitable listing on the public market (players' or other NPCs'), otherwise falls back
 *      to a free/home action.
 *   2. Characters with no urgent needs work when money is low, produce goods for the market
 *      according to the household's role, or buy furniture when they are rich.
 *   3. Unsold NPC listings get cheaper over time; listings that sell out quickly raise the
 *      next price (simple supply/demand).
 */
import { ACTIONS, CRAFTABLE, CURRENCY_SYMBOL, ITEMS, NEED_FALLBACK, NEED_META, ROLE_PRODUCTION } from "./catalog";
import {
  addActivity,
  autoPlace,
  balanceOf,
  currentEvent,
  buyListing,
  createListing,
  GameError,
  logPurchase,
  lowestNeed,
  owns,
  startAction,
  useItem,
} from "./engine";
import { placedCount } from "./layout";
import { LedgerError, mt_balance_of } from "./nep245";
import type { Character, GameState, Household, Listing, NeedKey } from "./types";
import { NEED_KEYS } from "./types";

/** NPCs shop the market for any need below this (higher when they have savings to spend). */
const BUY_THRESHOLD = 55;
const BUY_THRESHOLD_RICH = 72;
/** Below this, an NPC fixes the need at home if nothing suitable is listed. */
const FALLBACK_THRESHOLD = 40;
const LOW_MONEY = 45;
const RICH = 140;
/** NPCs stop taking shifts above this balance and spend instead. */
const COMFORTABLE = 220;
const MAX_ACTIVE_LISTING_QTY = 4;
const REPRICE_AFTER_MS = 90_000;

function priceFor(hh: Household, itemId: string) {
  const mem = (hh.priceMemory ??= {});
  if (!mem[itemId]) {
    const base = ITEMS[itemId].basePrice;
    mem[itemId] = Math.max(1, Math.round(base * (0.9 + Math.random() * 0.3)));
  }
  return mem[itemId];
}

function cheapestFor(state: GameState, buyer: Household, need: NeedKey, budget: number): Listing | null {
  let best: Listing | null = null;
  for (const l of Object.values(state.listings)) {
    if (l.sellerHouseholdId === buyer.id || l.quantity < 1 || l.price > budget) continue;
    const gain = ITEMS[l.itemId]?.effects?.[need] ?? 0;
    if (gain < 15) continue;
    if (!best || l.price < best.price || (l.price === best.price && l.createdAt < best.createdAt)) best = l;
  }
  return best;
}

function ownedItemFor(state: GameState, hh: Household, need: NeedKey): string | null {
  for (const item of Object.values(ITEMS)) {
    if ((item.effects?.[need] ?? 0) >= 15 && mt_balance_of(state, hh.accountId, item.id) > 0) return item.id;
  }
  return null;
}

function tryStart(state: GameState, hh: Household, c: Character, actionId: string, now: number) {
  try {
    startAction(state, hh, c, actionId, now);
    return true;
  } catch (e) {
    if (e instanceof GameError || e instanceof LedgerError) return false;
    throw e;
  }
}

/**
 * Try to fix the character's low needs. Any need under BUY_THRESHOLD is shopped for on the
 * market (lowest need first); only if nothing suitable is listed does the character fall back
 * to a home action for its lowest need.
 */
function satisfyNeeds(state: GameState, hh: Household, c: Character, now: number): boolean {
  const threshold = (balanceOf(state, hh) > RICH ? BUY_THRESHOLD_RICH : BUY_THRESHOLD) + (currentEvent(state).buyBoost ?? 0);
  const low = NEED_KEYS.map((k) => [k, c.needs[k]] as const)
    .filter(([, v]) => v < threshold)
    .sort((a, b) => a[1] - b[1]);
  if (low.length === 0) return false;
  const label = (need: NeedKey, v: number) => `${NEED_META[need].label} ${Math.round(v)}`;

  // 1. Use something we already own.
  for (const [need, value] of low) {
    const owned = ownedItemFor(state, hh, need);
    if (owned) {
      useItem(state, hh, c, owned, now, true);
      c.thought = `${label(need, value)} → used own ${ITEMS[owned].name}`;
      return true;
    }
  }

  // 2. Buy the cheapest suitable listing from the public market.
  for (const [need, value] of low) {
    const listing = cheapestFor(state, hh, need, balanceOf(state, hh));
    if (!listing) continue;
    const price = listing.price;
    const { seller, item } = buyListing(state, hh, listing.id, now);
    useItem(state, hh, c, item.id, now, true);
    c.thought = `${label(need, value)} → bought ${item.name} from ${seller?.name ?? "?"} for ${price} ${CURRENCY_SYMBOL}`;
    logPurchase(state, hh, seller, item.id, price, now, `${c.name} (${hh.name}, NPC) was low on ${NEED_META[need].label.toLowerCase()} and`);
    return true;
  }

  // 3. Nothing on the market: fall back to a home action for the lowest need.
  const [need, value] = low[0];
  if (value >= FALLBACK_THRESHOLD) return false;
  const fallback = NEED_FALLBACK[need];
  if (tryStart(state, hh, c, fallback, now)) {
    c.thought = `${label(need, value)} → nothing affordable on the market, ${ACTIONS[fallback].verb}`;
    return true;
  }
  if (need === "hunger" && tryStart(state, hh, c, "work", now)) {
    c.thought = `${label(need, value)} → can't afford food, going to work`;
    return true;
  }
  return false;
}

function listProduction(state: GameState, hh: Household, now: number) {
  const productIds = new Set(
    (ROLE_PRODUCTION[hh.role ?? "commuter"] ?? []).flatMap((a) => {
      const p = ACTIONS[a].produces;
      return p ? ("itemId" in p ? [p.itemId] : p.random) : [];
    }),
  );
  for (const itemId of productIds) {
    // Never sell furniture the household is using.
    const qty = mt_balance_of(state, hh.accountId, itemId) - placedCount(hh.layout ?? [], itemId);
    if (qty < 1) continue;
    createListing(state, hh, itemId, qty, priceFor(hh, itemId), now);
  }
}

function reprice(state: GameState, hh: Household, now: number) {
  for (const l of Object.values(state.listings)) {
    if (l.sellerHouseholdId !== hh.id) continue;
    const since = Math.max(l.lastSoldAt ?? l.createdAt, l.lastRepricedAt ?? 0);
    if (now - since < REPRICE_AFTER_MS) continue;
    // NPCs never dump below 85% of base price, so players can always undercut them.
    const floor = Math.max(1, Math.round(ITEMS[l.itemId].basePrice * 0.85));
    const next = Math.max(floor, Math.floor(l.price * 0.9));
    l.lastRepricedAt = now;
    if (next < l.price) {
      l.price = next;
      (hh.priceMemory ??= {})[l.itemId] = next;
      addActivity(state, {
        householdId: hh.id,
        householdName: hh.name,
        isNpc: true,
        ts: now,
        type: "price",
        emoji: "📉",
        amount: next,
        text: `${hh.name} cut ${ITEMS[l.itemId].emoji} ${ITEMS[l.itemId].name} to ${next} ${CURRENCY_SYMBOL} (no buyers)`,
      });
    }
  }
}

function idleDecision(state: GameState, hh: Household, c: Character, isFirstIdle: boolean, now: number) {
  const money = balanceOf(state, hh);
  if (money < LOW_MONEY) {
    if (tryStart(state, hh, c, "work", now)) c.thought = `Only ${money} ${CURRENCY_SYMBOL} left → working`;
    return;
  }

  const listedQty = Object.values(state.listings)
    .filter((l) => l.sellerHouseholdId === hh.id)
    .reduce((s, l) => s + l.quantity, 0);
  const production = ROLE_PRODUCTION[hh.role ?? "commuter"];
  if (isFirstIdle && production.length && listedQty < MAX_ACTIVE_LISTING_QTY) {
    const actionId = production[Math.floor(Math.random() * production.length)];
    if (tryStart(state, hh, c, actionId, now)) {
      c.thought = `Market stock low (${listedQty}) → ${ACTIONS[actionId].verb} to sell`;
      return;
    }
  }

  if (money > RICH) {
    const wanted = CRAFTABLE.find((f) => !owns(state, hh, f));
    if (wanted) {
      const listing = Object.values(state.listings)
        .filter((l) => l.itemId === wanted && l.sellerHouseholdId !== hh.id && l.price <= money - 30)
        .sort((a, b) => a.price - b.price)[0];
      if (listing) {
        const { seller, item } = buyListing(state, hh, listing.id, now);
        autoPlace(hh, item.id);
        c.thought = `${money} ${CURRENCY_SYMBOL} saved → bought a ${item.name} for the house`;
        logPurchase(state, hh, seller, item.id, listing.price, now, `${c.name} (${hh.name}, NPC) treated the house and`);
        return;
      }
    }
  }

  const r = Math.random();
  const workChance = money > COMFORTABLE ? 0 : 0.5;
  const actionId = r < workChance ? "work" : r < workChance + (1 - workChance) * 0.45 ? "socialize" : r < 0.92 ? "play" : "rest";
  if (tryStart(state, hh, c, actionId, now)) c.thought = `All good → ${ACTIONS[actionId].verb}`;
}

export function runNpcTick(state: GameState, now: number) {
  for (const hh of Object.values(state.households)) {
    if (hh.kind !== "npc") continue;
    hh.lastActive = now;
    reprice(state, hh, now);
    listProduction(state, hh, now);

    let firstIdle = true;
    // Neediest characters act first so they get first pick of cheap listings.
    const chars = [...hh.characters].sort((a, b) => lowestNeed(a)[1] - lowestNeed(b)[1]);
    for (const c of chars) {
      if (c.busy && c.busy.until > now) continue;
      if (satisfyNeeds(state, hh, c, now)) continue;
      idleDecision(state, hh, c, firstIdle, now);
      firstIdle = false;
    }
  }
}
