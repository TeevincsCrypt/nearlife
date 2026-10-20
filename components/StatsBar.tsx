import type { StateSnapshot } from "@/lib/types";
import { CURRENCY_SYMBOL } from "@/lib/catalog";

export function StatsBar({ snapshot }: { snapshot: StateSnapshot }) {
  const players = snapshot.households.filter((h) => h.kind === "player").length;
  const npcs = snapshot.households.length - players;
  const items = [
    { label: "Player households", value: players },
    { label: "NPC agents", value: npcs },
    { label: "Open listings", value: snapshot.listings.length },
    { label: "Trades", value: snapshot.stats.trades },
    { label: "Volume", value: `${snapshot.stats.volume} ${CURRENCY_SYMBOL}` },
    { label: "NPC buys from players", value: snapshot.stats.npcBuysFromPlayers },
  ];
  return (
    <div className="grid grid-cols-3 gap-2 md:grid-cols-6">
      {items.map((i) => (
        <div key={i.label} className="rounded-xl border bg-white/80 px-3 py-2">
          <div className="text-lg font-bold tabular-nums">{i.value}</div>
          <div className="text-muted-foreground text-[11px]">{i.label}</div>
        </div>
      ))}
    </div>
  );
}
