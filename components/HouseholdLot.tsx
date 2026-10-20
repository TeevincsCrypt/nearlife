import Link from "next/link";
import { CURRENCY_SYMBOL, ROLE_LABEL } from "@/lib/catalog";
import type { HouseholdView } from "@/lib/types";
import { NEED_KEYS } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Plumbob } from "./Plumbob";
import { cn, timeAgo } from "@/lib/utils";

function charMood(c: HouseholdView["characters"][number]) {
  return Math.round(NEED_KEYS.reduce((s, k) => s + c.needs[k], 0) / NEED_KEYS.length);
}

export function presence(h: HouseholdView, now: number) {
  if (h.kind === "npc") return { label: "Autonomous", dot: "bg-violet-500" };
  const age = now - h.lastActive;
  if (age < 60_000) return { label: "Active now", dot: "bg-emerald-500" };
  if (age < 15 * 60_000) return { label: `Active ${timeAgo(h.lastActive, now)}`, dot: "bg-amber-400" };
  return { label: `Away · ${timeAgo(h.lastActive, now)}`, dot: "bg-gray-300" };
}

export function HouseholdLot({ household: h, now, isMine }: { household: HouseholdView; now: number; isMine?: boolean }) {
  const p = presence(h, now);
  return (
    <Link
      href={`/household/${h.id}`}
      className={cn(
        "group block overflow-hidden rounded-xl border bg-white shadow-xs transition hover:-translate-y-0.5 hover:shadow-md",
        isMine && "ring-2 ring-amber-400",
      )}
    >
      <div className="relative h-14" style={{ background: `linear-gradient(135deg, ${h.color}, ${h.color}aa)` }}>
        <div className="absolute inset-x-0 bottom-0 h-3 bg-[repeating-linear-gradient(90deg,#86efac_0_8px,#4ade80_8px_16px)] opacity-70" />
        <div className="absolute left-3 top-2 text-2xl drop-shadow">{h.kind === "npc" ? "🏘️" : "🏠"}</div>
        <div className="absolute right-3 top-2 flex gap-1">
          {isMine && <Badge className="bg-amber-300 text-amber-950">You</Badge>}
          <Badge variant={h.kind === "npc" ? "npc" : "player"}>{h.kind === "npc" ? "NPC agent" : "Player"}</Badge>
        </div>
      </div>
      <div className="p-3">
        <div className="flex items-center justify-between gap-2">
          <div className="truncate font-semibold group-hover:underline">{h.name}</div>
          <div className="text-sm font-semibold tabular-nums">
            {h.balance} <span className="text-muted-foreground text-[11px]">{CURRENCY_SYMBOL}</span>
          </div>
        </div>
        <div className="text-muted-foreground flex items-center gap-1.5 text-[11px]">
          <span className={cn("inline-block size-1.5 rounded-full", p.dot)} />
          {p.label}
          {h.role && <> · {ROLE_LABEL[h.role]}</>}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {h.characters.map((c) => {
            const busy = c.busy && c.busy.until > now ? c.busy : null;
            return (
              <div key={c.id} className="flex flex-col items-center" title={`${c.name}: ${busy ? busy.label : "idle"}`}>
                <Plumbob mood={charMood(c)} size={7} />
                <div className={cn("flex size-9 items-center justify-center rounded-full bg-secondary text-xl", busy && "ring-2 ring-emerald-300")}>
                  {c.avatar}
                </div>
                <div className="mt-0.5 max-w-16 truncate text-[10px]">{c.name}</div>
              </div>
            );
          })}
        </div>
        <div className="text-muted-foreground mt-2 flex justify-between text-[11px]">
          <span>{h.activeListings} listing{h.activeListings === 1 ? "" : "s"}</span>
          <span>mood {h.mood}</span>
        </div>
      </div>
    </Link>
  );
}
