"use client";

import { ACTIONS, ITEMS } from "@/lib/catalog";
import type { HouseholdView } from "@/lib/types";
import { AnchoredLabel } from "../three/anchors";
import { cityPlacement, type Landmark } from "../three/City";

function Pin({
  emoji,
  label,
  sub,
  color,
  dot,
  onClick,
}: {
  emoji: string;
  label: string;
  sub?: string;
  color: string;
  dot?: string;
  onClick: () => void;
}) {
  return (
    <button onClick={onClick} className="pointer-events-auto flex cursor-pointer flex-col items-center" style={{ WebkitTapHighlightColor: "transparent" }}>
      <span className="glass flex items-center gap-2 rounded-2xl py-1.5 pr-3 pl-1.5" style={{ boxShadow: `0 0 0 1px ${color}88, 0 0 18px ${color}55` }}>
        <span className="relative flex size-9 items-center justify-center rounded-xl text-xl" style={{ background: `${color}22` }}>
          {emoji}
          {dot && <span className="absolute -top-0.5 -right-0.5 size-2.5 rounded-full border border-slate-900" style={{ background: dot }} />}
        </span>
        <span className="flex flex-col items-start leading-tight">
          <span className="max-w-36 truncate text-xs font-bold text-white">{label}</span>
          {sub && <span className="text-[10px] text-slate-400">{sub}</span>}
        </span>
      </span>
      <span className="h-3 w-px" style={{ background: color, boxShadow: `0 0 6px ${color}` }} />
    </button>
  );
}

/** Tappable pins over the 3D city map. */
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
        <Pin emoji="🛒" label="Night Market" sub={`${listingsCount} listings`} color="#fbbf24" onClick={() => onLandmark("market")} />
      </AnchoredLabel>
      <AnchoredLabel id="lm:office">
        <Pin emoji="💼" label="Work Hub" sub="Take a shift" color="#22d3ee" onClick={() => onLandmark("office")} />
      </AnchoredLabel>
      <AnchoredLabel id="lm:park">
        <Pin emoji="⛲" label="Plaza" sub="Call a neighbor" color="#a78bfa" onClick={() => onLandmark("park")} />
      </AnchoredLabel>
      {placed.map(({ h }) => {
        const mine = h.id === myHouseholdId;
        const online = now - h.lastActive < 60_000;
        const recent = now - h.lastActive < 15 * 60_000;
        return (
          <AnchoredLabel key={h.id} id={`hh:${h.id}`}>
            <Pin
              emoji={mine ? "⭐" : "🏠"}
              label={h.name}
              sub={mine ? "Your home" : online ? "online" : recent ? "recently active" : "away"}
              color={mine ? "#fbbf24" : "#00ec97"}
              dot={online ? "#00ec97" : recent ? "#fbbf24" : "#475569"}
              onClick={() => onHouse(h)}
            />
          </AnchoredLabel>
        );
      })}
    </div>
  );
}

/** Activity bubbles over Sims in a room. */
export function CharacterBubbles({ household, now }: { household: HouseholdView; now: number }) {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {household.characters.map((c) => {
        const busy = c.busy && c.busy.until > now ? c.busy : null;
        const emoji = busy ? (busy.itemId ? ITEMS[busy.itemId]?.emoji : ACTIONS[busy.action]?.emoji) : null;
        return (
          <AnchoredLabel key={c.id} id={`char:${c.id}`}>
            {emoji ? (
              <div className="glass flex items-center gap-1 rounded-xl px-2 py-0.5 text-lg">
                {emoji}
                <span className="font-mono text-[11px] font-bold text-[#00ec97]">{Math.ceil((busy!.until - now) / 1000)}s</span>
              </div>
            ) : (
              <div className="glass rounded-lg px-2 py-0.5 text-[11px] font-semibold">{c.name}</div>
            )}
          </AnchoredLabel>
        );
      })}
    </div>
  );
}
