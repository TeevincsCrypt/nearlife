import { CURRENCY, ITEMS } from "./catalog";
import { mt_mint } from "./nep245";
import { randomLook } from "./looks";
import type { Character, CharacterLook, GameState, PlacedFurniture } from "./types";

export { CLOTHES, HAIR_COLORS, HAIR_STYLES, SKIN_TONES, randomLook } from "./looks";

/** Mint one NEP-245 furniture token per placed piece so the layout is backed by real balances. */
export function mintLayout(state: GameState, accountId: string, layout: PlacedFurniture[]) {
  const counts: Record<string, number> = {};
  for (const p of layout) counts[p.itemId] = (counts[p.itemId] ?? 0) + 1;
  for (const [itemId, qty] of Object.entries(counts)) mt_mint(state, accountId, itemId, qty, "home-furniture");
}

function rand(min: number, max: number) {
  return Math.round(min + Math.random() * (max - min));
}

export function newCharacter(
  id: string,
  name: string,
  avatar: string,
  needsRange: [number, number] = [70, 95],
  look: CharacterLook = randomLook(),
): Character {
  const [lo, hi] = needsRange;
  return {
    id,
    name,
    avatar,
    look,
    needs: {
      hunger: rand(lo, hi),
      energy: rand(lo, hi),
      social: rand(lo, hi),
      fun: rand(lo, hi),
      hygiene: rand(lo, hi),
    },
    busy: null,
  };
}

export function createInitialState(now: number): GameState {
  const state: GameState = {
    version: 1,
    createdAt: now,
    lastAdvance: now,
    households: {},
    listings: {},
    balances: {},
    activity: [],
    nep245Log: [],
    nep245Seq: 0,
    worldEvent: { id: "calm", startedAt: now, endsAt: now + 2 * 60_000 },
    settlements: [],
    players: {},
    stats: { trades: 0, volume: 0 },
  };

  state.activity.push({
    id: "genesis",
    ts: now,
    type: "system",
    emoji: "🏡",
    text: "The neighborhood is open. Move in, furnish your home and trade with your neighbors.",
  });

  return state;
}
