import type { NeedKey, Needs } from "./types";

export const CURRENCY = "simbucks";
export const CURRENCY_SYMBOL = "SB";

export type ItemKind = "currency" | "consumable" | "service" | "furniture";

export type FurnitureCategory = "sleep" | "kitchen" | "bath" | "comfort" | "fun" | "work";

/** What a piece of furniture lets characters do (matched by ActionDef.requires). */
export type FurnitureTag = "bed" | "fridge" | "stove" | "coffee" | "shower" | "screen" | "speaker" | "game_table" | "workbench" | "spa" | "decor";

export interface FurnitureSpec {
  category: FurnitureCategory;
  /** Footprint in grid cells (width along x, depth along z) at rotation 0. */
  size: [number, number];
  tag: FurnitureTag;
  /** Catalogue (store) price in SimBucks. */
  storePrice: number;
  stars: number;
  /** Extra need points when the tagged action is done with this piece. */
  bonus?: number;
  /** Model key + main color for the 3D renderer. */
  model: string;
  color: string;
  /** Pose a character takes when using it. */
  pose?: "lie" | "sit" | "stand";
  /** Needs electricity (unusable during a power cut). */
  powered?: boolean;
}

export interface ItemDef {
  id: string;
  name: string;
  emoji: string;
  kind: ItemKind;
  description: string;
  basePrice: number;
  /** Need deltas applied when the item is consumed. */
  effects?: Partial<Needs>;
  /** Furniture details (3D model, footprint, what it enables). */
  furniture?: FurnitureSpec;
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
};

function furniture(
  id: string,
  name: string,
  emoji: string,
  description: string,
  spec: FurnitureSpec,
): ItemDef {
  return { id, name, emoji, kind: "furniture", description, basePrice: Math.round(spec.storePrice * 0.8), furniture: spec };
}

const FURNITURE_LIST: ItemDef[] = [
  // Sleep
  furniture("mattress", "Floor Mattress", "🛏️", "Somewhere to sleep. Enables Sleep.", { category: "sleep", size: [1, 2], tag: "bed", storePrice: 20, stars: 0, model: "mattress", color: "#94a3b8", pose: "lie" }),
  furniture("comfy_bed", "Comfy Bed", "🛌", "Double bed. Sleep restores +20 extra energy.", { category: "sleep", size: [2, 2], tag: "bed", storePrice: 60, stars: 2, bonus: 20, model: "bed", color: "#e07a5f", pose: "lie" }),
  furniture("lamp", "Bedside Lamp", "💡", "Warm light. Decoration.", { category: "sleep", size: [1, 1], tag: "decor", storePrice: 8, stars: 1, model: "lamp", color: "#fbbf24", powered: true }),
  // Kitchen
  furniture("fridge", "Fridge", "🧊", "Keeps groceries. Enables Groceries.", { category: "kitchen", size: [1, 1], tag: "fridge", storePrice: 25, stars: 1, model: "fridge", color: "#e2e8f0" }),
  furniture("stove", "Gas Cooker", "🍳", "Enables Cook (make meals to sell).", { category: "kitchen", size: [1, 1], tag: "stove", storePrice: 18, stars: 1, model: "stove", color: "#334155" }),
  furniture("coffee_machine", "Coffee Machine", "☕", "Enables Brew (make espresso to sell).", { category: "kitchen", size: [1, 1], tag: "coffee", storePrice: 22, stars: 1, model: "coffee", color: "#78350f", powered: true }),
  furniture("dining_table", "Dining Table", "🍽️", "Round table for four. Decoration.", { category: "kitchen", size: [2, 2], tag: "decor", storePrice: 30, stars: 2, model: "dining", color: "#a16207" }),
  // Bath
  furniture("shower", "Shower", "🚿", "Enables Shower.", { category: "bath", size: [1, 1], tag: "shower", storePrice: 25, stars: 1, model: "shower", color: "#7dd3fc", pose: "stand" }),
  furniture("bathtub", "Bathtub", "🛁", "Shower gives +20 extra hygiene.", { category: "bath", size: [1, 2], tag: "shower", storePrice: 55, stars: 2, bonus: 20, model: "bathtub", color: "#f8fafc", pose: "lie" }),
  furniture("toilet", "Toilet", "🚽", "Decoration (and dignity).", { category: "bath", size: [1, 1], tag: "decor", storePrice: 15, stars: 1, model: "toilet", color: "#f8fafc" }),
  furniture("spa_table", "Massage Table", "💆", "Enables Run Spa (sell spa sessions).", { category: "bath", size: [2, 1], tag: "spa", storePrice: 40, stars: 2, model: "spa", color: "#f9a8d4" }),
  // Comfort
  furniture("plastic_chair", "Plastic Chair", "🪑", "Somewhere to sit.", { category: "comfort", size: [1, 1], tag: "decor", storePrice: 5, stars: 0, model: "chair", color: "#dc2626", pose: "sit" }),
  furniture("armchair", "Armchair", "🛋️", "Cosy armchair. Decoration.", { category: "comfort", size: [1, 1], tag: "decor", storePrice: 20, stars: 2, model: "armchair", color: "#d6b85a", pose: "sit" }),
  furniture("sofa", "Sofa", "🛋️", "Two-seater sofa. Decoration.", { category: "comfort", size: [2, 1], tag: "decor", storePrice: 35, stars: 2, model: "sofa", color: "#b9774a", pose: "sit" }),
  furniture("standing_fan", "Standing Fan", "🌀", "Keeps the room cool.", { category: "comfort", size: [1, 1], tag: "decor", storePrice: 12, stars: 1, model: "fan", color: "#e5e7eb", powered: true }),
  furniture("plant", "Potted Plant", "🪴", "A bit of green.", { category: "comfort", size: [1, 1], tag: "decor", storePrice: 8, stars: 1, model: "plant", color: "#16a34a" }),
  // Fun
  furniture("tv", "TV", "📺", "Enables Watch TV.", { category: "fun", size: [1, 1], tag: "screen", storePrice: 30, stars: 1, model: "tv", color: "#111827", powered: true }),
  furniture("arcade", "Arcade Cabinet", "🕹️", "Watch TV / play gives +20 extra fun.", { category: "fun", size: [1, 1], tag: "screen", storePrice: 65, stars: 2, bonus: 20, model: "arcade", color: "#7c3aed", powered: true }),
  furniture("bookshelf", "Bookshelf", "📚", "Decoration.", { category: "fun", size: [1, 1], tag: "decor", storePrice: 20, stars: 1, model: "bookshelf", color: "#92400e" }),
  furniture("speaker", "Party Speaker", "🔊", "Enables Plan Party (sell party invites).", { category: "fun", size: [1, 1], tag: "speaker", storePrice: 30, stars: 1, model: "speaker", color: "#1f2937", powered: true }),
  furniture("game_table", "Card Table", "🎲", "Enables Game Night (sell seats).", { category: "fun", size: [1, 1], tag: "game_table", storePrice: 20, stars: 1, model: "cardtable", color: "#15803d" }),
  // Work
  furniture("workbench", "Workbench", "🔨", "Enables Craft (build furniture to sell).", { category: "work", size: [2, 1], tag: "workbench", storePrice: 35, stars: 1, model: "workbench", color: "#a16207" }),
];

