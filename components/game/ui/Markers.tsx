"use client";

import { LOGOS } from "./BrandIcon";
import { ACTIONS, ITEMS } from "@/lib/catalog";
import { PLACES, PLACE_BY_ID, TRAVEL } from "@/lib/places";
import type { Character, ChatMessage, HouseholdView } from "@/lib/types";
import { AnchoredLabel } from "../three/anchors";
import { cityPlacement, type Landmark, type Trip } from "../three/City";
import { REAL_IDS } from "./RealMode";
import { AD_SLOTS, type LiveAd } from "@/lib/ad-slots";

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

function PlacePin({ id, emoji, label, color, real, onClick }: { id: string; emoji: string; label: string; color: string; real?: boolean; onClick: () => void }) {
  const logo = LOGOS[id];
  return (
    <button onClick={onClick} className="pointer-events-auto flex cursor-pointer flex-col items-center" style={{ WebkitTapHighlightColor: "transparent" }}>
      <span
        className="font-display flex items-center gap-1.5 rounded-xl border-[3px] border-[#0d1b5e] py-0.5 pr-2 pl-0.5 text-xs whitespace-nowrap text-white shadow-[0_3px_0_#0d1b5e] [-webkit-text-stroke:0.75px_#0d1b5e] [paint-order:stroke_fill]"
        style={{ background: "linear-gradient(180deg,#3d6cf2,#2a4ed0)" }}
      >
        <span className="flex size-6 items-center justify-center overflow-hidden rounded-lg border-2 border-[#0d1b5e] text-sm" style={{ background: logo ? "#fff" : color }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {logo ? <img src={logo} alt="" draggable={false} className="size-full object-contain" /> : emoji}
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
  ads = [],
  onBillboard,
}: {
  households: HouseholdView[];
  myHouseholdId?: string | null;
  now: number;
  listingsCount: number;
  onHouse: (h: HouseholdView) => void;
  onLandmark: (l: Landmark) => void;
  onPlace: (placeId: string) => void;
  trips?: Array<Trip & { label: string }>;
  ads?: LiveAd[];
  onBillboard?: (slotId: string) => void;
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
          <PlacePin id={p.id} emoji={p.emoji} label={p.short} color={p.color} real={REAL_IDS.has(p.id)} onClick={() => onPlace(p.id)} />
        </AnchoredLabel>
      ))}
      {AD_SLOTS.map((slot) => {
        const ad = ads.find((a) => a.slot === slot.id);
        return (
          <AnchoredLabel key={slot.id} id={`ad:${slot.id}`}>
            <button
              onClick={() => onBillboard?.(slot.id)}
              className={`pointer-events-auto cursor-pointer rounded-lg border-2 border-[#0d1b5e] px-1.5 py-0.5 text-[10px] font-black whitespace-nowrap shadow-[0_2px_0_#0d1b5e] ${ad ? "bg-[#ffd23f] text-[#7a3d00]" : "bg-white text-[#2a4ed0]"}`}
            >
              {ad ? `AD · ${ad.name}` : "📣 Ad space"}
            </button>
          </AnchoredLabel>
        );
      })}
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

/** Activity bubbles, name tags and chat speech bubbles over Sims in a home. */
export function CharacterBubbles({
  characters,
  now,
  chat = [],
  channel,
  guestIds,
  onGuest,
}: {
  characters: Character[];
  now: number;
  chat?: ChatMessage[];
  channel?: string;
  guestIds?: Set<string>;
  onGuest?: (c: Character) => void;
}) {
  const said = new Map<string, ChatMessage>();
  if (channel) for (const m of chat) if (m.channel === channel && m.fromCharacterId && now - m.ts < 9000) said.set(m.fromCharacterId, m);
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {characters.map((c) => {
        const guest = guestIds?.has(c.id);
        const busy = !guest && c.busy && c.busy.until > now ? c.busy : null;
        const emoji = busy ? (busy.itemId ? ITEMS[busy.itemId]?.emoji : busy.place ? PLACE_BY_ID[busy.place]?.emoji : ACTIONS[busy.action]?.emoji) : null;
        const line = said.get(c.id);
        return (
          <AnchoredLabel key={c.id} id={`char:${c.id}`}>
            <div className="flex flex-col items-center gap-1">
              {line && (
                <div className="relative max-w-[200px] rounded-2xl border-[3px] border-[#0d1b5e] bg-white px-2.5 py-1 text-center text-xs font-bold break-words text-[#0d1b5e] shadow-[0_3px_0_#0d1b5e]">
                  {line.kind === "wave" ? "👋" : line.text}
                </div>
              )}
              {emoji ? (
                <div className="glass flex items-center gap-1 rounded-xl px-2 py-0.5 text-lg">
                  {emoji}
                  <span className="font-mono text-[11px] font-bold text-[#ffd23f]">{Math.ceil((busy!.until - now) / 1000)}s</span>
                </div>
              ) : guest ? (
                <button onClick={() => onGuest?.(c)} className="btn-gold pointer-events-auto cursor-pointer rounded-lg px-2 py-0.5 text-[11px]">
                  {c.name} · guest
                </button>
              ) : (
                <div className="glass rounded-lg px-2 py-0.5 text-[11px] font-semibold">{c.name}</div>
              )}
            </div>
          </AnchoredLabel>
        );
      })}
    </div>
  );
}
