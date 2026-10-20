"use client";

import { useState } from "react";
import { CURRENCY_SYMBOL, WORLD_EVENTS, gameClock } from "@/lib/catalog";
import type { StateSnapshot } from "@/lib/types";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/** Single status strip across the top, with a scrolling live ticker under it. */
export function Hud({
  snapshot,
  now,
  balance,
  onTopUp,
  onTicker,
  showTicker = true,
}: {
  snapshot: StateSnapshot;
  now: number;
  balance: number | null;
  onTopUp: () => void;
  onTicker: () => void;
  showTicker?: boolean;
}) {
  const clock = gameClock(now);
  const h12 = clock.hour % 12 === 0 ? 12 : clock.hour % 12;
  const isDay = clock.hour >= 6 && clock.hour < 19;
  const ev = WORLD_EVENTS.find((e) => e.id === snapshot.worldEvent?.id) ?? WORLD_EVENTS[0];
  const [evOpen, setEvOpen] = useState(false);
  const items = snapshot.activity.filter((a) => ["purchase", "listing", "join", "system", "production"].includes(a.type)).slice(0, 8);

  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-30 flex flex-col items-center gap-1.5 px-2.5 pt-[max(0.6rem,env(safe-area-inset-top))]">
      <div className="glass pointer-events-auto flex w-full max-w-xl items-center gap-2 rounded-2xl px-3 py-2 shadow-xl">
        <div className="flex items-baseline gap-1.5">
          <span className={isDay ? "text-amber-300" : "text-indigo-300"}>{isDay ? "☀" : "☾"}</span>
          <span className="font-mono text-lg font-bold tabular-nums text-white">
            {h12}:{String(clock.minute).padStart(2, "0")}
          </span>
          <span className="text-[11px] font-semibold text-slate-400">
            {clock.hour < 12 ? "AM" : "PM"} · {DAYS[clock.day]}
          </span>
        </div>
        <button
          onClick={() => setEvOpen((o) => !o)}
          className="mx-auto flex min-w-0 cursor-pointer items-center gap-1.5 rounded-xl bg-white/5 px-2.5 py-1 text-sm font-semibold text-slate-100"
        >
          <span>{ev.emoji}</span>
          <span className="truncate">{ev.title}</span>
          <span className={`text-[10px] text-slate-400 transition ${evOpen ? "rotate-180" : ""}`}>▼</span>
        </button>
        {balance !== null && (
          <div className="flex items-center gap-1.5">
            <span className="font-mono text-lg font-bold tabular-nums neon-text">
              {balance.toLocaleString()}
              <span className="ml-0.5 text-[10px] font-semibold text-slate-400">{CURRENCY_SYMBOL}</span>
            </span>
            <button
              onClick={onTopUp}
              aria-label="Top up"
              className="btn-neon flex size-8 cursor-pointer items-center justify-center rounded-xl text-xl leading-none font-black active:scale-90"
            >
              +
            </button>
          </div>
        )}
      </div>

      {evOpen && (
        <div className="glass pointer-events-auto w-full max-w-xl rounded-2xl px-4 py-3 text-sm">
          <div className="font-semibold text-white">
            {ev.emoji} {ev.title}
          </div>
          <div className="text-slate-300">{ev.description}</div>
          {snapshot.worldEvent && <div className="mt-1 text-xs text-slate-500">Changes in {Math.max(0, Math.ceil((snapshot.worldEvent.endsAt - now) / 60000))} min</div>}
        </div>
      )}

      {showTicker && !evOpen && items.length > 0 && (
        <button onClick={onTicker} className="glass pointer-events-auto flex w-full max-w-xl cursor-pointer items-center overflow-hidden rounded-xl py-1.5 text-left text-xs">
          <span className="ml-2.5 shrink-0 rounded-md bg-[#00ec97]/15 px-1.5 py-0.5 font-mono text-[10px] font-bold tracking-wider text-[#00ec97]">LIVE</span>
          <span className="relative min-w-0 flex-1 overflow-hidden">
            <span className="marquee inline-flex whitespace-nowrap">
              {[0, 1].map((k) => (
                <span key={k} className="inline-flex">
                  {items.map((a) => (
                    <span key={`${k}${a.id}`} className="px-4 text-slate-200">
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