for (const f of FURNITURE_LIST) ITEMS[f.id] = f;

export const FURNITURE_CATEGORIES: Array<{ id: FurnitureCategory; label: string; emoji: string }> = [
  { id: "sleep", label: "Sleep", emoji: "🛏️" },
  { id: "kitchen", label: "Kitchen", emoji: "🍳" },
  { id: "bath", label: "Bath", emoji: "🚿" },
  { id: "comfort", label: "Comfort", emoji: "🛋️" },
  { id: "fun", label: "Fun", emoji: "🎮" },
  { id: "work", label: "Work", emoji: "🔨" },
];

/** Furniture that the Craft action can produce (and players trade on the market). */
export const CRAFTABLE = ["comfy_bed", "arcade", "armchair", "sofa", "bookshelf"];

export const ROOM_SIZE = 8;

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
  /** Furniture tag needed in the home to do this. */
  requires?: FurnitureTag;
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
    requires: "bed",
    label: "Sleep",
    emoji: "😴",
    verb: "napping",
    durationSec: 15,
    cost: 0,
    effects: { energy: 40 },
    category: "care",
    help: "+40 energy. Needs a bed (+20 with a Comfy Bed).",
  },
  eat_home: {
    id: "eat_home",
    requires: "fridge",
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
    requires: "shower",
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
    requires: "screen",
    label: "Watch TV",
    emoji: "📺",
    verb: "watching TV",
    durationSec: 12,
    cost: 0,
    effects: { fun: 25 },
    category: "care",
    help: "+25 fun. Needs a TV (+20 with an Arcade Cabinet).",
  },
  cook: {
    id: "cook",
    requires: "stove",
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
    requires: "coffee",
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
    requires: "speaker",
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
    requires: "game_table",
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
    requires: "spa",
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
    requires: "workbench",
    label: "Craft",
    emoji: "🔨",
    verb: "building furniture",
    durationSec: 25,
    cost: 15,
    effects: { energy: -20 },
    produces: { random: CRAFTABLE, qty: 1 },
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

export function itemsForNeed(need: NeedKey): ItemDef[] {
  return Object.values(ITEMS).filter((i) => (i.effects?.[need] ?? 0) > 0);
}

export interface WorldEventDef {
  id: string;
  title: string;
  emoji: string;
  description: string;
  weight: number;
  /** Need decay multipliers while active. */
  decay?: Partial<Needs>;
  /** Work pay multiplier. */
  workPay?: number;
  /** Powered furniture can't be used. */
  powerCut?: boolean;
}

export const WORLD_EVENTS: WorldEventDef[] = [
  { id: "calm", title: "Quiet day", emoji: "🌤️", description: "Nothing unusual in the neighborhood.", weight: 3 },
  {
    id: "power_cut",
    title: "Power cut",
    emoji: "⚡",
    description: "The grid is down. TVs, arcades, coffee machines and speakers don't work until it's back.",
    weight: 2,
    powerCut: true,
  },
  {
    id: "food_festival",
    title: "Food festival",
    emoji: "🍲",
    description: "Everyone is hungrier than usual (hunger drops 1.6× faster). Meals sell fast.",
    weight: 2,
    decay: { hunger: 1.6 },
  },
  { id: "payday", title: "Payday", emoji: "💰", description: "Work shifts pay 1.5×.", weight: 2, workPay: 1.5 },
  {
    id: "heatwave",
    title: "Heatwave",
    emoji: "🥵",
    description: "Hygiene and energy drop 1.5× faster. Showers and espresso are in demand.",
    weight: 2,
    decay: { hygiene: 1.5, energy: 1.5 },
  },
];

export const WORLD_EVENT_MS = 4 * 60_000;

/** 1 real second = 1 game minute, so a game day lasts 24 real minutes. */
export function gameClock(now: number) {
  const totalMin = Math.floor(now / 1000) + 8 * 60; // offset so a fresh world starts in the morning
  const minuteOfDay = totalMin % (24 * 60);
  const day = Math.floor(totalMin / (24 * 60)) % 7;
  return { hour: Math.floor(minuteOfDay / 60), minute: minuteOfDay % 60, minuteOfDay, day };
}
