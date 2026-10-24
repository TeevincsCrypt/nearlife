"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { TOWN, CHAT_MAX_LEN, dmChannel, dmPartner, placeChannel } from "@/lib/chat";
import { PLACES, PLACE_BY_ID, whereIs } from "@/lib/places";
import type { Character, ChatMessage, HouseholdView, StateSnapshot } from "@/lib/types";
import { cn, timeAgo } from "@/lib/utils";
import { Portrait } from "./Portrait";

type Act = <T = unknown>(path: string, body?: unknown, method?: "POST" | "DELETE") => Promise<T | null>;

const SEEN_KEY = "nearlife:chat-seen";
export const ONLINE_MS = 2 * 60_000;

/** Last time each chat channel was read on this device. */
export function useChatSeen() {
  const [seen, setSeen] = useState<Record<string, number>>({});
  useEffect(() => {
    try {
      setSeen(JSON.parse(localStorage.getItem(SEEN_KEY) ?? "{}"));
    } catch {}
  }, []);
  const markSeen = useCallback((channel: string, ts: number) => {
    setSeen((prev) => {
      if ((prev[channel] ?? 0) >= ts) return prev;
      const next = { ...prev, [channel]: ts };
      try {
        localStorage.setItem(SEEN_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  }, []);
  return { seen, markSeen };
}

export type ChatSeen = ReturnType<typeof useChatSeen>;

/** The place channel the player's Sim is at right now, if any. */
export function myPlaceChannel(me: HouseholdView | null, now: number) {
  for (const c of me?.characters ?? []) {
    const w = whereIs(c, now);
    if (w.placeId && !w.arriving) return placeChannel(w.placeId);
  }
  return null;
}

/** Unread messages from other players per channel (town, my current place, my DMs). */
export function unreadCounts(chat: ChatMessage[], me: HouseholdView | null, now: number, seen: Record<string, number>) {
  const out: Record<string, number> = {};
  if (!me) return { total: 0, byChannel: out };
  const here = myPlaceChannel(me, now);
  for (const m of chat) {
    if (m.fromHouseholdId === me.id) continue;
    const relevant = m.channel === TOWN || m.channel === here || dmPartner(m.channel, me.id);
    if (!relevant || m.ts <= (seen[m.channel] ?? 0)) continue;
    out[m.channel] = (out[m.channel] ?? 0) + 1;
  }
  // Town chat counts towards the badge, but quietly (max 9) so DMs stand out.
  const total = Object.entries(out).reduce((s, [ch, n]) => s + (ch === TOWN ? Math.min(n, 9) : n), 0);
  return { total, byChannel: out };
}

function speakerLook(households: HouseholdView[], m: ChatMessage) {
  const h = households.find((x) => x.id === m.fromHouseholdId);
  return (h?.characters.find((c) => c.id === m.fromCharacterId) ?? h?.characters[0])?.look;
}

/** Where a household's Sims are, in words ("at 24/7 Club", "on the way to Ref", "at home"). */
export function whereabouts(h: HouseholdView, now: number) {
  for (const c of h.characters) {
    const w = whereIs(c, now);
    if (w.placeId) return { placeId: w.placeId, text: `${w.arriving ? "on the way to" : "at"} ${PLACE_BY_ID[w.placeId]?.short ?? "town"}` };
  }
  return { placeId: null, text: "at home" };
}

function Bubble({ m, mine, households, showWho, onPlace }: { m: ChatMessage; mine: boolean; households: HouseholdView[]; showWho: boolean; onPlace?: (id: string) => void }) {
  const h = households.find((x) => x.id === m.fromHouseholdId);
  if (m.kind === "wave") {
    return (
      <div className="text-center text-xs font-bold text-[#cfe0ff]">
        {m.fromName} {m.text}
      </div>
    );
  }
  const place = m.kind === "invite" && m.placeId ? PLACE_BY_ID[m.placeId] : undefined;
  return (
    <div className={cn("flex items-end gap-2", mine && "flex-row-reverse")}>
      {!mine && <Portrait look={speakerLook(households, m)} size={30} />}
      <div className={cn("max-w-[78%]", mine && "text-right")}>
        {showWho && !mine && (
          <div className="mb-0.5 truncate text-[10px] font-black text-[#cfe0ff]">
            {m.fromName}
            {h && <span className="font-bold text-[#9fb6ff]"> · {h.name}</span>}
          </div>
        )}
        <div
          className={cn(
            "inline-block rounded-2xl border-2 border-[#0d1b5e] px-3 py-1.5 text-left text-sm font-bold break-words",
            mine ? "rounded-br-md bg-gradient-to-b from-[#ffe46b] to-[#f5b90b] text-[#3b2400]" : "rounded-bl-md bg-white text-[#0d1b5e]",
          )}
        >
          {m.text}
          {place && !mine && onPlace && (
            <button onClick={() => onPlace(place.id)} className="btn-gold mt-1.5 block w-full cursor-pointer rounded-xl px-3 py-1 text-xs">
              🚗 Go to {place.short}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/** Scrolling list of messages in one channel, newest at the bottom. */
export function ChatLog({
  messages,
  me,
  households,
  showWho = true,
  onPlace,
  empty,
  className,
}: {
  messages: ChatMessage[];
  me: HouseholdView | null;
  households: HouseholdView[];
  showWho?: boolean;
  onPlace?: (id: string) => void;
  empty: string;
  className?: string;
}) {
  const end = useRef<HTMLDivElement>(null);
  const last = messages[messages.length - 1]?.id;
  useEffect(() => {
    end.current?.scrollIntoView({ block: "end" });
  }, [last]);
  return (
    <div className={cn("space-y-2 overflow-y-auto", className)}>
      {messages.length === 0 && <div className="py-6 text-center text-sm font-bold text-[#cfe0ff]">{empty}</div>}
      {messages.map((m) => (
        <Bubble key={m.id} m={m} mine={m.fromHouseholdId === me?.id} households={households} showWho={showWho} onPlace={onPlace} />
      ))}
      <div ref={end} />
    </div>
  );
}

/** Text box + send button. */
export function ChatInput({
  channel,
  character,
  act,
  placeholder = "Say something…",
  disabled,
  compact,
}: {
  channel: string;
  character: Character | null;
  act: Act;
  placeholder?: string;
  disabled?: boolean;
  compact?: boolean;
}) {
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  async function send() {
    const t = text.trim();
    if (!t || sending) return;
    setSending(true);
    const ok = await act("/api/chat", { channel, text: t, characterId: character?.id });
    setSending(false);
    if (ok) setText("");
  }
  return (
    <form
      className="flex gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        void send();
      }}
    >
      <input
        value={text}
        disabled={disabled}
        onChange={(e) => setText(e.target.value.slice(0, CHAT_MAX_LEN))}
        placeholder={placeholder}
        className={cn("well min-w-0 flex-1 rounded-xl px-3 font-bold text-white outline-none placeholder:text-[#9fb6ff] disabled:opacity-50", compact ? "py-1.5 text-sm" : "py-2.5")}
      />
      <button
        type="submit"
        disabled={disabled || !text.trim() || sending}
        className={cn("btn-gold shrink-0 cursor-pointer rounded-xl disabled:opacity-50", compact ? "px-3 text-sm" : "px-4 text-base")}
      >
        Send
      </button>
    </form>
  );
}

/** The 💬 Chat app on the Pad: town chat, the place you're at, and direct messages. */
export function ChatApp({
  snapshot,
  me,
  character,
  now,
  act,
  toast,
  onPlace,
  chatWith,
  chat,
}: {
  snapshot: StateSnapshot;
  me: HouseholdView | null;
  character: Character | null;
  now: number;
  act: Act;
  toast: (t: string, k?: "info" | "error" | "success") => void;
  onPlace: (placeId: string) => void;
  chatWith?: string | null;
  chat: ChatSeen;
}) {
  const here = myPlaceChannel(me, now);
  const [tab, setTab] = useState<"town" | "here" | "dms">(chatWith ? "dms" : here ? "here" : "town");
  const [dm, setDm] = useState<string | null>(chatWith ?? null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const unread = unreadCounts(snapshot.chat, me, now, chat.seen).byChannel;

  const channel = tab === "town" ? TOWN : tab === "here" ? here : dm && me ? dmChannel(me.id, dm) : null;
  const messages = useMemo(() => (channel ? snapshot.chat.filter((m) => m.channel === channel) : []), [snapshot.chat, channel]);
  const lastTs = messages[messages.length - 1]?.ts ?? 0;
  const { markSeen } = chat;
  useEffect(() => {
    if (channel && lastTs) markSeen(channel, lastTs);
  }, [channel, lastTs, markSeen]);

  if (!me) return <div className="well rounded-2xl p-3 text-sm font-bold text-white">Move in to chat with your neighbors.</div>;

  const others = snapshot.households.filter((h) => h.id !== me.id);
  const online = others.filter((h) => now - h.lastActive < ONLINE_MS);
  const herePlace = here ? PLACE_BY_ID[here.slice(6)] : undefined;
  const dmHousehold = dm ? snapshot.households.find((h) => h.id === dm) : undefined;

  const tabs: Array<{ id: "town" | "here" | "dms"; label: string; badge: number }> = [
    { id: "town", label: "🏙️ Town", badge: unread[TOWN] ?? 0 },
    ...(herePlace ? [{ id: "here" as const, label: `${herePlace.emoji} Here`, badge: unread[here!] ?? 0 }] : []),
    { id: "dms", label: "✉️ Messages", badge: Object.entries(unread).filter(([ch]) => ch.startsWith("dm:")).reduce((s, [, n]) => s + n, 0) },
  ];

  return (
    <div className="flex h-full flex-col gap-2 pt-2">
      <div className="flex gap-1.5">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => {
              setTab(t.id);
              if (t.id !== "dms") setDm(null);
            }}
            className={cn("font-display relative flex-1 cursor-pointer rounded-xl py-2 text-sm", tab === t.id ? "btn-gold" : "well text-white")}
          >
            {t.label}
            {t.badge > 0 && (
              <span className="absolute -top-1.5 -right-1 min-w-5 rounded-full border-2 border-[#0d1b5e] bg-[#ff5a6e] px-1 text-[10px] leading-4 text-white">{t.badge}</span>
            )}
          </button>
        ))}
      </div>

      {tab === "town" && (
        <>
          <div className="well rounded-2xl p-2">
            <div className="mb-1.5 flex items-center gap-1.5 px-1 text-[10px] font-black tracking-widest text-[#cfe0ff]">
              <span className="size-2 rounded-full bg-[#3ddc84]" /> ONLINE NOW · {online.length}
            </div>
            {online.length === 0 ? (
              <div className="px-1 pb-1 text-xs font-bold text-[#9fb6ff]">Nobody else is online. Say hi in town chat, they&apos;ll see it when they log in.</div>
            ) : (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {online.map((h) => {
                  const where = whereabouts(h, now);
                  return (
                    <button
                      key={h.id}
                      onClick={() => {
                        setDm(h.id);
                        setTab("dms");
                      }}
                      className="flex w-[74px] shrink-0 cursor-pointer flex-col items-center gap-0.5 text-center"
                    >
                      <span className="relative">
                        <Portrait look={h.characters[0]?.look} size={44} />
                        <span className="absolute -right-0.5 -bottom-0.5 size-3 rounded-full border-2 border-[#0d1b5e] bg-[#3ddc84]" />
                      </span>
                      <span className="font-display w-full truncate text-[11px] text-stroke">{h.characters[0]?.name ?? h.name}</span>
                      <span className="w-full truncate text-[9px] font-bold text-[#cfe0ff]">{where.text}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
          <ChatLog messages={messages} me={me} households={snapshot.households} onPlace={onPlace} empty="No messages yet. Say hi to the neighborhood 👋" className="min-h-0 flex-1 px-1" />
          <ChatInput channel={TOWN} character={character} act={act} placeholder="Message everyone in town…" />
        </>
      )}

      {tab === "here" && herePlace && (
        <>
          <div className="well rounded-2xl px-3 py-2 text-xs font-bold text-[#cfe0ff]">
            Chatting with everyone at <span className="text-[#ffd23f]">{herePlace.name}</span>. Your messages pop up over your Sim.
          </div>
          <ChatLog messages={messages} me={me} households={snapshot.households} empty={`Nobody has said anything at ${herePlace.short} yet.`} className="min-h-0 flex-1 px-1" />
          <ChatInput channel={here!} character={character} act={act} placeholder={`Talk to people at ${herePlace.short}…`} />
        </>
      )}

      {tab === "dms" && !dmHousehold && (
        <div className="min-h-0 flex-1 space-y-2 overflow-y-auto">
          {others.length === 0 && <div className="well rounded-2xl p-3 text-sm font-bold text-white">No neighbors yet. Share the link so friends can move in.</div>}
          {[...others]
            .sort((a, b) => {
              const la = snapshot.chat.filter((m) => m.channel === dmChannel(me.id, a.id)).at(-1)?.ts ?? 0;
              const lb = snapshot.chat.filter((m) => m.channel === dmChannel(me.id, b.id)).at(-1)?.ts ?? 0;
              return lb - la || b.lastActive - a.lastActive;
            })
            .map((h) => {
              const ch = dmChannel(me.id, h.id);
              const last = snapshot.chat.filter((m) => m.channel === ch).at(-1);
              const isOnline = now - h.lastActive < ONLINE_MS;
              const n = unread[ch] ?? 0;
              return (
                <button key={h.id} onClick={() => setDm(h.id)} className="well flex w-full cursor-pointer items-center gap-3 rounded-2xl p-2.5 text-left">
                  <span className="relative">
                    <Portrait look={h.characters[0]?.look} size={40} />
                    <span className={cn("absolute -right-0.5 -bottom-0.5 size-3 rounded-full border-2 border-[#0d1b5e]", isOnline ? "bg-[#3ddc84]" : "bg-slate-500")} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="font-display block truncate text-base text-stroke">{h.name}</span>
                    <span className="block truncate text-xs font-bold text-[#cfe0ff]">
                      {last ? `${last.fromHouseholdId === me.id ? "You: " : ""}${last.text}` : isOnline ? `Online · ${whereabouts(h, now).text}` : `Seen ${timeAgo(h.lastActive, now)}`}
                    </span>
                  </span>
                  {n > 0 && <span className="min-w-6 rounded-full border-2 border-[#0d1b5e] bg-[#ff5a6e] px-1.5 text-center text-xs font-black text-white">{n}</span>}
                </button>
              );
            })}
        </div>
      )}

      {tab === "dms" && dmHousehold && (
        <>
          <div className="well flex items-center gap-2 rounded-2xl p-2">
            <button onClick={() => setDm(null)} className="btn-blue flex size-8 cursor-pointer items-center justify-center rounded-lg text-sm" aria-label="All messages">
              ←
            </button>
            <Portrait look={dmHousehold.characters[0]?.look} size={32} />
            <span className="min-w-0 flex-1">
              <span className="font-display block truncate text-base leading-tight text-stroke">{dmHousehold.name}</span>
              <span className="block truncate text-[10px] font-bold text-[#cfe0ff]">
                {now - dmHousehold.lastActive < ONLINE_MS ? `🟢 online · ${whereabouts(dmHousehold, now).text}` : `seen ${timeAgo(dmHousehold.lastActive, now)}`}
              </span>
            </span>
            {whereabouts(dmHousehold, now).placeId && (
              <button onClick={() => onPlace(whereabouts(dmHousehold, now).placeId!)} className="btn-blue cursor-pointer rounded-lg px-2 py-1 text-xs">
                Join
              </button>
            )}
            <button onClick={() => setInviteOpen((o) => !o)} className="btn-gold cursor-pointer rounded-lg px-2 py-1 text-xs">
              📍 Invite
            </button>
          </div>
          {inviteOpen && (
            <div className="well max-h-40 space-y-1 overflow-y-auto rounded-2xl p-2">
              <div className="px-1 text-[10px] font-black tracking-widest text-[#cfe0ff]">MEET AT…</div>
              {[...PLACES].sort((a, b) => (a.id === here?.slice(6) ? -1 : b.id === here?.slice(6) ? 1 : a.own ? -1 : b.own ? 1 : 0)).map((p) => (
                <button
                  key={p.id}
                  onClick={async () => {
                    const ok = await act("/api/chat", { kind: "invite", toHouseholdId: dmHousehold.id, placeId: p.id, characterId: character?.id });
                    if (ok) {
                      toast(`📍 Invited ${dmHousehold.name} to ${p.short}`, "success");
                      setInviteOpen(false);
                    }
                  }}
                  className="flex w-full cursor-pointer items-center gap-2 rounded-xl px-2 py-1.5 text-left text-sm font-bold text-white hover:bg-white/10"
                >
                  <span>{p.emoji}</span>
                  <span className="flex-1 truncate">{p.name}</span>
                  {p.id === here?.slice(6) && <span className="text-[10px] text-[#ffd23f]">you&apos;re here</span>}
                </button>
              ))}
            </div>
          )}
          <ChatLog messages={messages} me={me} households={snapshot.households} showWho={false} onPlace={onPlace} empty={`Say hi to ${dmHousehold.name} 👋`} className="min-h-0 flex-1 px-1" />
          <ChatInput channel={dmChannel(me.id, dmHousehold.id)} character={character} act={act} placeholder={`Message ${dmHousehold.name}…`} />
        </>
      )}
    </div>
  );
}
