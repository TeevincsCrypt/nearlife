"use client";

import { useState } from "react";
import { CURRENCY_SYMBOL, FURNITURE_CATEGORIES, ITEMS, type FurnitureCategory } from "@/lib/catalog";
import { placedCount } from "@/lib/layout";
import type { HouseholdView } from "@/lib/types";
import { cn } from "@/lib/utils";

const ACCENT: Record<FurnitureCategory, string> = {
  sleep: "#a78bfa",
  kitchen: "#fbbf24",
  bath: "#22d3ee",
  comfort: "#00ec97",
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
          <span className="font-mono text-xs font-bold tracking-[0.2em] text-[#00ec97]">BUILD</span>
          <span className="text-xs text-slate-400">Pick an item, tap the floor, confirm</span>
          <button onClick={onHide} className="ml-auto cursor-pointer rounded-lg bg-white/10 px-2.5 py-1 text-xs font-semibold text-slate-300">
            Hide
          </button>
        </div>
        <div className="flex gap-1.5 overflow-x-auto px-4 pt-3 pb-2">
          {tabs.map((c) => (
            <button
              key={c.id}
              onClick={() => setTab(c.id)}
              className={cn(
                "flex shrink-0 cursor-pointer items-center gap-1 rounded-xl px-3 py-1.5 text-sm font-semibold",
                tab === c.id ? "bg-white text-slate-900" : "bg-white/5 text-slate-300",
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
                  className="flex w-32 shrink-0 cursor-pointer flex-col rounded-2xl border border-amber-300/40 bg-amber-300/10 p-3 text-left active:scale-95"
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
                    className="flex w-32 shrink-0 cursor-pointer flex-col rounded-2xl border bg-white/[0.04] p-3 text-left transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
                    style={{ borderColor: `${ACCENT[f.category]}55` }}
                  >
                    <div className="flex justify-between font-mono text-[10px] text-slate-400">
                      <span>
                        {f.size[0]}×{f.size[1]}
                      </span>
                      <span style={{ color: ACCENT[f.category] }}>{"◆".repeat(f.stars)}</span>
                    </div>
                    <div className="my-2 text-center text-4xl" style={{ filter: `drop-shadow(0 0 10px ${ACCENT[f.category]}55)` }}>
                      {item.emoji}
                    </div>
                    <div className="truncate text-sm font-semibold text-white">{item.name}</div>
                    <div className="font-mono text-sm font-bold text-[#00ec97]">
                      {f.storePrice} {CURRENCY_SYMBOL}
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
