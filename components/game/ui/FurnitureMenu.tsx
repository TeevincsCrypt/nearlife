"use client";

import { ACTIONS, CURRENCY_SYMBOL, ITEMS } from "@/lib/catalog";
import type { Character, PlacedFurniture } from "@/lib/types";

/** Live-mode popover: what the selected character can do with a tapped piece of furniture. */
export function FurnitureMenu({
  furniture,
  character,
  balance,
  now,
  powerCut,
  onAction,
  onClose,
}: {
  furniture: PlacedFurniture;
  character: Character | null;
  balance: number;
  now: number;
  powerCut: boolean;
  onAction: (actionId: string) => void;
  onClose: () => void;
}) {
  const item = ITEMS[furniture.itemId];
  const spec = item.furniture!;
  const actions = Object.values(ACTIONS).filter((a) => a.requires === spec.tag);
  const busy = character?.busy && character.busy.until > now ? character.busy : null;
  const noPower = powerCut && spec.powered;
  return (
    <div className="pointer-events-auto absolute inset-x-0 bottom-28 z-40 flex justify-center px-4">
      <div className="sheet-in w-full max-w-sm rounded-3xl bg-white p-4 shadow-2xl">
        <div className="flex items-center gap-3">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-slate-100 text-3xl">{item.emoji}</div>
          <div className="min-w-0 flex-1">
            <div className="font-bold">{item.name}</div>
            <div className="text-xs text-slate-500">
              {"★".repeat(spec.stars) || "Basic"} · {item.description}
            </div>
          </div>
          <button onClick={onClose} className="cursor-pointer rounded-full bg-slate-100 px-3 py-1.5 text-sm font-semibold text-slate-500">
            ✕
          </button>
        </div>
        {noPower && <div className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-800">⚡ Power cut: this needs electricity.</div>}
        {busy && <div className="mt-3 rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-600">{character!.name} is busy {busy.label}…</div>}
        <div className="mt-3 flex flex-col gap-2">
          {actions.length === 0 && <div className="text-sm text-slate-500">Decoration. Makes the place feel like home.</div>}
          {actions.map((a) => (
            <button
              key={a.id}
              disabled={!character || !!busy || !!noPower || balance < a.cost}
              onClick={() => onAction(a.id)}
              className="flex cursor-pointer items-center gap-3 rounded-2xl bg-emerald-500 px-4 py-3 text-left text-white active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
            >
              <span className="text-2xl">{a.emoji}</span>
              <span className="flex-1">
                <span className="block font-bold">
                  {a.label}
                  {character ? ` · ${character.name}` : ""}
                </span>
                <span className="block text-xs opacity-85">{a.help}</span>
              </span>
              <span className="text-sm font-bold whitespace-nowrap">{a.cost ? `${a.cost} ${CURRENCY_SYMBOL}` : `${a.durationSec}s`}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
