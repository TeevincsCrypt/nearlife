"use client";

import { useState } from "react";
import { BrandIcon } from "./BrandIcon";
import { CURRENCY_SYMBOL } from "@/lib/catalog";
import { placeChannel } from "@/lib/chat";
import { whereIs, type PlaceDef } from "@/lib/places";
import type { Character, ChatMessage, HouseholdView } from "@/lib/types";
import { ChatInput } from "./Chat";
import { AnchoredLabel } from "../three/anchors";
import { simsInside } from "../three/PlaceInterior";
import { Portrait } from "./Portrait";

type Act = <T = unknown>(path: string, body?: unknown, method?: "POST" | "DELETE") => Promise<T | null>;

/** How long a chat message stays up as a speech bubble over the Sim who said it. */
const BUBBLE_MS = 9000;

/** Tappable station labels, Sim name tags and speech bubbles inside a place. */
export function InsideLabels({
  place,
  households,
  now,
  chat,
  meId,
  onStation,
  onSim,
}: {
  place: PlaceDef;
  households: HouseholdView[];
  now: number;
  chat: ChatMessage[];
  meId?: string;
  onStation: (actionId: string) => void;
  onSim: (c: Character, h: HouseholdView) => void;
}) {
  const sims = simsInside(place, households, now);
  const channel = placeChannel(place.id);
  const said = new Map<string, ChatMessage>();
  for (const m of chat) if (m.channel === channel && m.fromCharacterId && now - m.ts < BUBBLE_MS) said.set(m.fromCharacterId, m);
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {place.actions.map((a) => (
        <AnchoredLabel key={a.id} id={`st:${a.id}`}>
          <button
            onClick={() => onStation(a.id)}
            className="font-display pointer-events-auto flex cursor-pointer items-center gap-1.5 rounded-xl border-[3px] border-[#0d1b5e] py-1 pr-2.5 pl-1 text-xs whitespace-nowrap text-white shadow-[0_3px_0_#0d1b5e] [-webkit-text-stroke:0.75px_#0d1b5e] [paint-order:stroke_fill]"
            style={{ background: "linear-gradient(180deg,#3d6cf2,#2a4ed0)" }}
          >
            <span className="flex size-6 items-center justify-center rounded-lg border-2 border-[#0d1b5e] text-sm" style={{ background: place.color }}>{a.emoji}</span>
            {a.label}
            {a.cost > 0 && (
              <span className="rounded-md bg-[#0d1b5e]/60 px-1 text-[10px] text-[#ffd23f] [-webkit-text-stroke:0]">
                {a.cost} {CURRENCY_SYMBOL}
              </span>
            )}
          </button>
        </AnchoredLabel>
      ))}
      {sims.map(({ c, h }) => {
        const b = c.busy && c.busy.until > now ? c.busy : null;
        const act = b ? place.actions.find((a) => a.id === b.action.split(":")[2]) : null;
        return (
          <AnchoredLabel key={c.id} id={`pc:${c.id}`}>
            <div className="flex flex-col items-center gap-1">
              {said.get(c.id) && (
                <div className="relative max-w-[200px] rounded-2xl border-[3px] border-[#0d1b5e] bg-white px-2.5 py-1 text-center text-xs font-bold break-words text-[#0d1b5e] shadow-[0_3px_0_#0d1b5e]">
                  {said.get(c.id)!.kind === "wave" ? "👋" : said.get(c.id)!.text}
                  <span className="absolute -bottom-[7px] left-1/2 size-3 -translate-x-1/2 rotate-45 border-r-[3px] border-b-[3px] border-[#0d1b5e] bg-white" />
                </div>
              )}
              <button
                onClick={() => onSim(c, h)}
                className={`pointer-events-auto flex cursor-pointer items-center gap-1 rounded-lg px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap ${h.id === meId ? "glass" : "btn-gold"}`}
              >
                {act && <span>{act.emoji}</span>}
                {c.name}
                <span className={h.id === meId ? "text-slate-400" : "text-[#7a3d00]"}>· {h.id === meId ? "you" : h.name}</span>
                {b && <span className="font-mono">{Math.ceil((b.until - now) / 1000)}s</span>}
              </button>
            </div>
          </AnchoredLabel>
        );
      })}
    </div>
  );
}

