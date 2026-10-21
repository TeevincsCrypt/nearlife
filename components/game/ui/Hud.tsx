"use client";

import { useState } from "react";
import { ITEMS, WORLD_EVENTS, gameClock } from "@/lib/catalog";
import type { CharacterLook, StateSnapshot } from "@/lib/types";
import { Portrait } from "./Portrait";

const DAYS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];

/** Rank by net worth (SimBucks + furniture value). */
export function householdRank(snapshot: StateSnapshot, id?: string | null) {
  const ranked = [...snapshot.households]
    .map((h) => ({ id: h.id, worth: h.balance + h.layout.reduce((s, p) => s + (ITEMS[p.itemId]?.furniture?.storePrice ?? 0), 0) }))
    .sort((a, b) => b.worth - a.worth);
  const i = ranked.findIndex((r) => r.id === id);
  return i < 0 ? null : i + 1;
}

export function SquareButton({ children, onClick, label, gold }: { children: React.ReactNode; onClick?: () => void; label: string; gold?: boolean }) {
  return (
    <button
      aria-label={label}
      onClick={onClick}
      className={`${gold ? "btn-gold" : "btn-blue"} flex size-10 cursor-pointer items-center justify-center rounded-xl text-lg leading-none`}
    >
      {children}
    </button>
  );
}

