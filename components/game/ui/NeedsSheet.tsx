"use client";

import { ACTIONS, NEED_FALLBACK, NEED_META } from "@/lib/catalog";
import type { Character, HouseholdView } from "@/lib/types";
import { NEED_KEYS } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Sheet } from "./Sheet";

function barColor(v: number) {
  if (v >= 60) return "bg-emerald-500";
  if (v >= 30) return "bg-amber-400";
  return "bg-red-500";
}

export function NeedsSheet({
  household,
  character,
  now,
  onSelect,
  onFix,
  onHide,
}: {
  household: HouseholdView;
  character: Character;
  now: number;
  onSelect: (id: string) => void;
  onFix: (actionId: string) => void;
  onHide: () => void;
}) {
  const busy = character.busy && character.busy.until > now ? character.busy : null;
  return (
    <Sheet title={character.name} icon={character.avatar} subtitle={busy ? `${busy.label}… ${Math.ceil((busy.until - now) / 1000)}s` : "Idle · tap a need to fix it"} onClose={onHide}>
      {household.characters.length > 1 && (
        <div className="mb-3 flex gap-2">
          {household.characters.map((c) => (
            <button
              key={c.id}
              onClick={() => onSelect(c.id)}
              className={cn(
                "flex cursor-pointer items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold",
                c.id === character.id ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600",
              )}
            >
              {c.avatar} {c.name}
            </button>
          ))}
        </div>
      )}
      <div className="space-y-3 pb-2">
        {NEED_KEYS.map((k) => {
          const v = Math.round(character.needs[k]);
          const fix = ACTIONS[NEED_FALLBACK[k]];
          return (
            <button key={k} onClick={() => onFix(fix.id)} disabled={!!busy} className="flex w-full cursor-pointer items-center gap-3 text-left disabled:cursor-default">
              <span className="w-8 text-2xl">{NEED_META[k].emoji}</span>
              <span className="w-20 text-sm font-semibold">{NEED_META[k].label}</span>
              <span className="relative h-4 flex-1 overflow-hidden rounded-full bg-slate-100">
                <span className={cn("absolute inset-y-0 left-0 rounded-full transition-all duration-700", barColor(v))} style={{ width: `${v}%` }} />
              </span>
              <span className={cn("w-9 text-right text-sm font-bold tabular-nums", v < 30 && "text-red-600")}>{v}</span>
              {!busy && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs">{fix.emoji}</span>}
            </button>
          );
        })}
      </div>
    </Sheet>
  );
}
