/**
 * Core simulation: needs decay, actions, inventory use, market listings and purchases.
 * All functions mutate a GameState in place and are called inside mutateState().
 */
import { ACTIONS, CURRENCY, CURRENCY_SYMBOL, DECAY_PER_MIN, ITEMS, WORLD_EVENTS, WORLD_EVENT_MS, type WorldEventDef } from "./catalog";
import { FLOOR_COLORS, WALL_COLORS, canPlace, furnitureFor, furnitureUid, placedCount, starterLayout } from "./layout";
import { BURROW_LOAN, BURROW_REPAY, PLACE_BY_ID, TRAVEL, parsePlaceAction, placeActionId, travelActionId, whereIs, type TravelMode } from "./places";
import { TOWN, cleanChatText, dmChannel, dmMembers, placeChannel } from "./chat";
import { ESCROW_ACCOUNT, LedgerError, inventoryOf, mt_balance_of, mt_burn, mt_mint, mt_transfer } from "./nep245";
import type { ActivityEvent, Character, ChatMessage, GameState, Household, HouseholdView, Listing, NeedKey, Needs, StateSnapshot } from "./types";
import { NEED_KEYS } from "./types";

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
  return { householdId: hh.id, householdName: hh.name };
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

export function currentEvent(state: GameState): WorldEventDef {
  return WORLD_EVENTS.find((e) => e.id === state.worldEvent?.id) ?? WORLD_EVENTS[0];
}

export function startAction(state: GameState, hh: Household, c: Character, actionId: string, now: number, furnitureUidHint?: string) {
  const action = ACTIONS[actionId];
  if (!action) throw new GameError("Unknown action");
  if (c.busy && c.busy.until > now) throw new GameError(`${c.name} is busy ${c.busy.label}`);
  // Doing anything at home (or going to work) brings the Sim back from wherever they were.
  c.location = null;
  let at: string | undefined;
  if (action.requires) {
    const ev = currentEvent(state);
    const options = furnitureFor(hh.layout ?? [], action.requires, ev.powerCut);
    if (!options.length) {
      const anyUnpowered = furnitureFor(hh.layout ?? [], action.requires, false).length > 0;
      throw new GameError(anyUnpowered ? `${ev.emoji} ${ev.title}: no electricity for that right now` : `You need furniture for that (buy it in Buy mode)`);
    }
    at = (options.find((o) => o.uid === furnitureUidHint) ?? options[0]).uid;
  }
  if (action.cost > 0) {
    if (balanceOf(state, hh) < action.cost) throw new GameError(`Need ${action.cost} ${CURRENCY_SYMBOL}`);
    mt_burn(state, hh.accountId, CURRENCY, action.cost, `${action.id}:supplies`);
  }
  c.busy = { action: action.id, label: action.verb, startedAt: now, until: now + action.durationSec * 1000, at };
  {
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
  if (busy.action.startsWith("travel:")) {
    // Arrived: the Sim is now at the place and can go inside.
    c.location = busy.place ?? null;
    return;
  }
  const trip = parsePlaceAction(busy.action);
  if (trip) return completePlaceAction(state, hh, c, trip.place.id, trip.action.id, now);
  const action = ACTIONS[busy.action];
  if (!action) return; // item use or unknown: effects were applied at start

  applyEffects(c, action.effects);

  // Furniture bonus (e.g. Comfy Bed, Bathtub, Arcade) applies to the main need of the action.
  const used = busy.at ? (hh.layout ?? []).find((p) => p.uid === busy.at) : undefined;
  const bonus = used ? ITEMS[used.itemId]?.furniture?.bonus : undefined;
  if (bonus) {
    const main = (Object.entries(action.effects).sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0))[0]?.[0] ?? "fun") as NeedKey;
    applyEffects(c, { [main]: bonus });
  }

  if (action.pay) {
    const factor = (0.5 + 0.5 * (moodOf(c) / 100)) * (currentEvent(state).workPay ?? 1);
    const pay = Math.max(5, Math.round(action.pay * factor));
    mt_mint(state, hh.accountId, CURRENCY, pay, `wage:${c.name}`);
    {
      addActivity(state, { ...who(hh), ts: now, type: "action", emoji: "💼", amount: pay, text: `${c.name} (${hh.name}) earned ${pay} ${CURRENCY_SYMBOL} at work` });
    }
  }

  if (action.produces) {
    const p = action.produces;
    const itemId = "itemId" in p ? p.itemId : p.random[Math.floor(Math.random() * p.random.length)];
    mt_mint(state, hh.accountId, itemId, p.qty, `${action.id}:${c.name}`);
    const item = ITEMS[itemId];
    {
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
    // Chat with a Sim from another real player's household, preferring people who are online.
    const others = Object.values(state.households).filter((h) => h.id !== hh.id && h.characters.length);
    const online = others.filter((h) => now - h.lastActive < 5 * 60_000);
    const pool = online.length ? online : others;
    const target = pool[Math.floor(Math.random() * pool.length)];
    if (target) {
      const friend = target.characters[Math.floor(Math.random() * target.characters.length)];
      applyEffects(friend, { social: 12 });
      addActivity(state, {
        ...who(hh),
        ts: now,
        type: "social",
        emoji: "💬",
        counterpartyHouseholdId: target.id,
        text: `${c.name} (${hh.name}) called ${friend.name} (${target.name})`,
      });
    }
  }
}

