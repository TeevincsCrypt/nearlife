"use client";

import { ACTIONS, ITEMS } from "@/lib/catalog";
import { PLACES, PLACE_BY_ID, TRAVEL } from "@/lib/places";
import type { HouseholdView } from "@/lib/types";
import { AnchoredLabel } from "../three/anchors";
import { cityPlacement, type Landmark, type Trip } from "../three/City";
import { REAL_IDS } from "./RealMode";

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
      <span className="glass flex items-center gap-2 rounded-2xl py-1 pr-3 pl-1">
        <span
          className="relative flex size-9 items-center justify-center rounded-xl border-[3px] border-[#0d1b5e] text-xl"
          style={{ background: `linear-gradient(180deg, ${color}, ${color}aa)` }}
        >
          {emoji}
          {dot && <span className="absolute -top-0.5 -right-0.5 size-2.5 rounded-full border border-slate-900" style={{ background: dot }} />}
        </span>
        <span className="flex flex-col items-start leading-tight">
          <span className="font-display max-w-36 truncate text-sm text-stroke">{label}</span>
          {sub && <span className="text-[10px] font-extrabold text-[#cfe0ff]">{sub}</span>}
        </span>
      </span>
      <span className="h-3 w-1 rounded-b bg-[#0d1b5e]" />
    </button>
  );
}

function PlacePin({ emoji, label, color, real, onClick }: { emoji: string; label: string; color: string; real?: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className="pointer-events-auto flex cursor-pointer flex-col items-center" style={{ WebkitTapHighlightColor: "transparent" }}>
      <span
        className="font-display flex items-center gap-1.5 rounded-xl border-[3px] border-[#0d1b5e] py-0.5 pr-2 pl-0.5 text-xs whitespace-nowrap text-white shadow-[0_3px_0_#0d1b5e] [-webkit-text-stroke:0.75px_#0d1b5e] [paint-order:stroke_fill]"
        style={{ background: "linear-gradient(180deg,#3d6cf2,#2a4ed0)" }}
      >
        <span className="flex size-6 items-center justify-center rounded-lg border-2 border-[#0d1b5e] text-sm" style={{ background: color }}>
          {emoji}
        </span>
        {label}
        {real && <span className="rounded border border-[#7a3d00] bg-[#ffd23f] px-1 text-[8px] text-[#7a3d00] [-webkit-text-stroke:0]">REAL</span>}
      </span>
      <span className="h-2.5 w-1 rounded-b bg-[#0d1b5e]" />
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
  onPlace,
  trips = [],
}: {
  households: HouseholdView[];
  myHouseholdId?: string | null;
  now: number;
  listingsCount: number;
  onHouse: (h: HouseholdView) => void;
  onLandmark: (l: Landmark) => void;
  onPlace: (placeId: string) => void;
  trips?: Array<Trip & { label: string }>;
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
      {PLACES.map((p) => (
        <AnchoredLabel key={p.id} id={`pl:${p.id}`}>
          <PlacePin emoji={p.emoji} label={p.short} color={p.color} real={REAL_IDS.has(p.id)} onClick={() => onPlace(p.id)} />
        </AnchoredLabel>
      ))}
      {trips.map((t) => (
        <AnchoredLabel key={t.id} id={`trip:${t.id}`}>
          <div className="glass rounded-lg px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap">
            {TRAVEL[t.mode].emoji} {t.label}
          </div>
        </AnchoredLabel>
      ))}
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
              color={mine ? "#ffd23f" : "#5fd3ff"}
              dot={online ? "#3ddc84" : recent ? "#ffd23f" : "#64748b"}
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
        const emoji = busy ? (busy.itemId ? ITEMS[busy.itemId]?.emoji : busy.place ? PLACE_BY_ID[busy.place]?.emoji : ACTIONS[busy.action]?.emoji) : null;
        return (
          <AnchoredLabel key={c.id} id={`char:${c.id}`}>
            {emoji ? (
              <div className="glass flex items-center gap-1 rounded-xl px-2 py-0.5 text-lg">
                {emoji}
                <span className="font-mono text-[11px] font-bold text-[#ffd23f]">{Math.ceil((busy!.until - now) / 1000)}s</span>
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