/** Game top bar: player card, online pill, buttons; then clock + coins; then live ticker. */
export function Hud({
  snapshot,
  now,
  balance,
  name,
  look,
  meId,
  onTopUp,
  onTicker,
  onSettings,
  showTicker = true,
}: {
  snapshot: StateSnapshot;
  now: number;
  balance: number | null;
  name?: string;
  look?: CharacterLook;
  meId?: string | null;
  onTopUp: () => void;
  onTicker: () => void;
  onSettings?: () => void;
  showTicker?: boolean;
}) {
  const clock = gameClock(now);
  const h12 = clock.hour % 12 === 0 ? 12 : clock.hour % 12;
  const isDay = clock.hour >= 6 && clock.hour < 19;
  const ev = WORLD_EVENTS.find((e) => e.id === snapshot.worldEvent?.id) ?? WORLD_EVENTS[0];
  const [evOpen, setEvOpen] = useState(false);
  const online = snapshot.households.filter((h) => now - h.lastActive < 60_000).length;
  const rank = householdRank(snapshot, meId);
  const items = snapshot.activity.filter((a) => ["purchase", "listing", "join", "system", "production", "action"].includes(a.type)).slice(0, 8);

  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-30 flex flex-col items-center">
      {/* Bar */}
      <div className="pointer-events-auto w-full border-b-[3px] border-[#0d1b5e] bg-gradient-to-b from-[#3d6cf2] to-[#2a4ed0] px-3 pt-[max(0.5rem,env(safe-area-inset-top))] pb-2 shadow-[0_4px_0_#0d1b5e]">
        <div className="mx-auto flex max-w-xl items-center gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <div className="rounded-xl border-[3px] border-[#7a3d00] bg-gradient-to-b from-[#ffe46b] to-[#f59e0b] p-0.5 shadow-[0_3px_0_#0d1b5e]">
              <div className="overflow-hidden rounded-lg">
                <Portrait look={look} size={38} />
              </div>
            </div>
            <div className="min-w-0 leading-none">
              <div className="font-display max-w-28 truncate text-[17px] text-stroke">{name ?? "Visitor"}</div>
              {rank && (
                <div className="mt-1 inline-flex items-center gap-1 rounded-md border-2 border-[#0d1b5e] bg-[#0d1b5e]/50 px-1.5 py-0.5 text-[10px] font-black text-[#cfe0ff]">
                  RANK <span className="rounded bg-[#ffd23f] px-1 text-[#7a3d00]">{rank}</span>
                </div>
              )}
            </div>
          </div>
          <div className="mx-auto flex items-center gap-1.5 rounded-xl border-2 border-[#0d1b5e] bg-[#0d1b5e]/55 px-2.5 py-1.5">
            <span className="size-2.5 rounded-full bg-[#3ddc84] shadow-[0_0_6px_#3ddc84]" />
            <span className="font-display text-sm tracking-wide text-[#ffd23f]">ONLINE: {online}</span>
          </div>
          <SquareButton label="Neighborhood event" onClick={() => setEvOpen((o) => !o)}>
            <span className={`text-sm transition ${evOpen ? "rotate-180" : ""}`}>▼</span>
          </SquareButton>
          {onSettings && (
            <SquareButton label="Settings" onClick={onSettings}>
              ⚙
            </SquareButton>
          )}
        </div>
      </div>

      {/* Clock + event + coins */}
      <div className="pointer-events-none mt-2 flex w-full max-w-xl items-center justify-between gap-2 px-3">
        <div className="pointer-events-auto flex items-center gap-1.5 rounded-xl border-[3px] border-[#0d1b5e] bg-gradient-to-b from-[#2d4bd1] to-[#1e36a8] px-2.5 py-1 shadow-[0_3px_0_#0d1b5e]">
          <span>{isDay ? "☀️" : "🌙"}</span>
          <span className="font-display text-lg text-stroke tabular-nums">
            {h12}:{String(clock.minute).padStart(2, "0")}
          </span>
          <span className="flex flex-col text-[9px] leading-[1.1] font-black text-[#cfe0ff]">
            <span>{clock.hour < 12 ? "AM" : "PM"}</span>
            <span>{DAYS[clock.day]}</span>
          </span>
        </div>
        <button
          onClick={() => setEvOpen((o) => !o)}
          className="pointer-events-auto flex min-w-0 cursor-pointer items-center gap-1 rounded-xl border-[3px] border-[#0d1b5e] bg-gradient-to-b from-[#b28cff] to-[#7c4ce0] px-2 py-1 shadow-[0_3px_0_#0d1b5e]"
        >
          <span>{ev.emoji}</span>
          <span className="font-display truncate text-sm text-stroke">{ev.title}</span>
        </button>
        {balance !== null && (
          <div className="pointer-events-auto flex items-center rounded-xl border-[3px] border-[#0d1b5e] bg-gradient-to-b from-[#2d4bd1] to-[#1e36a8] py-0.5 pr-0.5 pl-1.5 shadow-[0_3px_0_#0d1b5e]">
            <span className="flex size-6 items-center justify-center rounded-full border-2 border-[#7a3d00] bg-gradient-to-b from-[#ffe46b] to-[#f59e0b] text-[11px] font-black text-[#7a3d00]">
              S
            </span>
            <span className="font-display mx-1.5 text-lg text-stroke tabular-nums">{balance.toLocaleString()}</span>
            <button onClick={onTopUp} aria-label="Top up" className="btn-gold flex size-7 cursor-pointer items-center justify-center rounded-lg text-lg leading-none">
              +
            </button>
          </div>
        )}
      </div>

      {evOpen && (
        <div className="glass pointer-events-auto mx-3 mt-2 w-[calc(100%-1.5rem)] max-w-xl rounded-2xl px-4 py-3 text-sm">
          <div className="font-display text-lg text-stroke">
            {ev.emoji} {ev.title}
          </div>
          <div className="font-semibold text-[#e6eeff]">{ev.description}</div>
          {snapshot.worldEvent && <div className="mt-1 text-xs font-bold text-[#ffd23f]">Changes in {Math.max(0, Math.ceil((snapshot.worldEvent.endsAt - now) / 60000))} min</div>}
        </div>
      )}

      {showTicker && !evOpen && items.length > 0 && (
        <button
          onClick={onTicker}
          className="pointer-events-auto mx-3 mt-2 flex w-[calc(100%-1.5rem)] max-w-xl cursor-pointer items-center overflow-hidden rounded-xl border-[3px] border-[#0d1b5e] bg-[#0d1b5e]/70 py-1 text-left text-xs"
        >
          <span className="font-display ml-2 shrink-0 rounded-md bg-[#ff5a6e] px-1.5 py-0.5 text-[11px] text-white">LIVE</span>
          <span className="relative ml-1 min-w-0 flex-1 overflow-hidden">
            <span className="marquee inline-flex whitespace-nowrap">
              {[0, 1].map((k) => (
                <span key={k} className="inline-flex">
                  {items.map((a) => (
                    <span key={`${k}${a.id}`} className="px-4 font-bold text-white">
                      {a.emoji} {a.text}
                    </span>
                  ))}
                </span>
              ))}
            </span>
          </span>
        </button>
      )}
    </div>
  );
}
