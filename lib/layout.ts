/** Home layout helpers shared by the server (validation) and the 3D client (placement preview). */
import { ITEMS, ROOM_SIZE, type FurnitureTag } from "./catalog";
import type { PlacedFurniture } from "./types";

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

export const WALL_COLORS = ["#7ec8ff", "#ffcf6e", "#9fe3a1", "#ffaecb", "#c4b0ff", "#8fe3dc"];
export const FLOOR_COLORS = ["#d9a066", "#c58b52", "#e5c49b", "#b9c6dd", "#a9cf8c"];
