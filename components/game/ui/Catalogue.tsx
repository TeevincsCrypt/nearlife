"use client";

import { useState } from "react";
import { CURRENCY_SYMBOL, FURNITURE_CATEGORIES, ITEMS, type FurnitureCategory } from "@/lib/catalog";
import { placedCount } from "@/lib/layout";
import type { HouseholdView } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Sheet } from "./Sheet";

const CATEGORY_BG: Record<FurnitureCategory, string> = {
  sleep: "from-rose-50 to-orange-50",
  kitchen: "from-amber-50 to-yellow-50",
  bath: "from-sky-50 to-cyan-50",
  comfort: "from-emerald-50 to-lime-50",
  fun: "from-violet-50 to-fuchsia-50",
  work: "from-stone-50 to-amber-50",
};

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

  return (
    <Sheet title="Catalogue" onClose={onHide} subtitle="Tap an item, then tap the floor to place it">
      <div className="-mx-5 mb-3 flex gap-2 overflow-x-auto px-5 pb-1">
        {stored.length > 0 && (
          <button
            onClick={() => setTab("stored")}
            className={cn(
              "flex shrink-0 cursor-pointer items-center gap-1.5 rounded-full px-4 py-2.5 text-[15px] font-semibold",
              tab === "stored" ? "bg-slate-900 text-white" : "bg-amber-100 text-amber-900",
            )}
          >
            📦 Stored ({stored.reduce((s, [, q]) => s + q, 0)})
          </button>
        )}
        {FURNITURE_CATEGORIES.map((c) => (
          <button
            key={c.id}
            onClick={() => setTab(c.id)}
            className={cn(
              "flex shrink-0 cursor-pointer items-center gap-1.5 rounded-full px-4 py-2.5 text-[15px] font-semibold",
              tab === c.id ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-500",
            )}
          >
            <span>{c.emoji}</span>
            {c.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-3 pb-2">
        {tab === "stored"
          ? stored.map(([id, q]) => {
              const item = ITEMS[id];
              return (
                <button key={id} onClick={() => onPick(id, "place")} className="cursor-pointer rounded-3xl bg-amber-50 p-3 text-left active:scale-95">
                  <div className="flex justify-between text-xs font-semibold text-slate-500">
                    <span>
                      {item.furniture!.size[0]}×{item.furniture!.size[1]}
                    </span>
                    <span>×{q}</span>
                  </div>
                  <div className="my-2 text-center text-5xl">{item.emoji}</div>
                  <div className="truncate text-sm font-semibold">{item.name}</div>
                  <div className="text-sm font-bold text-amber-700">Place</div>
                </button>
              );
            })
          : items.map((item) => {
              const f = item.furniture!;
              const afford = household.balance >= f.storePrice;
              return (
                <button
                  key={item.id}
                  onClick={() => onPick(item.id, "buy")}
                  disabled={!afford}
                  className={cn(
                    "cursor-pointer rounded-3xl bg-gradient-to-br p-3 text-left transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-45",
                    CATEGORY_BG[f.category],
                  )}
                  title={item.description}
                >
                  <div className="flex justify-between text-xs font-semibold text-slate-500">
                    <span>
                      {f.size[0]}×{f.size[1]}
                    </span>
                    <span className="text-amber-500">{"★".repeat(f.stars)}</span>
                  </div>
                  <div className="my-2 text-center text-5xl drop-shadow-sm">{item.emoji}</div>
                  <div className="truncate text-sm font-semibold">{item.name}</div>
                  <div className="text-sm font-bold text-emerald-600">
                    {f.storePrice} {CURRENCY_SYMBOL}
                  </div>
                  {f.tag !== "decor" && <div className="mt-0.5 line-clamp-2 text-[11px] leading-tight text-slate-500">{item.description}</div>}
                </button>
              );
            })}
      </div>
    </Sheet>
  );
}
