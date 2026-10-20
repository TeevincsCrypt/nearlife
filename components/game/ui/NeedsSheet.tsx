"use client";

import { ACTIONS, NEED_FALLBACK, NEED_META } from "@/lib/catalog";
import type { Character, HouseholdView } from "@/lib/types";
import { NEED_KEYS } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Portrait } from "./Portrait";
import { Sheet } from "./Sheet";

export function needColor(v: number) {
  if (v >= 60) return "#00ec97";
  if (v >= 30) return "#fbbf24";
  return "#fb7185";
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
    <Sheet
      title={character.name}
      icon={<Portrait look={character.look} size={40} />}
      subtitle={busy ? `${busy.label}… ${Math.ceil((busy.until - now) / 1000)}s` : "Tap a need to take care of it"}
      onClose={onHide}
    >
      {household.characters.length > 1 && (
        <div className="mb-3 flex gap-2 overflow-x-auto">
          {household.characters.map((c) => (
            <button
              key={c.id}
              onClick={() => onSelect(c.id)}
              className={cn(
                "flex shrink-0 cursor-pointer items-center gap-2 rounded-xl py-1 pr-3 pl-1 text-sm font-semibold",
                c.id === character.id ? "neon-ring bg-white/10 text-white" : "bg-white/5 text-slate-400",
              )}
            >
              <Portrait look={c.look} size={26} />
              {c.name}
            </button>
          ))}
        </div>
      )}
      <div className="grid grid-cols-1 gap-2 pb-2">
        {NEED_KEYS.map((k) => {
          const v = Math.round(character.needs[k]);
          const fix = ACTIONS[NEED_FALLBACK[k]];
          return (
            <button
              key={k}
              onClick={() => onFix(fix.id)}
              disabled={!!busy}
              className="flex w-full cursor-pointer items-center gap-3 rounded-2xl bg-white/[0.04] px-3 py-2.5 text-left disabled:cursor-default"
            >
              <span className="w-7 text-xl">{NEED_META[k].emoji}</span>
              <span className="w-16 text-sm font-semibold text-slate-200">{NEED_META[k].label}</span>
              <span className="flex flex-1 gap-[3px]">
                {Array.from({ length: 10 }).map((_, i) => (
                  <span
                    key={i}
                    className="h-3 flex-1 rounded-[3px] transition-colors duration-700"
                    style={{ background: i < Math.round(v / 10) ? needColor(v) : "rgba(255,255,255,0.08)", boxShadow: i < Math.round(v / 10) ? `0 0 6px ${needColor(v)}66` : undefined }}
                  />
                ))}
              </span>
              <span className="w-8 text-right font-mono text-sm font-bold tabular-nums" style={{ color: needColor(v) }}>
                {v}
              </span>
              {!busy && <span className="rounded-lg bg-white/10 px-1.5 py-0.5 text-xs">{fix.emoji}</span>}
            </button>
          );
        })}
      </div>
    </Sheet>
  );
}
