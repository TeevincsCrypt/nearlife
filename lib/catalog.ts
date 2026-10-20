import type { NeedKey, Needs, NpcRole } from "./types";

export const CURRENCY = "simbucks";
export const CURRENCY_SYMBOL = "SB";

export type ItemKind = "currency" | "consumable" | "service" | "furniture";

export interface ItemDef {
  id: string;
  name: string;
  emoji: string;
  kind: ItemKind;
  description: string;
  basePrice: number;
  /** Need deltas applied when the item is consumed. */
  effects?: Partial<Needs>;
  /** Furniture: passive bonus to an action. */
  bonus?: { action: string; need: NeedKey; amount: number };
}

export const ITEMS: Record<string, ItemDef> = {
  simbucks: {
    id: "simbucks",
    name: "SimBucks",
    emoji: "🪙",
    kind: "currency",
    description: "Neighborhood currency (NEP-245 fungible token).",
    basePrice: 1,
  },
  meal: {
    id: "meal",
    name: "Cooked Meal",
    emoji: "🍲",
    kind: "consumable",
    description: "Hearty home cooking. Fixes hunger.",
    basePrice: 12,
    effects: { hunger: 55, fun: 5 },
  },
  espresso: {
    id: "espresso",
    name: "Espresso",
    emoji: "☕",
    kind: "consumable",
    description: "A quick energy boost.",
    basePrice: 7,
    effects: { energy: 30, fun: 5 },
  },
  party_invite: {
    id: "party_invite",
    name: "Party Invite",
    emoji: "🎉",
    kind: "service",
    description: "Entry to a house party. Big social boost.",
    basePrice: 14,
    effects: { social: 45, fun: 20 },
  },
  game_night: {
    id: "game_night",
    name: "Game Night",
    emoji: "🎲",
    kind: "service",
    description: "Board games with the neighbors.",
    basePrice: 11,
    effects: { fun: 45, social: 15 },
  },
  spa_session: {
    id: "spa_session",
    name: "Spa Session",
    emoji: "🛁",
    kind: "service",
    description: "A relaxing bath and scrub.",
    basePrice: 10,
    effects: { hygiene: 55, fun: 10 },
  },
  comfy_bed: {
    id: "comfy_bed",
    name: "Comfy Bed",
    emoji: "🛏️",
    kind: "furniture",
    description: "Owned furniture: Rest restores +20 extra energy.",
    basePrice: 45,
    bonus: { action: "rest", need: "energy", amount: 20 },
  },
  arcade: {
    id: "arcade",
    name: "Arcade Cabinet",
    emoji: "🕹️",
    kind: "furniture",
    description: "Owned furniture: Watch TV / play gives +20 extra fun.",
    basePrice: 50,
    bonus: { action: "play", need: "fun", amount: 20 },
  },
};

export const FURNITURE_IDS = Object.values(ITEMS)
  .filter((i) => i.kind === "furniture")
  .map((i) => i.id);

export interface ActionDef {
  id: string;
  label: string;
  emoji: string;
  verb: string;
  durationSec: number;
  /** SimBucks spent up front (ingredients, groceries, materials). */
  cost: number;
  effects: Partial<Needs>;
  /** Base wage paid in SimBucks on completion (scaled by mood). */
  pay?: number;
  produces?: { itemId: string; qty: number } | { random: string[]; qty: number };
  category: "care" | "work" | "produce";
  help: string;
}

