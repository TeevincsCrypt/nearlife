"use client";

import { useState } from "react";
import { CURRENCY_SYMBOL } from "@/lib/catalog";
import { PLACE_BY_ID, TRAVEL, whereIs, type TravelMode } from "@/lib/places";
import type { Character, HouseholdView } from "@/lib/types";
import { cn } from "@/lib/utils";
import { BrandIcon } from "./BrandIcon";
import { Portrait } from "./Portrait";
import { RealPanelFor } from "./RealMode";
import { Sheet } from "./Sheet";

type Act = <T = unknown>(path: string, body?: unknown, method?: "POST" | "DELETE") => Promise<T | null>;

export function PlaceSheet({
  placeId,
  me,
  character,
  households,
  now,
  act,
  toast,
  onClose,
  onEnter,
  highlight,
  onTravel,
}: {
  placeId: string;
  me: HouseholdView | null;
  character: Character | null;
  households: HouseholdView[];
  now: number;
  act: Act;
  toast: (t: string, k?: "info" | "error" | "success") => void;
  onClose: () => void;
  /** Walk into the building's interior (offered once the Sim has arrived). */
  onEnter?: () => void;
  /** Activity tapped inside the building, listed first. */
  highlight?: string;
  /** Called after a trip starts, so the game can follow the Sim and offer "Go inside" on arrival. */
  onTravel?: (placeId: string) => void;
}) {
  const place = PLACE_BY_ID[placeId];
  const [mode, setMode] = useState<TravelMode>("car");
  if (!place) return null;
  const busy = character?.busy && character.busy.until > now ? character.busy : null;
  const here = households.flatMap((h) =>
    h.characters
      .filter((c) => {
        const w = whereIs(c, now);
        return w.placeId === place.id && !w.arriving;
      })
      .map((c) => ({ c, h })),
  );
  const where = character ? whereIs(character, now) : null;
  const atPlace = where?.placeId === place.id && !where.arriving;
  const onTheWay = where?.placeId === place.id && where.arriving;
  const friendsHere = here.filter(({ h }) => h.id !== me?.id);
  const actionsOrdered = highlight ? [...place.actions].sort((a, b) => (a.id === highlight ? -1 : b.id === highlight ? 1 : 0)) : place.actions;
  const host = place.url.replace(/^https?:\/\//, "").replace(/\/$/, "");

  return (
    <Sheet
      title={place.name}
      icon={
        <BrandIcon id={place.id} emoji={place.emoji} size={44} radius={14} className="text-2xl" />
      }
      subtitle={place.description}
      onClose={onClose}
    >
      <div className="space-y-3 pb-2">
        {atPlace && character && (
          <div className="rounded-2xl border-[3px] border-[#0d1b5e] bg-gradient-to-b from-[#5ef0a0] to-[#20b866] px-3 py-2 text-center">
            <div className="font-display text-lg text-stroke">📍 {character.name} is at {place.short}</div>
          </div>
        )}
        {atPlace && onEnter && (
          <button onClick={onEnter} className="btn-gold w-full cursor-pointer rounded-2xl py-3 text-xl">
            🚪 Go inside
          </button>
        )}
        {!place.own && (
          <a href={place.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-semibold" style={{ color: place.color }}>
            {host} ↗ <span className="font-normal text-slate-500">(real project · NEARLIFE isn&apos;t affiliated)</span>
          </a>
        )}

        {friendsHere.length > 0 && (
          <div className="flex items-center gap-2 rounded-2xl bg-white/[0.04] px-3 py-2">
            <div className="flex -space-x-2">
              {friendsHere.slice(0, 5).map(({ c }) => (
                <Portrait key={c.id} look={c.look} size={26} />
              ))}
            </div>
            <span className="text-xs text-slate-300">
              {friendsHere.map(({ c, h }) => `${c.name} (${h.name})`).join(", ")} {friendsHere.length === 1 ? "is" : "are"} here now
            </span>
          </div>
        )}

        {place.id === "burrow" && me && (me.debt ?? 0) > 0 && (
          <div className="rounded-2xl border border-amber-300/30 bg-amber-300/10 px-3 py-2 text-sm text-amber-200">
            You owe Burrow {me.debt} {CURRENCY_SYMBOL}.
          </div>
        )}

        {!me ? (
          <div className="rounded-2xl bg-white/[0.04] p-3 text-sm text-slate-300">Move in to visit places.</div>
        ) : (
          <>
            {!atPlace && (
              <div className="space-y-2">
                <div className="font-mono text-[11px] font-bold tracking-widest text-slate-500">GET THERE BY</div>
                <div className="grid grid-cols-3 gap-2">
                  {(Object.keys(TRAVEL) as TravelMode[]).map((m) => (
                    <button
                      key={m}
                      onClick={() => setMode(m)}
                      disabled={onTheWay}
                      className={cn(
                        "flex cursor-pointer flex-col items-center rounded-2xl border px-2 py-2.5 disabled:opacity-50",
                        mode === m ? "neon-ring border-transparent bg-[#0d1b5e]/35" : "border-white/10 bg-white/[0.03]",
                      )}
                    >
                      <span className="text-2xl">{TRAVEL[m].emoji}</span>
                      <span className="text-sm font-bold text-white">{TRAVEL[m].label}</span>
                      <span className="font-mono text-[10px] text-slate-400">
                        {TRAVEL[m].cost} {CURRENCY_SYMBOL} · {TRAVEL[m].seconds}s
                      </span>
                    </button>
                  ))}
                </div>
                {onTheWay && character ? (
                  <div className="font-display rounded-2xl border-[3px] border-[#0d1b5e] bg-[#0d1b5e]/35 py-3 text-center text-lg text-stroke">
                    {TRAVEL[character.busy?.travel ?? "car"].emoji} On the way… {Math.max(0, Math.ceil(((character.busy?.arriveAt ?? now) - now) / 1000))}s
                  </div>
                ) : (
                  <button
                    disabled={!character || !!busy || me.balance < TRAVEL[mode].cost}
                    onClick={async () => {
                      const ok = await act("/api/place", { characterId: character!.id, placeId: place.id, actionId: "__travel", travel: mode });
                      if (ok) {
                        toast(`${TRAVEL[mode].emoji} ${character!.name} is heading to ${place.short}`, "success");
                        onTravel?.(place.id);
                      }
                    }}
                    className="btn-gold w-full cursor-pointer rounded-2xl py-3 text-xl disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {TRAVEL[mode].emoji} Go by {TRAVEL[mode].label.toLowerCase()} · {TRAVEL[mode].cost} {CURRENCY_SYMBOL}
                  </button>
                )}
                {busy && !onTheWay && character && (
                  <div className="rounded-2xl bg-white/[0.04] px-3 py-2 text-sm text-slate-300">
                    {character.name} is {busy.label}… {Math.ceil((busy.until - now) / 1000)}s
                  </div>
                )}
                {friendsHere.length > 0 && <div className="text-xs font-bold text-[#ffd23f]">Go now to meet {friendsHere.map(({ c }) => c.name).join(", ")} there.</div>}
                <div className="pt-1 font-mono text-[11px] font-bold tracking-widest text-slate-500">THINGS TO DO THERE</div>
                <div className="flex flex-wrap gap-1.5">
                  {place.actions.map((a) => (
                    <span key={a.id} className="rounded-xl bg-[#0d1b5e]/35 px-2 py-1 text-xs font-bold text-white">
                      {a.emoji} {a.label}
                      {a.cost > 0 && <span className="ml-1 text-[#ffd23f]">{a.cost} {CURRENCY_SYMBOL}</span>}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {atPlace && (
              <>
                {busy && character && (
                  <div className="rounded-2xl bg-white/[0.04] px-3 py-2 text-sm text-slate-300">
                    {character.name} is {busy.label}… {Math.ceil((busy.until - now) / 1000)}s
                  </div>
                )}
                <div className="space-y-2">
                  {actionsOrdered.map((a) => {
                    const extra = a.special === "repay" ? (me.debt ?? 0) : 0;
                    const total = a.cost + extra;
                    const blocked =
                      (a.special === "borrow" && (me.debt ?? 0) > 0) || (a.special === "repay" && !(me.debt ?? 0)) || me.balance < total || !character || !!busy;
                    return (
                      <button
                        key={a.id}
                        disabled={blocked}
                        onClick={async () => {
                          const ok = await act("/api/place", { characterId: character!.id, placeId: place.id, actionId: a.id, travel: "car" });
                          if (ok) {
                            toast(`${a.emoji} ${character!.name}: ${a.label}${friendsHere.length ? " together" : ""}`, "success");
                            onClose();
                          }
                        }}
                        className={cn(
                          "flex w-full cursor-pointer items-center gap-3 rounded-2xl border bg-white/[0.04] p-3 text-left active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40",
                          a.id === highlight ? "neon-ring border-transparent" : "border-white/10",
                        )}
                      >
                        <span className="text-2xl">{a.emoji}</span>
                        <span className="min-w-0 flex-1">
                          <span className="block font-bold text-white">{a.label}</span>
                          <span className="block text-xs text-slate-400">
                            {a.help} · {a.durationSec}s
                          </span>
                        </span>
                        <span className="btn-neon rounded-xl px-3 py-1.5 font-mono text-sm font-bold whitespace-nowrap">{total ? `${total} ${CURRENCY_SYMBOL}` : "Free"}</span>
                      </button>
                    );
                  })}
                </div>
                <p className="text-[11px] text-slate-500">
                  {friendsHere.length ? `Doing things with other players here gives a together bonus. ` : ""}Payouts are random within the shown range.
                </p>
              </>
            )}
            <RealPanelFor id={place.id} characterId={character?.id} />
          </>
        )}
      </div>
    </Sheet>
  );
}