// ---------------------------------------------------------------------------
// City places (travel by car / train / plane)
// ---------------------------------------------------------------------------

/** "Swap tokens" -> "swap tokens", but keeps "SB", "EVM" etc. intact. */
const lcFirst = (t: string) => t.charAt(0).toLowerCase() + t.slice(1);

export function startPlaceAction(state: GameState, hh: Household, c: Character, placeId: string, actionId: string, mode: TravelMode, now: number) {
  const place = PLACE_BY_ID[placeId];
  const action = place?.actions.find((a) => a.id === actionId);
  // Already at this place: no trip needed.
  const here = c.location === placeId;
  const travel = here ? { ...TRAVEL.car, cost: 0, seconds: 0, effects: {} } : TRAVEL[mode];
  if (!place || !action) throw new GameError("Unknown place");
  if (!travel) throw new GameError("Pick car, train or plane");
  if (c.busy && c.busy.until > now) throw new GameError(`${c.name} is busy ${c.busy.label}`);
  if (action.special === "borrow" && (hh.debt ?? 0) > 0) throw new GameError(`Repay your Burrow loan (${hh.debt} SB) first`);
  if (action.special === "repay" && !(hh.debt ?? 0)) throw new GameError("You don't owe Burrow anything");
  const upfront = travel.cost + action.cost + (action.special === "repay" ? (hh.debt ?? 0) : 0);
  if (balanceOf(state, hh) < upfront) throw new GameError(`Need ${upfront} ${CURRENCY_SYMBOL} (incl. ${travel.cost} ${CURRENCY_SYMBOL} ${travel.label.toLowerCase()} fare)`);
  if (travel.cost) mt_burn(state, hh.accountId, CURRENCY, travel.cost, `travel:${mode}`);
  if (action.cost) mt_burn(state, hh.accountId, CURRENCY, action.cost, `place:${place.id}:${action.id}`);
  if (action.special === "repay") {
    mt_burn(state, hh.accountId, CURRENCY, hh.debt ?? 0, "burrow:repay");
    hh.debt = 0;
  }
  if (action.special === "borrow") {
    mt_mint(state, hh.accountId, CURRENCY, BURROW_LOAN, "burrow:loan");
    hh.debt = BURROW_REPAY;
  }
  applyEffects(c, travel.effects);
  const arriveAt = now + travel.seconds * 1000;
  c.busy = {
    action: placeActionId(place.id, action.id),
    label: `at ${place.short}: ${lcFirst(action.label)}`,
    startedAt: now,
    arriveAt,
    until: arriveAt + action.durationSec * 1000,
    place: place.id,
    travel: here ? undefined : mode,
  };
  hh.lastActive = now;
  if (here) return;
  addActivity(state, {
    ...who(hh),
    ts: now,
    type: "action",
    emoji: travel.emoji,
    text: `${c.name} (${hh.name}) took the ${travel.label.toLowerCase()} to ${place.name} to ${lcFirst(action.label)}`,
  });
}

