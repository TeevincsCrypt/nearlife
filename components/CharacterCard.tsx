"use client";

import { ACTIONS, ITEMS } from "@/lib/catalog";
import type { Character } from "@/lib/types";
import { NEED_KEYS } from "@/lib/types";
import { NeedsBar } from "./NeedsBar";
import { Plumbob, moodLabel } from "./Plumbob";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

function mood(c: Character) {
  return Math.round(NEED_KEYS.reduce((s, k) => s + c.needs[k], 0) / NEED_KEYS.length);
}

const CARE = ["rest", "eat_home", "shower", "socialize", "play"];
const PRODUCE = ["work", "cook", "brew", "host_party", "game_night", "run_spa", "craft"];

export function CharacterCard({
  character,
  now,
  controllable,
  inventory,
  balance,
  onAction,
  onUse,
  showThought,
}: {
  character: Character;
  now: number;
  controllable: boolean;
  inventory?: Record<string, number>;
  balance?: number;
  onAction?: (actionId: string) => void;
  onUse?: (itemId: string) => void;
  showThought?: boolean;
}) {
  const m = mood(character);
  const busy = character.busy && character.busy.until > now ? character.busy : null;
  const busyPct = busy ? ((now - busy.startedAt) / (busy.until - busy.startedAt)) * 100 : 0;
  const usable = Object.entries(inventory ?? {}).filter(([id, q]) => q > 0 && ITEMS[id]?.effects);

  return (
    <div className="rounded-xl border bg-white/80 p-4 shadow-xs">
      <div className="flex items-center gap-3">
        <div className="relative flex flex-col items-center">
          <Plumbob mood={m} size={10} />
          <div className="mt-0.5 flex size-12 items-center justify-center rounded-full bg-secondary text-3xl">{character.avatar}</div>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <span className="font-semibold">{character.name}</span>
            <span className="text-muted-foreground text-xs">
              {moodLabel(m)} · {m}
            </span>
          </div>
          {busy ? (
            <div className="mt-1">
              <div className="text-xs text-emerald-700">
                {busy.itemId ? ITEMS[busy.itemId]?.emoji : ACTIONS[busy.action]?.emoji} {busy.label}… {Math.ceil((busy.until - now) / 1000)}s
              </div>
              <Progress value={busyPct} className="mt-1 h-1.5" indicatorClassName="bg-emerald-400" />
            </div>
          ) : (
            <div className="text-muted-foreground text-xs">Idle</div>
          )}
        </div>
      </div>

      {showThought && character.thought && (
        <div className="mt-3 rounded-md bg-violet-50 px-2.5 py-1.5 text-xs text-violet-800">🤖 {character.thought}</div>
      )}

      <div className="mt-3 space-y-1.5">
        {NEED_KEYS.map((k) => (
          <NeedsBar key={k} need={k} value={character.needs[k]} />
        ))}
      </div>

      {controllable && (
        <div className="mt-4 space-y-2">
          <div className="text-muted-foreground text-[11px] font-medium uppercase tracking-wide">Take care</div>
          <div className="flex flex-wrap gap-1.5">
            {CARE.map((id) => {
              const a = ACTIONS[id];
              return (
                <Button key={id} size="sm" variant="outline" disabled={!!busy || (balance ?? 0) < a.cost} title={a.help} onClick={() => onAction?.(id)}>
                  {a.emoji} {a.label}
                  {a.cost ? <span className="text-muted-foreground">{a.cost}</span> : null}
                </Button>
              );
            })}
          </div>
          <div className="text-muted-foreground text-[11px] font-medium uppercase tracking-wide">Earn & make things to sell</div>
          <div className="flex flex-wrap gap-1.5">
            {PRODUCE.map((id) => {
              const a = ACTIONS[id];
              return (
                <Button
                  key={id}
                  size="sm"
                  variant={id === "work" ? "default" : "secondary"}
                  disabled={!!busy || (balance ?? 0) < a.cost}
                  title={a.help}
                  onClick={() => onAction?.(id)}
                >
                  {a.emoji} {a.label}
                  {a.cost ? <span className="opacity-60">{a.cost}</span> : null}
                </Button>
              );
            })}
          </div>
          {usable.length > 0 && (
            <>
              <div className="text-muted-foreground text-[11px] font-medium uppercase tracking-wide">Use from inventory</div>
              <div className="flex flex-wrap gap-1.5">
                {usable.map(([id, q]) => (
                  <Button key={id} size="sm" variant="outline" disabled={!!busy} className={cn("border-emerald-200")} onClick={() => onUse?.(id)}>
                    {ITEMS[id].emoji} {ITEMS[id].name} ×{q}
                  </Button>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
