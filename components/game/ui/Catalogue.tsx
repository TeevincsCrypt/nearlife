"use client";

import { useState } from "react";
import { CURRENCY_SYMBOL, FURNITURE_CATEGORIES, ITEMS, type FurnitureCategory } from "@/lib/catalog";
import { placedCount } from "@/lib/layout";
import type { HouseholdView } from "@/lib/types";
import { cn } from "@/lib/utils";

const ACCENT: Record<FurnitureCategory, string> = {
  sleep: "#b28cff",
  kitchen: "#ffd23f",
  bath: "#5fd3ff",
  comfort: "#3ddc84",
  fun: "#f472b6",
  work: "#fb923c",
};

/** Build-mode tray: category rail + horizontally scrolling item cards. */
export function Catalogue({
  household,
  onPick,
  onHide,
}: {
  household: HouseholdView;
  onPick: (itemId: string, mode: "buy" | "place") => void;
  onHide: () => void;
}) {
  const [tab, setTab] = useState<FurnitureCategory | "stored">("sleep");
  const stored = Object.entries(household.inventory)
    .filter(([id]) => ITEMS[id]?.furniture)
    .map(([id, q]) => [id, q - placedCount(household.layout, id)] as const)
    .filter(([, free]) => free > 0);
  const items = Object.values(ITEMS).filter((i) => i.furniture && i.furniture.category === tab);
  const tabs = [...(stored.length ? [{ id: "stored" as const, label: "Stored", emoji: "📦" }] : []), ...FURNITURE_CATEGORIES];

  return (
    <div className="pointer-events-auto absolute inset-x-0 bottom-0 z-40 flex justify-center px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
      <div className="sheet-in glass-strong w-full max-w-xl overflow-hidden rounded-3xl shadow-2xl">
        <div className="flex items-center gap-2 px-4 pt-3">
          <span className="font-display text-2xl text-stroke">CATALOGUE</span>
          <span className="hidden text-xs font-bold text-[#cfe0ff] sm:inline">Pick an item, tap the floor, confirm</span>
          <button onClick={onHide} className="btn-blue font-display ml-auto cursor-pointer rounded-xl px-3 py-1 text-sm">
            HIDE
          </button>
        </div>
        <div className="flex gap-1.5 overflow-x-auto px-4 pt-3 pb-2">
          {tabs.map((c) => (
            <button
              key={c.id}
              onClick={() => setTab(c.id)}
              className={cn(
                "font-display flex shrink-0 cursor-pointer items-center gap-1 rounded-xl px-3 py-1.5 text-sm",
                tab === c.id ? "btn-gold" : "well font-display text-white",
              )}
            >
              <span>{c.emoji}</span>
              {c.label}
            </button>
          ))}
        </div>
        <div className="flex gap-2.5 overflow-x-auto px-4 pt-1 pb-4">
          {tab === "stored"
            ? stored.map(([id, q]) => (
                <button
                  key={id}
                  onClick={() => onPick(id, "place")}
                  className="well flex w-32 shrink-0 cursor-pointer flex-col rounded-2xl p-3 text-left shadow-[0_4px_0_#0d1b5e] active:translate-y-0.5"
                >
                  <div className="flex justify-between font-mono text-[10px] text-slate-400">
                    <span>
                      {ITEMS[id].furniture!.size[0]}×{ITEMS[id].furniture!.size[1]}
                    </span>
                    <span>×{q}</span>
                  </div>
                  <div className="my-2 text-center text-4xl">{ITEMS[id].emoji}</div>
                  <div className="truncate text-sm font-semibold text-white">{ITEMS[id].name}</div>
                  <div className="text-xs font-bold text-amber-300">Place</div>
                </button>
              ))
            : items.map((item) => {
                const f = item.furniture!;
                const afford = household.balance >= f.storePrice;
                return (
                  <button
                    key={item.id}
                    onClick={() => onPick(item.id, "buy")}
                    disabled={!afford}
                    title={item.description}
                    className="flex w-32 shrink-0 cursor-pointer flex-col rounded-2xl border-[3px] border-[#0d1b5e] p-2.5 text-left shadow-[0_4px_0_#0d1b5e] transition active:translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
                    style={{ background: `linear-gradient(180deg, #2a4ed0, #1b349c)` }}
                  >
                    <div className="flex justify-between font-mono text-[10px] text-slate-400">
                      <span>
                        {f.size[0]}×{f.size[1]}
                      </span>
                      <span className="text-[#ffd23f]">{"★".repeat(f.stars)}</span>
                    </div>
                    <div
                      className="my-2 flex h-16 items-center justify-center rounded-xl text-4xl"
                      style={{ background: `radial-gradient(circle at 50% 40%, ${ACCENT[f.category]}88, transparent 70%)` }}
                    >
                      <span className="drop-shadow-[0_3px_0_rgba(13,27,94,0.6)]">{item.emoji}</span>
                    </div>
                    <div className="font-display text-[10px] leading-none uppercase" style={{ color: ACCENT[f.category] }}>
                      {f.category}
                    </div>
                    <div className="font-display truncate text-sm text-stroke">{item.name}</div>
                    <div className="font-display mt-1 flex items-center gap-1 text-sm text-gold">
                      <span className="flex size-4 items-center justify-center rounded-full border border-[#7a3d00] bg-[#ffd23f] text-[8px] text-[#7a3d00] [-webkit-text-stroke:0]">S</span>
                      {f.storePrice}
                    </div>
                    {f.tag !== "decor" && <div className="mt-0.5 line-clamp-2 text-[10px] leading-tight text-slate-400">{item.description}</div>}
                  </button>
                );
              })}
        </div>
      </div>
    </div>
  );
}