/** Take the car, train or plane to a city place. On arrival the Sim is there and can go inside. */
export function travelTo(state: GameState, hh: Household, c: Character, placeId: string, mode: TravelMode, now: number) {
  const place = PLACE_BY_ID[placeId];
  const travel = TRAVEL[mode];
  if (!place) throw new GameError("Unknown place");
  if (!travel) throw new GameError("Pick car, train or plane");
  if (c.busy && c.busy.until > now) throw new GameError(`${c.name} is busy ${c.busy.label}`);
  if (whereIs(c, now).placeId === placeId) throw new GameError(`${c.name} is already at ${place.short}`);
  if (balanceOf(state, hh) < travel.cost) throw new GameError(`Need ${travel.cost} ${CURRENCY_SYMBOL} for the ${travel.label.toLowerCase()}`);
  if (travel.cost) mt_burn(state, hh.accountId, CURRENCY, travel.cost, `travel:${mode}`);
  applyEffects(c, travel.effects);
  const arriveAt = now + travel.seconds * 1000;
  c.location = null;
  c.busy = {
    action: travelActionId(place.id),
    label: `on the way to ${place.short}`,
    startedAt: now,
    arriveAt,
    until: arriveAt,
    place: place.id,
    travel: mode,
  };
  hh.lastActive = now;
  addActivity(state, {
    ...who(hh),
    ts: now,
    type: "action",
    emoji: travel.emoji,
    text: `${c.name} (${hh.name}) took the ${travel.label.toLowerCase()} to ${place.name}`,
  });
}

/** Sims from other households who are at a place right now (not still on the way). */
export function companionsAt(state: GameState, placeId: string, exceptHouseholdId: string, now: number) {
  const out: Array<{ hh: Household; c: Character }> = [];
  for (const hh of Object.values(state.households)) {
    if (hh.id === exceptHouseholdId) continue;
    for (const c of hh.characters) {
      const w = whereIs(c, now);
      if (w.placeId === placeId && !w.arriving) out.push({ hh, c });
    }
  }
  return out;
}

const names = (list: Array<{ c: Character }>) => {
  const n = list.map((x) => x.c.name);
  return n.length <= 1 ? n.join("") : `${n.slice(0, -1).join(", ")} and ${n[n.length - 1]}`;
};

function completePlaceAction(state: GameState, hh: Household, c: Character, placeId: string, actionId: string, now: number) {
  const place = PLACE_BY_ID[placeId];
  const action = place.actions.find((a) => a.id === actionId)!;
  applyEffects(c, action.effects);
  c.location = place.id;
  // Doing things together: every other player here adds a bonus (up to three of them).
  const friends = companionsAt(state, place.id, hh.id, now).slice(0, 3);
  const n = friends.length;
  if (n) applyEffects(c, { social: 8 * n, fun: 4 * n });
  const together = n ? ` with ${names(friends)}` : "";
  if (action.id === "hang") {
    if (n) {
      addActivity(state, { ...who(hh), ts: now, type: "social", emoji: "🥤", text: `${c.name} (${hh.name}) hung out${together} at ${place.name}` });
    }
    return;
  }
  let result = "";
  if (action.payout) {
    const [lo, hi] = action.payout;
    const amount = Math.round((lo + Math.random() * (hi - lo)) * (1 + 0.15 * n));
    if (amount > 0) mt_mint(state, hh.accountId, CURRENCY, amount, `place:${place.id}:${action.id}`);
    const net = amount - action.cost;
    result = action.cost ? ` (${net >= 0 ? "+" : ""}${net} ${CURRENCY_SYMBOL} net)` : ` (+${amount} ${CURRENCY_SYMBOL})`;
  }
  if (action.gives) mt_mint(state, hh.accountId, action.gives.itemId, action.gives.qty, `place:${place.id}`);
  if (action.special === "borrow") result = ` (+${BURROW_LOAN} ${CURRENCY_SYMBOL}, owes ${BURROW_REPAY})`;
  if (action.special === "repay") result = " (loan repaid)";
  addActivity(state, {
    ...who(hh),
    ts: now,
    type: "action",
    emoji: place.emoji,
    text: `${c.name} (${hh.name}) ${action.emoji} ${lcFirst(action.label)}${together} at ${place.name}${result}`,
  });
}

