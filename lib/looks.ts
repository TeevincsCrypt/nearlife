import type { CharacterLook } from "./types";

export const SKIN_TONES = ["#f5d0b5", "#e8b48f", "#c68a62", "#9a6440", "#6b4226", "#4a2c1a"];
export const HAIR_COLORS = ["#1c1917", "#3f2a1d", "#7c4a1e", "#d4a256", "#9ca3af", "#b91c1c"];
export const HAIR_STYLES: CharacterLook["hairStyle"][] = ["short", "long", "afro", "bald", "bun"];
export const CLOTHES = ["#ef4444", "#f59e0b", "#10b981", "#3b82f6", "#8b5cf6", "#ec4899", "#f8fafc", "#1f2937", "#14b8a6", "#eab308"];

const pick = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)];

export function randomLook(): CharacterLook {
  return { skin: pick(SKIN_TONES), hair: pick(HAIR_COLORS), hairStyle: pick(HAIR_STYLES), top: pick(CLOTHES), bottom: pick(["#1f2937", "#1e3a8a", "#57534e", "#0f766e", "#7c2d12"]) };
}

