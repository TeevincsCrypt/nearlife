/** Home layout helpers shared by the server (validation) and the 3D client (placement preview). */
import { ITEMS, ROOM_SIZE, type FurnitureTag } from "./catalog";
import type { NpcRole, PlacedFurniture } from "./types";

export function footprint(itemId: string, rot: number): [number, number] {
  const size = ITEMS[itemId]?.furniture?.size ?? [1, 1];
  return rot % 2 === 0 ? [size[0], size[1]] : [size[1], size[0]];
}

export function cellsOf(p: { itemId: string; x: number; z: number; rot: number }) {
  const [w, d] = footprint(p.itemId, p.rot);
  const cells: Array<[number, number]> = [];
  for (let i = 0; i < w; i++) for (let j = 0; j < d; j++) cells.push([p.x + i, p.z + j]);
  return cells;
}

export function canPlace(layout: PlacedFurniture[], itemId: string, x: number, z: number, rot: number, ignoreUid?: string) {
  if (!ITEMS[itemId]?.furniture) return false;
  const cells = cellsOf({ itemId, x, z, rot });
  if (cells.some(([cx, cz]) => cx < 0 || cz < 0 || cx >= ROOM_SIZE || cz >= ROOM_SIZE)) return false;
  const taken = new Set<string>();
  for (const p of layout) if (p.uid !== ignoreUid) for (const [cx, cz] of cellsOf(p)) taken.add(`${cx},${cz}`);
  return cells.every(([cx, cz]) => !taken.has(`${cx},${cz}`));
}

export function findFreeSpot(layout: PlacedFurniture[], itemId: string): { x: number; z: number; rot: number } | null {
  for (let z = 0; z < ROOM_SIZE; z++)
    for (let x = 0; x < ROOM_SIZE; x++)
      for (const rot of [0, 1]) if (canPlace(layout, itemId, x, z, rot)) return { x, z, rot };
  return null;
}

export function placedCount(layout: PlacedFurniture[], itemId: string) {
  return layout.filter((p) => p.itemId === itemId).length;
}

/** Placed furniture with a given tag, best bonus first. Powered pieces are skipped during a power cut. */
export function furnitureFor(layout: PlacedFurniture[], tag: FurnitureTag, powerCut = false) {
  return layout
    .filter((p) => {
      const f = ITEMS[p.itemId]?.furniture;
      return f && f.tag === tag && !(powerCut && f.powered);
    })
    .sort((a, b) => (ITEMS[b.itemId].furniture!.bonus ?? 0) - (ITEMS[a.itemId].furniture!.bonus ?? 0));
}

let uidCounter = 0;
export function furnitureUid() {
  uidCounter = (uidCounter + 1) % 1e6;
  return `f_${Date.now().toString(36)}${uidCounter.toString(36)}${Math.random().toString(36).slice(2, 5)}`;
}

function build(entries: Array<[string, number, number, number?]>): PlacedFurniture[] {
  const out: PlacedFurniture[] = [];
  for (const [itemId, x, z, rot = 0] of entries) {
    if (canPlace(out, itemId, x, z, rot)) out.push({ uid: furnitureUid(), itemId, x, z, rot });
  }
  return out;
}

/** A new player's starter flat. */
export function starterLayout() {
  return build([
    ["mattress", 0, 0],
    ["fridge", 3, 0],
    ["stove", 4, 0],
    ["shower", 7, 0],
    ["plastic_chair", 2, 4],
  ]);
}

const BASE: Array<[string, number, number, number?]> = [
  ["fridge", 3, 0],
  ["stove", 4, 0],
  ["shower", 7, 0],
  ["tv", 0, 5],
  ["sofa", 1, 6],
  ["plant", 7, 7],
];

export function npcLayout(role: NpcRole) {
  const extra: Record<NpcRole, Array<[string, number, number, number?]>> = {
    chef: [["mattress", 0, 0], ["dining_table", 3, 3], ["plastic_chair", 5, 3]],
    barista: [["mattress", 0, 0], ["coffee_machine", 5, 0], ["armchair", 4, 4], ["bookshelf", 7, 3]],
    host: [["comfy_bed", 0, 0], ["speaker", 5, 0], ["game_table", 4, 4], ["plastic_chair", 5, 4], ["lamp", 2, 0]],
    artisan: [["mattress", 0, 0], ["workbench", 5, 4], ["spa_table", 2, 3], ["standing_fan", 7, 5]],
    commuter: [["comfy_bed", 0, 0], ["dining_table", 3, 3], ["armchair", 6, 3], ["toilet", 6, 0]],
  };
  return build([...extra[role], ...BASE]);
}

export const WALL_COLORS = ["#d9c27a", "#c7d2fe", "#fbcfe8", "#bbf7d0", "#fde68a", "#e2e8f0"];
export const FLOOR_COLORS = ["#c8a27a", "#b08968", "#d6d3d1", "#a3b18a", "#cbd5e1"];