/** Bring a Sim home from a city place. */
export function goHome(hh: Household, c: Character, now: number) {
  if (c.busy && c.busy.until > now) throw new GameError(`${c.name} is busy ${c.busy.label}`);
  c.location = null;
  hh.lastActive = now;
}

/** Send SimBucks to another household (NEP-245 mt_transfer). */
export function sendSimBucks(state: GameState, from: Household, toHouseholdId: string, amount: number, now: number) {
  const to = state.households[toHouseholdId];
  if (!to || to.id === from.id) throw new GameError("Pick a neighbor to send to");
  if (!Number.isInteger(amount) || amount < 1 || amount > 10_000) throw new GameError("Amount must be 1–10,000");
  try {
    mt_transfer(state, from.accountId, to.accountId, CURRENCY, amount, `gift:${from.id}`);
  } catch (e) {
    if (e instanceof LedgerError) throw new GameError(e.message);
    throw e;
  }
  from.lastActive = now;
  addActivity(state, {
    ...who(from),
    ts: now,
    type: "purchase",
    emoji: "💸",
    amount,
    counterpartyHouseholdId: to.id,
    text: `${from.name} sent ${amount} ${CURRENCY_SYMBOL} to ${to.name}`,
  });
}

/** Consume an owned consumable/service token on a character. */
export function useItem(state: GameState, hh: Household, c: Character, itemId: string, now: number, silent = false) {
  const item = ITEMS[itemId];
  if (!item || !item.effects) throw new GameError("That item can't be used directly");
  if (c.busy && c.busy.until > now) throw new GameError(`${c.name} is busy ${c.busy.label}`);
  mt_burn(state, hh.accountId, itemId, 1, `use:${c.name}`);
  c.location = null;
  applyEffects(c, item.effects);
  c.busy = { action: `use:${itemId}`, label: `enjoying ${item.name}`, startedAt: now, until: now + 5000, itemId };
  hh.lastActive = now;
  if (!silent) {
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
  if (item.kind === "furniture") {
    const free = mt_balance_of(state, hh.accountId, itemId) - placedCount(hh.layout ?? [], itemId);
    if (free < quantity) throw new GameError(`Put the ${item.name} in storage first (only ${Math.max(0, free)} not placed)`);
  }
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
  hh.lastActive = now;
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
  hh.lastActive = now;
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
  if (l.quantity === 0) delete state.listings[l.id];

  state.stats.trades += 1;
  state.stats.volume += l.price;
  buyer.lastActive = now;
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
    emoji: "🛒",
    amount: price,
    counterpartyHouseholdId: seller?.id,
    text: `${detail ?? buyer.name} bought ${item.emoji} ${item.name} from ${seller?.name ?? "a former neighbor"} for ${price} ${CURRENCY_SYMBOL}`,
  });
}

// ---------------------------------------------------------------------------
// Home furniture (Buy mode)
// ---------------------------------------------------------------------------

function furnitureItem(itemId: string) {
  const item = ITEMS[itemId];
  if (!item?.furniture) throw new GameError("That isn't furniture");
  return item;
}

/** Buy from the catalogue (SimBucks are burned by the store) and place it. */
export function buyFurniture(state: GameState, hh: Household, itemId: string, x: number, z: number, rot: number, now: number) {
  const item = furnitureItem(itemId);
  const price = item.furniture!.storePrice;
  if (!canPlace(hh.layout, itemId, x, z, rot)) throw new GameError("It doesn't fit there");
  if (balanceOf(state, hh) < price) throw new GameError(`Need ${price} ${CURRENCY_SYMBOL}`);
  mt_burn(state, hh.accountId, CURRENCY, price, `store:${itemId}`);
  mt_mint(state, hh.accountId, itemId, 1, "store-purchase");
  const placed = { uid: furnitureUid(), itemId, x, z, rot };
  hh.layout.push(placed);
  hh.lastActive = now;
  addActivity(state, { ...who(hh), ts: now, type: "action", emoji: item.emoji, amount: price, text: `${hh.name} bought a ${item.name} for their home (${price} ${CURRENCY_SYMBOL})` });
  return placed;
}