export const ACTIONS: Record<string, ActionDef> = {
  work: {
    id: "work",
    label: "Work",
    emoji: "💼",
    verb: "working a shift",
    durationSec: 20,
    cost: 0,
    pay: 24,
    effects: { energy: -15, fun: -10, hygiene: -5 },
    category: "work",
    help: "Earn ~24 SB (less when mood is low).",
  },
  rest: {
    id: "rest",
    label: "Rest",
    emoji: "😴",
    verb: "napping",
    durationSec: 15,
    cost: 0,
    effects: { energy: 40 },
    category: "care",
    help: "+40 energy (+20 with a Comfy Bed).",
  },
  eat_home: {
    id: "eat_home",
    label: "Groceries",
    emoji: "🥪",
    verb: "eating a sandwich",
    durationSec: 8,
    cost: 7,
    effects: { hunger: 30 },
    category: "care",
    help: "Costs 7 SB. +30 hunger. A market meal is better value.",
  },
  shower: {
    id: "shower",
    label: "Shower",
    emoji: "🚿",
    verb: "showering",
    durationSec: 8,
    cost: 0,
    effects: { hygiene: 45 },
    category: "care",
    help: "+45 hygiene.",
  },
  socialize: {
    id: "socialize",
    label: "Chat",
    emoji: "💬",
    verb: "chatting with a neighbor",
    durationSec: 12,
    cost: 0,
    effects: { social: 30, fun: 5 },
    category: "care",
    help: "+30 social. Also cheers up a random neighbor.",
  },
  play: {
    id: "play",
    label: "Watch TV",
    emoji: "📺",
    verb: "watching TV",
    durationSec: 12,
    cost: 0,
    effects: { fun: 25 },
    category: "care",
    help: "+25 fun (+20 with an Arcade Cabinet).",
  },
  cook: {
    id: "cook",
    label: "Cook",
    emoji: "🍳",
    verb: "cooking",
    durationSec: 15,
    cost: 5,
    effects: { energy: -10 },
    produces: { itemId: "meal", qty: 2 },
    category: "produce",
    help: "Costs 5 SB ingredients. Makes 2 Cooked Meals.",
  },
  brew: {
    id: "brew",
    label: "Brew",
    emoji: "☕",
    verb: "brewing coffee",
    durationSec: 10,
    cost: 3,
    effects: { energy: -5 },
    produces: { itemId: "espresso", qty: 3 },
    category: "produce",
    help: "Costs 3 SB beans. Makes 3 Espressos.",
  },
  host_party: {
    id: "host_party",
    label: "Plan Party",
    emoji: "🎉",
    verb: "planning a party",
    durationSec: 15,
    cost: 8,
    effects: { energy: -10, social: 10 },
    produces: { itemId: "party_invite", qty: 3 },
    category: "produce",
    help: "Costs 8 SB snacks. Makes 3 Party Invites (a service).",
  },
  game_night: {
    id: "game_night",
    label: "Game Night",
    emoji: "🎲",
    verb: "setting up game night",
    durationSec: 12,
    cost: 4,
    effects: { energy: -8, fun: 5 },
    produces: { itemId: "game_night", qty: 2 },
    category: "produce",
    help: "Costs 4 SB. Makes 2 Game Night seats (a service).",
  },
  run_spa: {
    id: "run_spa",
    label: "Run Spa",
    emoji: "🛁",
    verb: "preparing spa sessions",
    durationSec: 12,
    cost: 4,
    effects: { energy: -8 },
    produces: { itemId: "spa_session", qty: 2 },
    category: "produce",
    help: "Costs 4 SB. Makes 2 Spa Sessions (a service).",
  },
  craft: {
    id: "craft",
    label: "Craft",
    emoji: "🔨",
    verb: "building furniture",
    durationSec: 25,
    cost: 15,
    effects: { energy: -20 },
    produces: { random: FURNITURE_IDS, qty: 1 },
    category: "produce",
    help: "Costs 15 SB lumber. Makes 1 piece of furniture.",
  },
};

/** Default fallback action to fix a need without the market. */
export const NEED_FALLBACK: Record<NeedKey, string> = {
  hunger: "eat_home",
  energy: "rest",
  social: "socialize",
  fun: "play",
  hygiene: "shower",
};

export const NEED_META: Record<NeedKey, { label: string; emoji: string }> = {
  hunger: { label: "Hunger", emoji: "🍽️" },
  energy: { label: "Energy", emoji: "⚡" },
  social: { label: "Social", emoji: "🗣️" },
  fun: { label: "Fun", emoji: "🎈" },
  hygiene: { label: "Hygiene", emoji: "🧼" },
};

/** Points lost per real-time minute. */
export const DECAY_PER_MIN: Needs = {
  hunger: 7,
  energy: 5,
  social: 5,
  fun: 6,
  hygiene: 4,
};

export const ROLE_PRODUCTION: Record<NpcRole, string[]> = {
  chef: ["cook"],
  barista: ["brew"],
  host: ["host_party", "game_night"],
  artisan: ["craft", "run_spa"],
  commuter: [],
};

export const ROLE_LABEL: Record<NpcRole, string> = {
  chef: "Cooks & sells meals",
  barista: "Brews & sells espresso",
  host: "Sells party & game-night seats",
  artisan: "Crafts furniture, runs a spa",
  commuter: "Office workers, buy everything",
};

export function itemsForNeed(need: NeedKey): ItemDef[] {
  return Object.values(ITEMS).filter((i) => (i.effects?.[need] ?? 0) > 0);
}
