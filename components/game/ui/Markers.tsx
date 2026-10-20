"use client";

import { ACTIONS, ITEMS } from "@/lib/catalog";
import type { HouseholdView } from "@/lib/types";
import { AnchoredLabel } from "../three/anchors";
import { ROLE_EMOJI, cityPlacement, type Landmark } from "../three/City";

function MarkerButton({
  emoji,
  label,
  sub,
  dot,
  highlight,
  onClick,
}: {
  emoji: string;
  label: string;
  sub?: string;
  dot?: string;
  highlight?: boolean;
  onClick: () => void;
}) {
  return (
    <button onClick={onClick} className="pointer-events-auto flex cursor-pointer flex-col items-center gap-1" style={{ WebkitTapHighlightColor: "transparent" }}>
      <span className={`relative flex size-14 items-center justify-center rounded-full text-3xl shadow-lg ${highlight ? "bg-amber-300 ring-4 ring-amber-400" : "bg-white"}`}>
        {emoji}
        {dot && <span className="absolute top-0.5 right-0.5 size-3.5 rounded-full border-2 border-white" style={{ background: dot }} />}
      </span>
      <span className="max-w-40 truncate rounded-full bg-slate-900/85 px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap text-white">{label}</span>
      {sub && <span className="rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-medium whitespace-nowrap text-slate-700">{sub}</span>}
    </button>
  );
}

/** Tappable markers over the 3D city map. */
export function CityMarkers({
  households,
  myHouseholdId,
  now,
  listingsCount,
  onHouse,
  onLandmark,
}: {
  households: HouseholdView[];
  myHouseholdId?: string | null;
  now: number;
  listingsCount: number;
  onHouse: (h: HouseholdView) => void;
  onLandmark: (l: Landmark) => void;
}) {
  const placed = cityPlacement(households);
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <AnchoredLabel id="lm:market">
        <MarkerButton emoji="🛒" label="Market" sub={`${listingsCount} listings`} onClick={() => onLandmark("market")} />
      </AnchoredLabel>
      <AnchoredLabel id="lm:office">
        <MarkerButton emoji="🏢" label="Office · Jobs" sub="Work a shift" onClick={() => onLandmark("office")} />
      </AnchoredLabel>
      <AnchoredLabel id="lm:park">
        <MarkerButton emoji="🌳" label="Park" sub="Meet neighbors" onClick={() => onLandmark("park")} />
      </AnchoredLabel>
      {placed.map(({ h }) => {
        const mine = h.id === myHouseholdId;
        const active = h.kind === "npc" || now - h.lastActive < 60_000;
        const recent = h.kind === "player" && now - h.lastActive < 15 * 60_000;
        return (
          <AnchoredLabel key={h.id} id={`hh:${h.id}`}>
            <MarkerButton
              emoji={mine ? "⭐" : h.kind === "npc" && h.role ? ROLE_EMOJI[h.role] : "🏠"}
              label={h.name}
              sub={h.kind === "npc" ? "NPC agent" : mine ? "Your home" : active ? "online" : recent ? "recently active" : "away"}
              dot={h.kind === "npc" ? "#8b5cf6" : active ? "#22c55e" : recent ? "#f59e0b" : "#cbd5e1"}
              highlight={mine}
              onClick={() => onHouse(h)}
            />
          </AnchoredLabel>
        );
      })}
    </div>
  );
}

/** Activity bubbles over characters in a room. */
export function CharacterBubbles({ household, now }: { household: HouseholdView; now: number }) {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {household.characters.map((c) => {
        const busy = c.busy && c.busy.until > now ? c.busy : null;
        const emoji = busy ? (busy.itemId ? ITEMS[busy.itemId]?.emoji : ACTIONS[busy.action]?.emoji) : null;
        return (
          <AnchoredLabel key={c.id} id={`char:${c.id}`}>
            {emoji ? (
              <div className="flex items-center gap-1 rounded-full bg-white/95 px-2 py-0.5 text-lg shadow">
                {emoji}
                <span className="text-[11px] font-semibold text-slate-600">{Math.ceil((busy!.until - now) / 1000)}s</span>
              </div>
            ) : (
              <div className="rounded-full bg-slate-900/70 px-2 py-0.5 text-[11px] font-semibold text-white">{c.name}</div>
            )}
          </AnchoredLabel>
        );
      })}
    </div>
  );
}
