"use client";

import { useEffect, useState } from "react";
import { CURRENCY_SYMBOL, WORLD_EVENTS, gameClock } from "@/lib/catalog";
import type { ActivityEvent, StateSnapshot } from "@/lib/types";
import { Pill } from "./Sheet";

function moodFace(mood: number) {
  if (mood >= 65) return { face: "☺", color: "#22c55e" };
  if (mood >= 35) return { face: "😐", color: "#eab308" };
  return { face: "☹", color: "#ef4444" };
}

export function Hud({
  snapshot,
  now,
  balance,
  mood,
  onTopUp,
  onTicker,
  showTicker = true,
}: {
  snapshot: StateSnapshot;
  now: number;
  balance: number | null;
  mood: number | null;
  onTopUp: () => void;
  onTicker: () => void;
  showTicker?: boolean;
}) {
  const clock = gameClock(now);
  const h12 = clock.hour % 12 === 0 ? 12 : clock.hour % 12;
  const ampm = clock.hour < 12 ? "AM" : "PM";
  const isDay = clock.hour >= 6 && clock.hour < 19;
  const ev = WORLD_EVENTS.find((e) => e.id === snapshot.worldEvent?.id) ?? WORLD_EVENTS[0];
  const [evOpen, setEvOpen] = useState(false);

  // Ticker: rotate through recent notable events.
  const notable = snapshot.activity.filter((a) => ["purchase", "listing", "join", "system", "price"].includes(a.type)).slice(0, 6);
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setIdx((i) => i + 1), 5000);
    return () => clearInterval(t);
  }, []);
  const tick: ActivityEvent | undefined = notable.length ? notable[idx % notable.length] : undefined;
  const face = mood !== null ? moodFace(mood) : null;

  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-30 flex flex-col items-center gap-2 px-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
      <div className="flex w-full max-w-xl items-center justify-between">
        <Pill>
          <span className="text-lg">{isDay ? "☀️" : "🌙"}</span>
          <span className="text-lg font-bold tabular-nums">
            {h12}:{String(clock.minute).padStart(2, "0")}
          </span>
          <span className="text-xs font-semibold text-slate-300">{ampm}</span>
          {face && (
            <span className="flex size-7 items-center justify-center rounded-full border-2 text-sm font-bold" style={{ borderColor: face.color, color: face.color }}>
              {face.face}
            </span>
          )}
        </Pill>
        {balance !== null && (
          <Pill className="pr-1.5">
            <span className="text-lg font-extrabold tabular-nums">
              {balance.toLocaleString()} <span className="text-xs font-semibold text-slate-300">{CURRENCY_SYMBOL}</span>
            </span>
            <button
              onClick={onTopUp}
              aria-label="Top up"
              className="pointer-events-auto flex size-9 cursor-pointer items-center justify-center rounded-full bg-emerald-500 text-2xl leading-none font-bold text-white active:scale-90"
            >
              +
            </button>
          </Pill>
        )}
      </div>

      <Pill onClick={() => setEvOpen((o) => !o)} className="max-w-[90%]">
        <span>{ev.emoji}</span>
        <span className="font-semibold">{ev.title}</span>
        <span className={`text-xs transition ${evOpen ? "rotate-180" : ""}`}>⌄</span>
      </Pill>
      {evOpen && (
        <div className="pointer-events-auto w-full max-w-md rounded-2xl bg-slate-900/90 px-4 py-3 text-sm text-slate-100 shadow-lg">
          {ev.description}
          {snapshot.worldEvent && <div className="mt-1 text-xs text-slate-400">Changes in {Math.max(0, Math.ceil((snapshot.worldEvent.endsAt - now) / 60000))} min</div>}
        </div>
      )}

      {tick && !evOpen && showTicker && (
        <button
          key={tick.id}
          onClick={onTicker}
          className="ticker-in pointer-events-auto flex w-full max-w-xl cursor-pointer items-center gap-3 rounded-[28px] bg-white/95 px-4 py-3 text-left shadow-xl"
        >
          <span className="text-3xl">{tick.emoji}</span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold text-slate-800">
              {tick.householdName ?? "Neighborhood"} {tick.isNpc ? "· NPC agent" : tick.householdName ? "· player" : ""}
            </span>
            <span className="line-clamp-2 text-sm font-medium text-emerald-700">{tick.text}</span>
          </span>
        </button>
      )}
    </div>
  );
}