/** Bottom card while inside a place. */
export function InsidePanel({
  place,
  households,
  now,
  character,
  chat,
  meId,
  act,
  onHome,
  onCity,
  onAll,
}: {
  place: PlaceDef;
  households: HouseholdView[];
  now: number;
  character: Character | null;
  chat: ChatMessage[];
  meId?: string;
  act: Act;
  onHome: () => void;
  onCity: () => void;
  onAll: () => void;
}) {
  const [chatOpen, setChatOpen] = useState(false);
  const sims = simsInside(place, households, now);
  const busyHere = character?.busy && character.busy.until > now && character.busy.place === place.id ? character.busy : null;
  const w = character ? whereIs(character, now) : null;
  const arriving = w?.placeId === place.id && w.arriving;
  const here = w?.placeId === place.id && !w.arriving;
  const channel = placeChannel(place.id);
  const recent = chat.filter((m) => m.channel === channel).slice(-3);
  const others = sims.filter(({ h }) => h.id !== meId).length;
  const status = !character
    ? "Move in to visit places."
    : arriving
      ? `${character.name} is on the way… ${Math.ceil(((busyHere!.arriveAt ?? now) - now) / 1000)}s`
      : busyHere
        ? `${character.name} is ${busyHere.label} · ${Math.ceil((busyHere!.until - now) / 1000)}s`
        : here
          ? `${character.name} is here. Tap a station to do something.`
          : `${character.name} isn't here yet. Travel here to join in.`;
  return (
    <div className="glass-strong pointer-events-auto absolute inset-x-2 top-[calc(max(0.6rem,env(safe-area-inset-top))+7rem)] z-30 mx-auto max-w-xl rounded-2xl p-2.5">
      <div className="flex items-center gap-3">
        <BrandIcon id={place.id} emoji={place.emoji} size={36} radius={12} className="border-[3px] border-[#0d1b5e] text-lg" />
        <div className="min-w-0 flex-1">
          <div className="text-[10px] font-black tracking-[0.2em] text-[#ffd23f]">
            INSIDE
          </div>
          <div className="font-display truncate text-lg leading-tight text-stroke">{place.name}</div>
        </div>
        {sims.length > 0 && (
          <div className="flex -space-x-2">
            {sims.slice(0, 4).map(({ c }) => (
              <Portrait key={c.id} look={c.look} size={28} />
            ))}
          </div>
        )}
      </div>
      <div className="mt-1 text-xs text-slate-300">{status}</div>
      <div className="mt-2 flex gap-2">
        <button onClick={onCity} className="btn-blue cursor-pointer rounded-xl px-3 py-1.5 text-xs">
          ← City
        </button>
        <button onClick={onAll} className={`${here ? "btn-blue" : "btn-gold"} flex-1 cursor-pointer rounded-xl py-1.5 text-xs`}>
          {here ? "All activities" : arriving ? "On the way…" : "🚗 Travel here"}
        </button>
        <button onClick={() => setChatOpen((o) => !o)} className="btn-blue relative cursor-pointer rounded-xl px-3 py-1.5 text-xs">
          💬 {others > 0 ? others : ""}
        </button>
        {here && !busyHere && (
          <button onClick={onHome} className="btn-gold cursor-pointer rounded-xl px-3 py-1.5 text-xs">
            🏠 Home
          </button>
        )}
      </div>
      {chatOpen && (
        <div className="mt-2 space-y-1.5">
          {recent.length === 0 ? (
            <div className="text-[11px] font-bold text-[#cfe0ff]">{others ? "Say hi to whoever is here 👋" : "Nobody else is here yet. Invite a friend from 💬 Chat."}</div>
          ) : (
            recent.map((m) => (
              <div key={m.id} className="truncate text-xs text-white">
                <span className="font-black text-[#ffd23f]">{m.fromHouseholdId === meId ? "You" : m.fromName}:</span> {m.kind === "wave" ? m.text : m.text}
              </div>
            ))
          )}
          <ChatInput channel={channel} character={character} act={act} compact disabled={!here} placeholder={here ? "Say something…" : "Arrive to chat here"} />
        </div>
      )}
    </div>
  );
}
