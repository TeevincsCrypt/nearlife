"use client";

import { useState } from "react";
import { CURRENCY_SYMBOL } from "@/lib/catalog";
import { PLACE_BY_ID, TRAVEL, type TravelMode } from "@/lib/places";
import type { Character, HouseholdView } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Portrait } from "./Portrait";
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
}: {
  placeId: string;
  me: HouseholdView | null;
  character: Character | null;
  households: HouseholdView[];
  now: number;
  act: Act;
  toast: (t: string, k?: "info" | "error" | "success") => void;
  onClose: () => void;
}) {
  const place = PLACE_BY_ID[placeId];
  const [mode, setMode] = useState<TravelMode>("car");
  if (!place) return null;
  const busy = character?.busy && character.busy.until > now ? character.busy : null;
  const here = households.flatMap((h) =>
    h.characters.filter((c) => c.busy && c.busy.place === place.id && c.busy.until > now && (c.busy.arriveAt ?? 0) <= now).map((c) => ({ c, h })),
  );
  const host = place.url.replace(/^https?:\/\//, "").replace(/\/$/, "");

  return (
    <Sheet
      title={place.name}
      icon={
        <span className="flex size-11 items-center justify-center rounded-2xl text-2xl" style={{ background: `${place.color}22`, color: place.color }}>
          {place.emoji}
        </span>
      }
      subtitle={place.description}
      onClose={onClose}
    >
      <div className="space-y-3 pb-2">
        <a href={place.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-semibold" style={{ color: place.color }}>
          {host} ↗ <span className="font-normal text-slate-500">(real project · NEARLIFE isn&apos;t affiliated)</span>
        </a>

        {here.length > 0 && (
          <div className="flex items-center gap-2 rounded-2xl bg-white/[0.04] px-3 py-2">
            <div className="flex -space-x-2">
              {here.slice(0, 5).map(({ c }) => (
                <Portrait key={c.id} look={c.look} size={26} />
              ))}
            </div>
            <span className="text-xs text-slate-300">
              {here.map(({ c, h }) => `${c.name} (${h.name})`).join(", ")} {here.length === 1 ? "is" : "are"} here now
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
            <div>
              <div className="mb-1.5 font-mono text-[11px] font-bold tracking-widest text-slate-500">GET THERE BY</div>
              <div className="grid grid-cols-3 gap-2">
                {(Object.keys(TRAVEL) as TravelMode[]).map((m) => (
                  <button
                    key={m}
                    onClick={() => setMode(m)}
                    className={cn(
                      "flex cursor-pointer flex-col items-center rounded-2xl border px-2 py-2.5",
                      mode === m ? "neon-ring border-transparent bg-[#00ec97]/10" : "border-white/10 bg-white/[0.03]",
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
            </div>

            {busy && character && (
              <div className="rounded-2xl bg-white/[0.04] px-3 py-2 text-sm text-slate-300">
                {character.name} is {busy.label}… {Math.ceil((busy.until - now) / 1000)}s
              </div>
            )}

            <div className="space-y-2">
              {place.actions.map((a) => {
                const fare = TRAVEL[mode].cost;
                const extra = a.special === "repay" ? (me.debt ?? 0) : 0;
                const total = fare + a.cost + extra;
                const blocked =
                  (a.special === "borrow" && (me.debt ?? 0) > 0) || (a.special === "repay" && !(me.debt ?? 0)) || me.balance < total || !character || !!busy;
                return (
                  <button
                    key={a.id}
                    disabled={blocked}
                    onClick={async () => {
                      const ok = await act("/api/place", { characterId: character!.id, placeId: place.id, actionId: a.id, travel: mode });
                      if (ok) {
                        toast(`${TRAVEL[mode].emoji} ${character!.name} is heading to ${place.short}`, "success");
                        onClose();
                      }
                    }}
                    className="flex w-full cursor-pointer items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-left active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <span className="text-2xl">{a.emoji}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-bold text-white">{a.label}</span>
                      <span className="block text-xs text-slate-400">
                        {a.help} · {a.durationSec}s there
                      </span>
                    </span>
                    <span className="btn-neon rounded-xl px-3 py-1.5 font-mono text-sm font-bold whitespace-nowrap">
                      {total} {CURRENCY_SYMBOL}
                    </span>
                  </button>
                );
              })}
            </div>
            <p className="text-[11px] text-slate-500">
              Price includes the {TRAVEL[mode].label.toLowerCase()} fare. Payouts are random within the shown range.
            </p>
          </>
        )}
      </div>
    </Sheet>
  );
}
