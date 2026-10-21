"use client";

import { BrandIcon } from "./BrandIcon";
import { CURRENCY_SYMBOL } from "@/lib/catalog";
import type { PlaceDef } from "@/lib/places";
import type { Character, HouseholdView } from "@/lib/types";
import { AnchoredLabel } from "../three/anchors";
import { simsInside } from "../three/PlaceInterior";
import { Portrait } from "./Portrait";

/** Tappable station labels and Sim name tags inside a place. */
export function InsideLabels({
  place,
  households,
  now,
  onStation,
}: {
  place: PlaceDef;
  households: HouseholdView[];
  now: number;
  onStation: (actionId: string) => void;
}) {
  const sims = simsInside(place, households, now);
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {place.actions.map((a) => (
        <AnchoredLabel key={a.id} id={`st:${a.id}`}>
          <button
            onClick={() => onStation(a.id)}
            className="font-display pointer-events-auto flex cursor-pointer items-center gap-1.5 rounded-xl border-[3px] border-[#0d1b5e] py-1 pr-2.5 pl-1 text-xs whitespace-nowrap text-white shadow-[0_3px_0_#0d1b5e] [-webkit-text-stroke:0.75px_#0d1b5e] [paint-order:stroke_fill]"
            style={{ background: "linear-gradient(180deg,#3d6cf2,#2a4ed0)" }}
          >
            <span className="flex size-6 items-center justify-center rounded-lg border-2 border-[#0d1b5e] text-sm" style={{ background: place.color }}>{a.emoji}</span>
            {a.label}
            {a.cost > 0 && (
              <span className="rounded-md bg-[#0d1b5e]/60 px-1 text-[10px] text-[#ffd23f] [-webkit-text-stroke:0]">
                {a.cost} {CURRENCY_SYMBOL}
              </span>
            )}
          </button>
        </AnchoredLabel>
      ))}
      {sims.map(({ c, h }) => {
        const b = c.busy && c.busy.until > now ? c.busy : null;
        const act = b ? place.actions.find((a) => a.id === b.action.split(":")[2]) : null;
        return (
          <AnchoredLabel key={c.id} id={`pc:${c.id}`}>
            <div className="glass flex items-center gap-1 rounded-lg px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap">
              {act && <span>{act.emoji}</span>}
              {c.name}
              <span className="text-slate-400">· {h.name}</span>
              {b && <span className="font-mono text-[#ffd23f]">{Math.ceil((b.until - now) / 1000)}s</span>}
            </div>
          </AnchoredLabel>
        );
      })}
    </div>
  );
}

/** Bottom card while inside a place. */
export function InsidePanel({
  place,
  households,
  now,
  character,
  onHome,
  onCity,
  onAll,
}: {
  place: PlaceDef;
  households: HouseholdView[];
  now: number;
  character: Character | null;
  onHome: () => void;
  onCity: () => void;
  onAll: () => void;
}) {
  const sims = simsInside(place, households, now);
  const busyHere = character?.busy && character.busy.until > now && character.busy.place === place.id ? character.busy : null;
  const arriving = busyHere && (busyHere.arriveAt ?? 0) > now;
  const here = character?.location === place.id;
  const status = !character
    ? "Move in to visit places."
    : arriving
      ? `${character.name} is on the way… ${Math.ceil(((busyHere!.arriveAt ?? now) - now) / 1000)}s`
      : busyHere
        ? `${character.name} is ${busyHere.label} · ${Math.ceil((busyHere!.until - now) / 1000)}s`
        : here
          ? `${character.name} is here. Tap a station to do something.`
          : `Tap a station to bring ${character.name} here by car, train or plane.`;
  return (
    <div className="glass-strong pointer-events-auto absolute inset-x-2 top-[calc(max(0.6rem,env(safe-area-inset-top))+7rem)] z-30 mx-auto max-w-xl rounded-2xl p-2.5">
      <div className="flex items-center gap-3">
        <BrandIcon id={place.id} emoji={place.emoji} size={36} radius={12} className="border-[3px] border-[#0d1b5e] text-lg" />
        <div className="min-w-0 flex-1">
          <div className="text-[10px] font-black tracking-[0.2em] text-[#ffd23f]">
            INSIDE
          </div>
          <div className="font-display truncate text-lg leading-tight text-stroke">{place.name}</div>
        </div>
        {sims.length > 0 && (
          <div className="flex -space-x-2">
            {sims.slice(0, 4).map(({ c }) => (
              <Portrait key={c.id} look={c.look} size={28} />
            ))}
          </div>
        )}
      </div>
      <div className="mt-1 text-xs text-slate-300">{status}</div>
      <div className="mt-2 flex gap-2">
        <button onClick={onCity} className="btn-blue cursor-pointer rounded-xl px-3 py-1.5 text-xs">
          ← City
        </button>
        <button onClick={onAll} className="btn-blue flex-1 cursor-pointer rounded-xl py-1.5 text-xs">
          All activities
        </button>
        {here && !busyHere && (
          <button onClick={onHome} className="btn-gold cursor-pointer rounded-xl px-3 py-1.5 text-xs">
            🏠 Go home
          </button>
        )}
      </div>
    </div>
  );
}