/** Place a piece the household owns but hasn't placed (e.g. bought on the market or crafted). */
export function placeOwnedFurniture(state: GameState, hh: Household, itemId: string, x: number, z: number, rot: number, now: number) {
  furnitureItem(itemId);
  if (mt_balance_of(state, hh.accountId, itemId) - placedCount(hh.layout, itemId) < 1) throw new GameError("You don't have one in storage");
  if (!canPlace(hh.layout, itemId, x, z, rot)) throw new GameError("It doesn't fit there");
  const placed = { uid: furnitureUid(), itemId, x, z, rot };
  hh.layout.push(placed);
  hh.lastActive = now;
  return placed;
}

export function moveFurniture(hh: Household, uidToMove: string, x: number, z: number, rot: number, now: number) {
  const p = hh.layout.find((f) => f.uid === uidToMove);
  if (!p) throw new GameError("Furniture not found");
  if (!canPlace(hh.layout, p.itemId, x, z, rot, p.uid)) throw new GameError("It doesn't fit there");
  Object.assign(p, { x, z, rot });
  hh.lastActive = now;
}

function releaseUsers(hh: Household, furnitureUidToFree: string) {
  for (const c of hh.characters) if (c.busy?.at === furnitureUidToFree) c.busy = null;
}

/** Remove from the room; the NEP-245 token stays in the account (can be re-placed or listed). */
export function storeFurniture(hh: Household, uidToStore: string, now: number) {
  const i = hh.layout.findIndex((f) => f.uid === uidToStore);
  if (i < 0) throw new GameError("Furniture not found");
  releaseUsers(hh, uidToStore);
  hh.layout.splice(i, 1);
  hh.lastActive = now;
}

/** Sell a placed piece back to the store for half the catalogue price (token is burned). */
export function sellBackFurniture(state: GameState, hh: Household, uidToSell: string, now: number) {
  const p = hh.layout.find((f) => f.uid === uidToSell);
  if (!p) throw new GameError("Furniture not found");
  const item = furnitureItem(p.itemId);
  const refund = Math.floor(item.furniture!.storePrice / 2);
  storeFurniture(hh, uidToSell, now);
  mt_burn(state, hh.accountId, p.itemId, 1, "store-buyback");
  mt_mint(state, hh.accountId, CURRENCY, refund, "store-buyback");
  return refund;
}

export const TOPUP_AMOUNT = 100;
export const TOPUP_COOLDOWN_MS = 5 * 60_000;

/** Testnet faucet: mint SimBucks to a player household, rate-limited. */
export function topUp(state: GameState, hh: Household, now: number) {
  const wait = (hh.lastTopup ?? 0) + TOPUP_COOLDOWN_MS - now;
  if (wait > 0) throw new GameError(`Faucet refills in ${Math.ceil(wait / 60_000)} min`);
  hh.lastTopup = now;
  mt_mint(state, hh.accountId, CURRENCY, TOPUP_AMOUNT, "testnet-faucet");
  return TOPUP_AMOUNT;
}

// ---------------------------------------------------------------------------
// Chat and meeting other players
// ---------------------------------------------------------------------------

const CHAT_CAP = 400;

function pushChat(state: GameState, msg: Omit<ChatMessage, "id">) {
  state.chat ??= [];
  const full: ChatMessage = { id: uid("msg"), ...msg };
  state.chat.push(full);
  if (state.chat.length > CHAT_CAP) state.chat.splice(0, state.chat.length - CHAT_CAP);
  return full;
}

function rateLimit(state: GameState, hh: Household, now: number) {
  const mine = (state.chat ?? []).filter((m) => m.fromHouseholdId === hh.id && now - m.ts < 10_000);
  if (mine.length && now - mine[mine.length - 1].ts < 700) throw new GameError("Slow down a little");
  if (mine.length >= 8) throw new GameError("Too many messages, take a breath");
}

/** Is one of this household's Sims at the place (arrived)? Returns that Sim. */
function simAt(hh: Household, placeId: string, now: number, preferId?: string) {
  const here = hh.characters.filter((c) => {
    const w = whereIs(c, now);
    return w.placeId === placeId && !w.arriving;
  });
  return here.find((c) => c.id === preferId) ?? here[0];
}

