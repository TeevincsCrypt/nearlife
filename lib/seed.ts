import { deriveImplicitAccount } from "./accounts";
import { CURRENCY, ITEMS } from "./catalog";
import { mt_mint } from "./nep245";
import { FLOOR_COLORS, WALL_COLORS, npcLayout } from "./layout";
import { randomLook } from "./looks";
import type { Character, CharacterLook, GameState, Household, NpcRole, PlacedFurniture } from "./types";

export { CLOTHES, HAIR_COLORS, HAIR_STYLES, SKIN_TONES, randomLook } from "./looks";

/** Mint one NEP-245 furniture token per placed piece so the layout is backed by real balances. */
export function mintLayout(state: GameState, accountId: string, layout: PlacedFurniture[]) {
  const counts: Record<string, number> = {};
  for (const p of layout) counts[p.itemId] = (counts[p.itemId] ?? 0) + 1;
  for (const [itemId, qty] of Object.entries(counts)) mt_mint(state, accountId, itemId, qty, "home-furniture");
}

interface NpcSeed {
  id: string;
  name: string;
  role: NpcRole;
  color: string;
  balance: number;
  stock?: Record<string, number>;
  members: Array<[string, string]>;
}

export const NPC_SEEDS: NpcSeed[] = [
  {
    id: "npc-okafor",
    name: "The Okafors",
    role: "chef",
    color: "#f97316",
    balance: 120,
    stock: { meal: 2 },
    members: [["Ada", "👩🏾‍🍳"], ["Tunde", "👨🏾"]],
  },
  {
    id: "npc-lumen",
    name: "Café Lumen",
    role: "barista",
    color: "#a16207",
    balance: 90,
    stock: { espresso: 3 },
    members: [["Mira", "👩🏻‍🦰"]],
  },
  {
    id: "npc-rivera",
    name: "The Riveras",
    role: "host",
    color: "#db2777",
    balance: 100,
    stock: { party_invite: 2 },
    members: [["Luis", "🧔🏽"], ["Carmen", "💃🏽"], ["Sofi", "👧🏽"]],
  },
  {
    id: "npc-petrov",
    name: "The Petrovs",
    role: "artisan",
    color: "#0891b2",
    balance: 150,
    stock: { armchair: 1, spa_session: 2 },
    members: [["Ivan", "👨🏼‍🔧"], ["Nadia", "👩🏼"]],
  },
  {
    id: "npc-nakamura",
    name: "The Nakamuras",
    role: "commuter",
    color: "#7c3aed",
    balance: 220,
    members: [["Ken", "👨🏻‍💼"], ["Yui", "👩🏻‍💼"], ["Hana", "🧒🏻"]],
  },
];

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
    lastNpcTick: now,
    tickCount: 0,
    households: {},
    listings: {},
    balances: {},
    activity: [],
    nep245Log: [],
    nep245Seq: 0,
    worldEvent: { id: "calm", startedAt: now, endsAt: now + 2 * 60_000 },
    settlements: [],
    players: {},
    stats: { trades: 0, volume: 0, npcBuysFromPlayers: 0, playerBuysFromNpcs: 0, playerToPlayer: 0 },
  };

  for (const seed of NPC_SEEDS) {
    const account = deriveImplicitAccount(`npc:${seed.id}`);
    const hh: Household = {
      id: seed.id,
      name: seed.name,
      kind: "npc",
      accountId: account.accountId,
      accountSource: "derived",
      ownerIds: [],
      ownerNames: [],
      role: seed.role,
      color: seed.color,
      // NPCs start a bit needy so the market moves right away.
      characters: seed.members.map(([n, a], i) => newCharacter(`${seed.id}-${i}`, n, a, [30, 80])),
      createdAt: now,
      lastActive: now,
      priceMemory: {},
      layout: npcLayout(seed.role),
      wallColor: WALL_COLORS[NPC_SEEDS.indexOf(seed) % WALL_COLORS.length],
      floorColor: FLOOR_COLORS[NPC_SEEDS.indexOf(seed) % FLOOR_COLORS.length],
    };
    state.households[hh.id] = hh;
    mt_mint(state, hh.accountId, CURRENCY, seed.balance, "genesis");
    mintLayout(state, hh.accountId, hh.layout);
    for (const [itemId, qty] of Object.entries(seed.stock ?? {})) {
      mt_mint(state, hh.accountId, itemId, qty, "genesis");
    }
  }

  state.activity.push({
    id: "genesis",
    ts: now,
    type: "system",
    emoji: "🏡",
    text: `The neighborhood wakes up: ${NPC_SEEDS.length} autonomous NPC households move in with their own NEAR accounts. Items: ${Object.values(
      ITEMS,
    )
      .filter((i) => i.kind !== "currency")
      .map((i) => i.emoji)
      .join(" ")}`,
  });

  return state;
}