/**
 * Post a chat message. Town chat is open to everyone in town, place chat needs one of your
 * Sims to be there, and direct messages go between two households.
 */
export function postChat(state: GameState, hh: Household, channel: string, rawText: string, now: number, characterId?: string) {
  const text = cleanChatText(rawText);
  if (!text) throw new GameError("Say something first");
  rateLimit(state, hh, now);
  let speaker = hh.characters.find((c) => c.id === characterId) ?? hh.characters[0];
  if (channel === TOWN) {
    // open to everyone
  } else if (channel.startsWith("place:")) {
    const placeId = channel.slice(6);
    if (!PLACE_BY_ID[placeId]) throw new GameError("Unknown place");
    const here = simAt(hh, placeId, now, characterId);
    if (!here) throw new GameError(`Go to ${PLACE_BY_ID[placeId].short} first to talk to people there`);
    speaker = here;
  } else {
    const members = dmMembers(channel);
    if (!members || !members.includes(hh.id)) throw new GameError("Unknown chat");
    const other = members[0] === hh.id ? members[1] : members[0];
    if (!state.households[other] || other === hh.id) throw new GameError("That neighbor moved away");
    channel = dmChannel(hh.id, other);
  }
  hh.lastActive = now;
  return pushChat(state, { ts: now, channel, fromHouseholdId: hh.id, fromCharacterId: speaker?.id, fromName: speaker?.name ?? hh.name, text, kind: "text" });
}

/** Wave at another player's Sim at the same place: a little social boost for both. */
export function waveAt(state: GameState, hh: Household, targetCharacterId: string, now: number, characterId?: string) {
  const target = Object.values(state.households)
    .filter((h) => h.id !== hh.id)
    .flatMap((h) => h.characters.map((c) => ({ h, c })))
    .find((x) => x.c.id === targetCharacterId);
  if (!target) throw new GameError("They're not here any more");
  const placeId = whereIs(target.c, now).placeId;
  if (!placeId) throw new GameError(`${target.c.name} isn't out right now`);
  const me = simAt(hh, placeId, now, characterId);
  if (!me) throw new GameError(`Go to ${PLACE_BY_ID[placeId]?.short ?? "them"} first`);
  rateLimit(state, hh, now);
  applyEffects(me, { social: 6 });
  applyEffects(target.c, { social: 6 });
  hh.lastActive = now;
  return pushChat(state, {
    ts: now,
    channel: placeChannel(placeId),
    fromHouseholdId: hh.id,
    fromCharacterId: me.id,
    fromName: me.name,
    text: `👋 waved at ${target.c.name}`,
    kind: "wave",
  });
}

/** Invite a neighbor to meet at a place (sent as a direct message with a "Go there" button). */
export function inviteTo(state: GameState, hh: Household, toHouseholdId: string, placeId: string, now: number, characterId?: string) {
  const to = state.households[toHouseholdId];
  const place = PLACE_BY_ID[placeId];
  if (!to || to.id === hh.id) throw new GameError("Pick a neighbor to invite");
  if (!place) throw new GameError("Unknown place");
  rateLimit(state, hh, now);
  const speaker = hh.characters.find((c) => c.id === characterId) ?? hh.characters[0];
  hh.lastActive = now;
  return pushChat(state, {
    ts: now,
    channel: dmChannel(hh.id, to.id),
    fromHouseholdId: hh.id,
    fromCharacterId: speaker?.id,
    fromName: speaker?.name ?? hh.name,
    text: `Meet me at ${place.name}? ${place.emoji}`,
    kind: "invite",
    placeId,
  });
}

/** Messages a viewer can see: town chat, place chats, and their own direct messages. */
export function visibleChat(state: GameState, householdId: string | null) {
  const all = state.chat ?? [];
  const town = all.filter((m) => m.channel === TOWN).slice(-80);
  const places = all.filter((m) => m.channel.startsWith("place:")).slice(-100);
  const dms = householdId ? all.filter((m) => dmMembers(m.channel)?.includes(householdId)).slice(-120) : [];
  return [...town, ...places, ...dms].sort((a, b) => a.ts - b.ts);
}

// ---------------------------------------------------------------------------
// Time
// ---------------------------------------------------------------------------

function decay(c: Character, minutes: number, mult: Partial<Needs> = {}) {
  for (const k of NEED_KEYS) c.needs[k] = clamp(c.needs[k] - DECAY_PER_MIN[k] * (mult[k] ?? 1) * minutes);
}

/** Bring older saved worlds up to date (remove the old NPC households, add layouts and events). */
function migrate(state: GameState, now: number) {
  const legacy = state.households as Record<string, Household & { kind?: string }>;
  const npcIds = new Set(Object.values(legacy).filter((h) => h.kind === "npc").map((h) => h.id));
  if (npcIds.size) {
    for (const l of Object.values(state.listings)) {
      if (!npcIds.has(l.sellerHouseholdId)) continue;
      const escrow = state.balances[ESCROW_ACCOUNT];
      if (escrow?.[l.itemId]) escrow[l.itemId] = Math.max(0, escrow[l.itemId] - l.quantity);
      delete state.listings[l.id];
    }
    for (const id of npcIds) {
      delete state.balances[state.households[id].accountId];
      delete state.households[id];
    }
    state.activity = state.activity.filter((a) => !(a.householdId && npcIds.has(a.householdId)) && !(a.counterpartyHouseholdId && npcIds.has(a.counterpartyHouseholdId)));
    state.activity = state.activity.filter((a) => a.id !== "genesis");
  }
  for (const [i, hh] of Object.values(state.households).entries()) {
    // Older worlds used light pastel rooms; move them onto the night-market palette.
    if (!hh.wallColor || !WALL_COLORS.includes(hh.wallColor)) hh.wallColor = WALL_COLORS[i % WALL_COLORS.length];
    if (!hh.floorColor || !FLOOR_COLORS.includes(hh.floorColor)) hh.floorColor = FLOOR_COLORS[i % FLOOR_COLORS.length];
    if (!hh.layout) {
      hh.layout = starterLayout();
      for (const p of hh.layout) mt_mint(state, hh.accountId, p.itemId, 1, "home-furniture");
    }
  }
  if (!state.worldEvent) state.worldEvent = { id: "calm", startedAt: now, endsAt: now + WORLD_EVENT_MS };
  state.chat ??= [];
}

function rotateWorldEvent(state: GameState, now: number) {
  if (state.worldEvent && state.worldEvent.endsAt > now) return;
  const prev = state.worldEvent?.id;
  const pool = WORLD_EVENTS.filter((e) => e.id !== prev);
  let r = Math.random() * pool.reduce((s, e) => s + e.weight, 0);
  let next = pool[0];
  for (const e of pool) {
    r -= e.weight;
    if (r <= 0) {
      next = e;
      break;
    }
  }
  state.worldEvent = { id: next.id, startedAt: now, endsAt: now + WORLD_EVENT_MS };
  addActivity(state, { ts: now, type: "system", emoji: next.emoji, text: `${next.title}: ${next.description}` });
}

/** Advance the world to `now`: decay needs, finish actions, rotate neighborhood events. */
export function advance(state: GameState, now: number) {
  migrate(state, now);
  rotateWorldEvent(state, now);
  const mult = currentEvent(state).decay;
  const dt = Math.min(Math.max(0, now - state.lastAdvance), MAX_CATCHUP_MS);
  const minutes = dt / 60_000;
  for (const hh of Object.values(state.households)) {
    const frozen = now - hh.lastActive > PLAYER_IDLE_FREEZE_MS;
    for (const c of hh.characters) {
      if (!frozen) decay(c, minutes, mult);
      if (c.busy && c.busy.until <= now) completeAction(state, hh, c, now);
    }
  }
  state.lastAdvance = now;
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
    .sort((a, b) => b.lastActive - a.lastActive);
  return {
    now,
    households,
    listings: Object.values(state.listings).sort((a, b) => b.createdAt - a.createdAt),
    activity: state.activity.slice(0, 60),
    stats: { trades: state.stats.trades, volume: state.stats.volume },
    worldEvent: state.worldEvent ?? null,
    me: userId ? { userId, householdId: state.players[userId] ?? null } : null,
    chat: visibleChat(state, userId ? (state.players[userId] ?? null) : null),
    config,
  };
}
