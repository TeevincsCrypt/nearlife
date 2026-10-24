"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { useToast } from "@/components/toaster";
import { useGame } from "@/hooks/use-game";
import { ACTIONS, CURRENCY_SYMBOL, ITEMS, NEED_META, WORLD_EVENTS, gameClock } from "@/lib/catalog";
import { canPlace } from "@/lib/layout";
import type { PlacedFurniture } from "@/lib/types";
import { NEED_KEYS } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Projector } from "./three/anchors";
import { PLACE_BY_ID, TRAVEL, whereIs } from "@/lib/places";
import { dmPartner } from "@/lib/chat";
import type { Character, HouseholdView } from "@/lib/types";
import { City, housePosition, type Landmark, type Trip } from "./three/City";
import { PlaceSheet } from "./ui/PlaceSheet";
import { PlaceInterior } from "./three/PlaceInterior";
import { InsideLabels, InsidePanel } from "./ui/InsideOverlay";
import { RealTxProvider } from "./ui/RealMode";
import { Room, charMood, moodColor, type Placement } from "./three/Room";
import { Scene } from "./three/Scene";
import { Catalogue } from "./ui/Catalogue";
import { CreateHousehold } from "./ui/CreateHousehold";
import { FurnitureMenu } from "./ui/FurnitureMenu";
import { Hud } from "./ui/Hud";
import { CharacterBubbles, CityMarkers } from "./ui/Markers";
import { NeedsSheet, needColor } from "./ui/NeedsSheet";
import { Phone, type AppId } from "./ui/Phone";
import { Portrait } from "./ui/Portrait";
import { GlassButton, Sheet } from "./ui/Sheet";
import { ONLINE_MS, unreadCounts, useChatSeen, whereabouts } from "./ui/Chat";
import { TopUpSheet } from "./ui/TopUpSheet";
import { Welcome } from "./ui/Welcome";

type View = "home" | "map" | "visit" | "place";

/** Local clock that stays in sync with the server between polls. */
function useNow(serverNow?: number) {
  const [offset, setOffset] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (serverNow) setOffset(serverNow - Date.now());
  }, [serverNow]);
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(t);
  }, []);
  return [now + offset, offset] as const;
}

function HexButton({ active, onClick, icon, label, badge }: { active: boolean; onClick: () => void; icon: string; label: string; badge?: number }) {
  return (
    <button onClick={onClick} className="relative flex cursor-pointer flex-col items-center gap-0.5 active:translate-y-0.5" aria-label={label}>
      <span className="hex-btn" data-active={active}>
        <span className="text-[26px] leading-none drop-shadow-[0_2px_0_rgba(13,27,94,0.6)]">{icon}</span>
      </span>
      {!!badge && (
        <span className="font-display absolute -top-1 -right-1 z-10 min-w-5 rounded-full border-2 border-[#0d1b5e] bg-[#ff5a6e] px-1 text-center text-[11px] leading-4 text-white">
          {badge > 99 ? "99+" : badge}
        </span>
      )}
      <span className="font-display text-[11px] leading-none text-stroke">{label}</span>
    </button>
  );
}

export default function Game() {
  const auth = useAuth();
  const toast = useToast();
  const { snapshot, myHousehold, act, refresh } = useGame();
  const [now, clockOffset] = useNow(snapshot?.now);

  const [view, setView] = useState<View>("home");
  const [buyMode, setBuyMode] = useState(false);
  const [catalogueOpen, setCatalogueOpen] = useState(true);
  const [visitId, setVisitId] = useState<string | null>(null);
  const [selCharId, setSelCharId] = useState<string | null>(null);
  const [placement, setPlacement] = useState<(Placement & { mode: "buy" | "place" | "move" }) | null>(null);
  const [selFurn, setSelFurn] = useState<string | null>(null);
  const [menuFurn, setMenuFurn] = useState<PlacedFurniture | null>(null);
  const [phone, setPhone] = useState<AppId | "home" | null>(null);
  const [sheet, setSheet] = useState<"needs" | "topup" | null>(null);
  const [walkTo, setWalkTo] = useState<[number, number] | null>(null);
  const [placeId, setPlaceId] = useState<string | null>(null);
  const [insideId, setInsideId] = useState<string | null>(null);
  const [highlight, setHighlight] = useState<string | undefined>(undefined);
  const [arrival, setArrival] = useState<{ placeId: string; charId: string } | null>(null);
  const [simMenu, setSimMenu] = useState<{ c: Character; h: HouseholdView } | null>(null);
  const [chatWith, setChatWith] = useState<string | null>(null);
  const chat = useChatSeen();

  const me = myHousehold;
  const effectiveView: View = !me && view === "home" ? "map" : view;
  const visited = visitId ? (snapshot?.households.find((h) => h.id === visitId) ?? null) : null;
  const roomHousehold = effectiveView === "visit" ? visited : effectiveView === "home" ? me : null;
  const character = me?.characters.find((c) => c.id === selCharId) ?? me?.characters[0] ?? null;
  const ev = WORLD_EVENTS.find((e) => e.id === snapshot?.worldEvent?.id) ?? WORLD_EVENTS[0];
  const clock = gameClock(now);
  const latestTrade = useMemo(() => snapshot?.activity.find((a) => a.type === "purchase"), [snapshot?.activity]);
  const unread = snapshot ? unreadCounts(snapshot.chat, me, now, chat.seen).total : 0;
  const trip = character?.busy?.action.startsWith("travel:") && character.busy.place && (character.busy.arriveAt ?? 0) > now ? character.busy : null;

  // After a trip: once the Sim arrives, offer to go inside.
  useEffect(() => {
    if (!arrival || !me) return;
    const c = me.characters.find((x) => x.id === arrival.charId);
    if (!c) return setArrival(null);
    const w = whereIs(c, now);
    if (w.placeId !== arrival.placeId) {
      if (!w.arriving) setArrival(null);
      return;
    }
    if (w.arriving) return;
    const place = PLACE_BY_ID[arrival.placeId];
    toast(`📍 ${c.name} arrived at ${place.short}`, "success");
    setArrival(null);
    if (!(view === "place" && insideId === place.id)) {
      setSheet(null);
      setPlaceId(place.id);
    }
  }, [arrival, me, now, view, insideId, toast]);

  // Pop up direct messages and invites from other players as they arrive.
  const seenMsg = useRef<number | null>(null);
  useEffect(() => {
    if (!snapshot || !me) return;
    const latest = snapshot.chat.at(-1)?.ts ?? 0;
    if (seenMsg.current === null) {
      seenMsg.current = latest;
      return;
    }
    const fresh = snapshot.chat.filter((m) => m.ts > seenMsg.current! && m.fromHouseholdId !== me.id && dmPartner(m.channel, me.id));
    seenMsg.current = Math.max(seenMsg.current, latest);
    if (phone === "chat") return;
    for (const m of fresh.slice(-2)) toast(m.kind === "invite" ? `📍 ${m.fromName}: ${m.text} (open 💬 Chat)` : `💬 ${m.fromName}: ${m.text}`);
  }, [snapshot, me, phone, toast]);

  // Keep progress with the login: carry a guest household over, and use the player's own wallet.
  const synced = useRef({ guest: false, wallet: false });
  const [linking, setLinking] = useState(false);
  useEffect(() => {
    if (auth.method !== "privy" || !snapshot?.me) return;
    if (auth.savedGuestId && !synced.current.guest) {
      synced.current.guest = true;
      setLinking(true);
      void (async () => {
        try {
          const res = await fetch("/api/account/link", {
            method: "POST",
            headers: { "content-type": "application/json", ...(await auth.authHeaders()), "x-guest-id": auth.savedGuestId! },
            body: JSON.stringify({ nearAccountId: auth.nearAddress ?? undefined }),
          });
          const json = await res.json();
          if (res.ok) {
            if (json.snapshot) await refresh(json.snapshot, { revalidate: false });
            if (json.result?.merged) toast("Your guest progress is now saved to your account", "success");
            if (!json.result?.conflict) auth.forgetGuest();
          }
        } finally {
          setLinking(false);
        }
      })();
      return;
    }
    if (me && me.accountSource === "derived" && auth.nearAddress && !synced.current.wallet) {
      synced.current.wallet = true;
      void act<{ migrated: boolean }>("/api/account/link", { nearAccountId: auth.nearAddress }).then((r) => {
        if (r?.migrated) toast("🔐 Your household now uses your own NEAR wallet", "success");
      });
    }
  }, [auth, snapshot?.me, me, act, refresh, toast]);

  // Tell the owner (once) when the server isn't saving the world anywhere.
  const warned = useRef(false);
  useEffect(() => {
    if (!snapshot || warned.current || snapshot.config.storage !== "memory") return;
    warned.current = true;
    if (!/^(localhost|127\.|0\.0\.0\.0)/.test(window.location.hostname)) toast("⚠️ This server has no database yet, so progress resets when it restarts (see Pad → About)", "error");
  }, [snapshot, toast]);
  // Every Sim currently travelling to / at a city place, from any household (shared world).
  const trips = useMemo(() => {
    if (!snapshot) return [] as Array<Trip & { label: string }>;
    const out: Array<Trip & { label: string }> = [];
    for (const h of snapshot.households) {
      const from = housePosition(snapshot.households, h.id);
      if (!from) continue;
      for (const c of h.characters) {
        const b = c.busy;
        const place = b?.place ? PLACE_BY_ID[b.place] : undefined;
        if (!b || !place || b.until <= snapshot.now) continue;
        out.push({
          id: c.id,
          mode: b.travel ?? "car",
          from,
          to: place.pos,
          start: b.startedAt,
          arrive: b.arriveAt ?? b.startedAt,
          until: b.until,
          color: h.color,
          label: `${c.name} → ${place.short}`,
        });
      }
    }
    return out;
  }, [snapshot]);

  useEffect(() => {
    if (!walkTo) return;
    const t = setTimeout(() => setWalkTo(null), 10_000);
    return () => clearTimeout(t);
  }, [walkTo]);

  function goto(v: View) {
    setView(v);
    setBuyMode(false);
    setPlacement(null);
    setSelFurn(null);
    setMenuFurn(null);
    setSheet(null);
    setPlaceId(null);
  }

  function visit(id: string) {
    if (id === me?.id) return goto("home");
    setVisitId(id);
    goto("visit");
  }

  async function doAction(actionId: string, furnitureUid?: string) {
    if (!character) return;
    const ok = await act("/api/action", { characterId: character.id, action: actionId, furnitureUid });
    if (ok) toast(`${ACTIONS[actionId].emoji} ${character.name} is ${ACTIONS[actionId].verb}`);
  }

  async function confirmPlacement() {
    if (!placement || !me) return;
    const { mode, itemId, x, z, rot, uid } = placement;
    const body = mode === "move" ? { op: "move", uid, x, z, rot } : { op: mode, itemId, x, z, rot };
    const ok = await act("/api/furniture", body);
    if (ok) {
      if (mode === "buy") toast(`${ITEMS[itemId].emoji} ${ITEMS[itemId].name} placed`, "success");
      setPlacement(null);
      setSelFurn(null);
      setCatalogueOpen(true);
    }
  }

  async function onCreate(body: unknown) {
    const b = body as { join?: string };
    const res = b.join
      ? await act<{ householdId: string }>("/api/household/join", { householdId: b.join, displayName: auth.displayName })
      : await act<{ householdId: string }>("/api/household", body);
    if (res) {
      toast("Welcome home. Tap furniture to use it.", "success");
      goto("home");
    }
  }

  function onLandmark(l: Landmark) {
    if (l === "market") setPhone("market");
    else if (l === "office") setPhone("jobs");
    else if (character) void doAction("socialize");
    else toast("Move in first to meet the neighbors");
  }

  if (!snapshot) {
    return (
      <div className="flex h-dvh items-center justify-center game-bg font-display text-2xl text-gold [-webkit-text-stroke:2px_#0d1b5e]">LOADING NEARLIFE…</div>
    );
  }

  const insidePlace = effectiveView === "place" && insideId ? PLACE_BY_ID[insideId] : undefined;
  const sceneKind = roomHousehold ? "room" : insidePlace ? "interior" : "city";

  function enterPlace(id: string) {
    goto("place");
    setInsideId(id);
  }

  /** Tap on a station inside a building: act right away if the Sim is already here, else pick travel. */
  async function onStation(actionId: string) {
    if (!insidePlace) return;
    const w = character ? whereIs(character, now) : null;
    if (character && !w!.busy && w!.placeId === insidePlace.id) {
      const a = insidePlace.actions.find((x) => x.id === actionId);
      const ok = await act("/api/place", { characterId: character.id, placeId: insidePlace.id, actionId, travel: "car" });
      if (ok && a) toast(`${a.emoji} ${character.name}: ${a.label}`, "success");
      return;
    }
    setHighlight(actionId);
    setPlaceId(insidePlace.id);
  }
  const selectedPlaced = selFurn && me ? me.layout.find((f) => f.uid === selFurn) : null;
  const placementValid = placement && me ? canPlace(me.layout, placement.itemId, placement.x, placement.z, placement.rot, placement.uid) : false;

  return (
    <div className="relative h-dvh w-full overflow-hidden bg-[#2a4ed0] select-none">
      <div className="absolute inset-0 isolate z-0">
        <Scene kind={sceneKind} hour={clock.hour} minute={clock.minute} powerCut={Boolean(ev.powerCut)}>
          {roomHousehold ? (
            <Room
              household={roomHousehold}
              now={now}
              mode={effectiveView === "visit" ? "visit" : buyMode ? "buy" : "live"}
              selectedCharId={character?.id}
              placement={buyMode ? placement : null}
              selectedFurnitureUid={buyMode ? selFurn : menuFurn?.uid}
              walkTo={walkTo}
              lightsOn={!ev.powerCut}
              onFloorTap={(x, z) => {
                if (effectiveView === "visit") return;
                if (buyMode) {
                  if (placement) setPlacement({ ...placement, x, z });
                  else setSelFurn(null);
                  return;
                }
                setMenuFurn(null);
                setWalkTo([x + 0.5 - 4, z + 0.5 - 4]);
              }}
              onFloorHover={buyMode && placement ? (x, z) => setPlacement((p) => (p && (p.x !== x || p.z !== z) ? { ...p, x, z } : p)) : undefined}
              onFurnitureTap={(f) => {
                if (effectiveView === "visit") {
                  toast(`${ITEMS[f.itemId].emoji} ${ITEMS[f.itemId].name}`);
                  return;
                }
                if (buyMode) {
                  if (placement) return;
                  setSelFurn(f.uid);
                  setCatalogueOpen(false);
                } else {
                  setMenuFurn(f);
                  setSheet(null);
                }
              }}
              onCharacterTap={(c) => {
                if (effectiveView === "visit") {
                  toast(`${c.name} · mood ${charMood(c)}`);
                  return;
                }
                setSelCharId(c.id);
                setSheet("needs");
              }}
            />
          ) : insidePlace ? (
            <PlaceInterior
              place={insidePlace}
              households={snapshot.households}
              now={now}
              selectedCharId={character?.id}
              onStation={onStation}
              onSimTap={(c, h) => setSimMenu({ c, h })}
              waving={new Set(snapshot.chat.filter((m) => m.kind === "wave" && now - m.ts < 2500 && m.fromCharacterId).map((m) => m.fromCharacterId!))}
            />
          ) : (
            <City households={snapshot.households} myHouseholdId={me?.id} latestTrade={latestTrade} trips={trips} clockOffset={clockOffset} />
          )}
          <Projector />
        </Scene>
      </div>

      <div className="pointer-events-none absolute inset-0 z-[5]">
        {roomHousehold ? (
          !buyMode && <CharacterBubbles household={roomHousehold} now={now} />
        ) : insidePlace ? (
          <InsideLabels
            place={insidePlace}
            households={snapshot.households}
            now={now}
            chat={snapshot.chat}
            meId={me?.id}
            onStation={onStation}
            onSim={(c, h) => setSimMenu({ c, h })}
          />
        ) : (
          <CityMarkers
            households={snapshot.households}
            myHouseholdId={me?.id}
            now={now}
            listingsCount={snapshot.listings.length}
            onHouse={(h) => visit(h.id)}
            onLandmark={onLandmark}
            onPlace={(id) => {
              setSheet(null);
              setPlaceId(id);
            }}
            trips={trips}
          />
        )}
      </div>

      <RealTxProvider me={me} authHeaders={auth.authHeaders}>
      <div className="pointer-events-none absolute inset-0 z-10">
        {/* Top status strip */}
        {buyMode ? (
          <div className="pointer-events-auto absolute inset-x-0 top-0 z-30 border-b-[3px] border-[#0d1b5e] bg-gradient-to-b from-[#3d6cf2] to-[#2a4ed0] px-3 pt-[max(0.5rem,env(safe-area-inset-top))] pb-2 shadow-[0_4px_0_#0d1b5e]">
            <div className="mx-auto flex max-w-xl items-center gap-3">
              <span className="font-display text-2xl text-stroke">BUILD</span>
              <span className="font-display text-sm text-gold">MODE</span>
              <span className="ml-auto flex items-center gap-1.5 rounded-xl border-[3px] border-[#0d1b5e] bg-[#0d1b5e]/50 px-2 py-0.5">
                <span className="flex size-6 items-center justify-center rounded-full border-2 border-[#7a3d00] bg-gradient-to-b from-[#ffe46b] to-[#f59e0b] text-[11px] font-black text-[#7a3d00]">
                  S
                </span>
                <span className="font-display text-lg text-stroke">{me?.balance.toLocaleString()}</span>
              </span>
              <button onClick={() => goto("home")} className="btn-gold cursor-pointer rounded-xl px-4 py-1.5 text-base">
                DONE
              </button>
            </div>
          </div>
        ) : (
          <Hud
            snapshot={snapshot}
            now={now}
            balance={me ? me.balance : null}
            name={me?.name}
            look={character?.look}
            meId={me?.id}
            onSettings={me ? () => setPhone("about") : undefined}
            onTopUp={() => setSheet("topup")}
            onTicker={() => setPhone("feed")}
            showTicker={effectiveView === "home" || effectiveView === "map"}
          />
        )}

        {/* Bottom bar with hexagon buttons */}
        {me && !buyMode && (
          <div className="pointer-events-auto absolute inset-x-0 bottom-0 z-30 border-t-[3px] border-[#0d1b5e] bg-gradient-to-b from-[#1e36a8] to-[#14257a] px-3 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] shadow-[0_-4px_0_rgba(13,27,94,0.5)]">
            <div className="mx-auto flex max-w-xl items-center gap-2">
              <button
                aria-label="Back"
                onClick={() => goto(effectiveView === "home" ? "map" : "home")}
                className="btn-blue flex size-12 cursor-pointer items-center justify-center rounded-xl text-2xl"
              >
                {effectiveView === "home" ? "🌆" : "↩"}
              </button>
              <div className="ml-auto flex items-end gap-1.5">
                <HexButton active={effectiveView === "home"} onClick={() => goto("home")} icon="🏠" label="HOME" />
                <HexButton
                  active={false}
                  onClick={() => {
                    goto("home");
                    setBuyMode(true);
                    setCatalogueOpen(true);
                  }}
                  icon="🛋️"
                  label="BUILD"
                />
                <HexButton active={effectiveView === "map" || effectiveView === "place" || effectiveView === "visit"} onClick={() => goto("map")} icon="🗺️" label="CITY" />
                <HexButton active={!!phone} onClick={() => setPhone(unread ? "chat" : "home")} icon="📱" label="PAD" badge={unread} />
              </div>
            </div>
          </div>
        )}

        {/* Visit panel */}
        {effectiveView === "visit" && visited && (
          <div className="glass-strong pointer-events-auto absolute inset-x-2 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-30 mx-auto max-w-xl rounded-3xl p-4">
            <div className="font-display text-sm text-gold">VISITING</div>
            <div className="font-display truncate text-2xl text-stroke">{visited.name}</div>
            <div className="truncate text-xs text-slate-400">
              {visited.ownerNames.join(", ")} · {visited.characters.length} Sim{visited.characters.length === 1 ? "" : "s"} · {visited.activeListings} listings · mood{" "}
              {visited.mood}
            </div>
            <div className="mt-2 flex -space-x-2">
              {visited.characters.map((c) => (
                <Portrait key={c.id} look={c.look} size={34} ring={moodColor(charMood(c))} />
              ))}
            </div>
            <div className="mt-3 flex gap-2">
              <button onClick={() => goto("map")} className="btn-blue flex-1 cursor-pointer rounded-2xl py-2.5 text-base">
                ← CITY
              </button>
              {me && (
                <button
                  onClick={() => {
                    setChatWith(visited.id);
                    setPhone("chat");
                  }}
                  className="btn-gold flex-1 cursor-pointer rounded-2xl py-2.5 text-base"
                >
                  💬 MESSAGE
                </button>
              )}
              {visited.activeListings > 0 && (
                <button onClick={() => setPhone("market")} className="btn-gold flex-1 cursor-pointer rounded-2xl py-2.5 text-base">
                  SHOP LISTINGS
                </button>
              )}
            </div>
          </div>
        )}

        {/* Build mode: placement / selection bars */}
        {buyMode && placement && (
          <div className="glass-strong pointer-events-auto absolute inset-x-2 bottom-3 z-40 mx-auto flex max-w-xl items-center gap-2 rounded-3xl p-3">
            <span className="text-3xl">{ITEMS[placement.itemId].emoji}</span>
            <div className="min-w-0 flex-1">
              <div className="truncate font-bold text-white">{ITEMS[placement.itemId].name}</div>
              <div className={cn("text-xs", placementValid ? "text-[#ffd23f]" : "text-rose-400")}>{placementValid ? "Tap the floor to move it" : "Doesn't fit here"}</div>
            </div>
            <GlassButton label="Rotate" className="size-11" onClick={() => setPlacement({ ...placement, rot: (placement.rot + 1) % 4 })}>
              ⟳
            </GlassButton>
            <button
              disabled={!placementValid}
              onClick={confirmPlacement}
              className="btn-neon cursor-pointer rounded-2xl px-4 py-3 font-bold whitespace-nowrap disabled:opacity-40"
            >
              {placement.mode === "buy" ? `${ITEMS[placement.itemId].furniture!.storePrice} ${CURRENCY_SYMBOL}` : placement.mode === "place" ? "Place" : "Move"}
            </button>
            <GlassButton
              label="Cancel"
              className="size-11"
              onClick={() => {
                setPlacement(null);
                setCatalogueOpen(true);
              }}
            >
              ✕
            </GlassButton>
          </div>
        )}
        {buyMode && !placement && selectedPlaced && (
          <div className="glass-strong pointer-events-auto absolute inset-x-2 bottom-3 z-40 mx-auto max-w-xl rounded-3xl p-3">
            <div className="flex items-center gap-2 px-1 pb-2">
              <span className="text-2xl">{ITEMS[selectedPlaced.itemId].emoji}</span>
              <span className="flex-1 font-bold text-white">{ITEMS[selectedPlaced.itemId].name}</span>
              <button onClick={() => setSelFurn(null)} className="cursor-pointer text-slate-400">
                ✕
              </button>
            </div>
            <div className="grid grid-cols-4 gap-2 text-sm font-semibold">
              <button
                className="cursor-pointer rounded-2xl bg-white/10 py-2.5 text-white"
                onClick={() => setPlacement({ itemId: selectedPlaced.itemId, x: selectedPlaced.x, z: selectedPlaced.z, rot: selectedPlaced.rot, uid: selectedPlaced.uid, mode: "move" })}
              >
                Move
              </button>
              <button
                className="cursor-pointer rounded-2xl bg-white/10 py-2.5 text-white"
                onClick={() => act("/api/furniture", { op: "move", uid: selectedPlaced.uid, x: selectedPlaced.x, z: selectedPlaced.z, rot: (selectedPlaced.rot + 1) % 4 })}
              >
                ⟳ Turn
              </button>
              <button
                className="cursor-pointer rounded-2xl bg-amber-300/15 py-2.5 text-amber-200"
                onClick={async () => {
                  if (await act("/api/furniture", { op: "store", uid: selectedPlaced.uid })) {
                    toast("Stored. List it in Pad → Sell, or place it again from Stored.", "success");
                    setSelFurn(null);
                    setCatalogueOpen(true);
                  }
                }}
              >
                Store
              </button>
              <button
                className="cursor-pointer rounded-2xl bg-rose-500/15 py-2.5 text-rose-300"
                onClick={async () => {
                  const r = await act<{ refund: number }>("/api/furniture", { op: "sell", uid: selectedPlaced.uid });
                  if (r) {
                    toast(`Sold back for ${r.refund} ${CURRENCY_SYMBOL}`, "success");
                    setSelFurn(null);
                    setCatalogueOpen(true);
                  }
                }}
              >
                +{Math.floor(ITEMS[selectedPlaced.itemId].furniture!.storePrice / 2)}
              </button>
            </div>
          </div>
        )}
        {buyMode &&
          !placement &&
          !selectedPlaced &&
          me &&
          (catalogueOpen ? (
            <Catalogue
              household={me}
              onHide={() => setCatalogueOpen(false)}
              onPick={(itemId, mode) => {
                setPlacement({ itemId, x: 3, z: 3, rot: 0, mode });
                setCatalogueOpen(false);
              }}
            />
          ) : (
            <div className="pointer-events-auto absolute inset-x-0 bottom-4 z-40 flex justify-center">
              <button onClick={() => setCatalogueOpen(true)} className="btn-neon cursor-pointer rounded-2xl px-6 py-3 font-bold">
                Open catalogue
              </button>
            </div>
          ))}

        {/* Live mode: furniture menu */}
        {!buyMode && menuFurn && me && effectiveView === "home" && (
          <FurnitureMenu
            furniture={menuFurn}
            character={character}
            balance={me.balance}
            now={now}
            powerCut={Boolean(ev.powerCut)}
            onAction={async (id) => {
              await doAction(id, menuFurn.uid);
              setMenuFurn(null);
            }}
            onClose={() => setMenuFurn(null)}
          />
        )}

        {/* Sim card (bottom-left) */}
        {me && character && !buyMode && effectiveView !== "visit" && (
          <div className="pointer-events-none absolute bottom-[calc(5.4rem+env(safe-area-inset-bottom))] left-0 z-30 flex gap-2 px-2.5">
            <button
              onClick={() => setSheet(sheet === "needs" ? null : "needs")}
              className="glass pointer-events-auto flex cursor-pointer items-center gap-2.5 rounded-2xl p-1.5 pr-3 text-left"
            >
              <span className="rounded-xl border-[3px] border-[#7a3d00] bg-gradient-to-b from-[#ffe46b] to-[#f59e0b] p-0.5">
                <span className="block overflow-hidden rounded-lg">
                  <Portrait look={character.look} size={42} />
                </span>
              </span>
              <span className="flex flex-col gap-1">
                <span className="flex items-baseline gap-2">
                  <span className="font-display text-base leading-none text-stroke">{character.name}</span>
                  <span className="font-display text-sm leading-none" style={{ color: moodColor(charMood(character)) }}>
                    {charMood(character)}%
                  </span>
                </span>
                <span className="flex gap-1.5">
                  {NEED_KEYS.map((k) => {
                    const v = character.needs[k];
                    return (
                      <span key={k} className="flex flex-col items-center gap-0.5" title={NEED_META[k].label}>
                        <span className="text-[11px] leading-none">{NEED_META[k].emoji}</span>
                        <span className="bar w-6">
                          <span style={{ width: `${v}%`, background: needColor(v) }} />
                        </span>
                      </span>
                    );
                  })}
                </span>
              </span>
            </button>
            {me.characters.length > 1 && (
              <GlassButton
                label="Switch Sim"
                className="size-11 self-end text-base"
                onClick={() => {
                  const idx = me.characters.findIndex((c) => c.id === character.id);
                  setSelCharId(me.characters[(idx + 1) % me.characters.length].id);
                }}
              >
                ⇄
              </GlassButton>
            )}
          </div>
        )}

        {/* Sheets */}
        {sheet === "needs" && me && character && !buyMode && (
          <NeedsSheet
            household={me}
            character={character}
            now={now}
            onSelect={setSelCharId}
            onFix={(id) => {
              if (effectiveView !== "home") goto("home");
              void doAction(id);
            }}
            onHide={() => setSheet(null)}
          />
        )}
        {sheet === "topup" && me && (
          <TopUpSheet
            household={me}
            now={now}
            onHide={() => setSheet(null)}
            onOpen={(app) => {
              setSheet(null);
              setPhone(app);
            }}
            onFaucet={async () => {
              const r = await act<{ amount: number }>("/api/topup");
              if (r) toast(`+${r.amount} ${CURRENCY_SYMBOL} from the testnet faucet`, "success");
            }}
          />
        )}

        {placeId && (
          <PlaceSheet
            placeId={placeId}
            me={me}
            character={character}
            households={snapshot.households}
            now={now}
            act={act}
            toast={toast}
            onClose={() => {
              setPlaceId(null);
              setHighlight(undefined);
            }}
            onEnter={insidePlace?.id === placeId ? undefined : () => enterPlace(placeId)}
            highlight={highlight}
            onTravel={(id) => {
              if (character) setArrival({ placeId: id, charId: character.id });
              setPlaceId(null);
              setHighlight(undefined);
              if (!(effectiveView === "place" && insideId === id)) goto("map");
            }}
          />
        )}

        {insidePlace && !placeId && !phone && (
          <InsidePanel
            place={insidePlace}
            households={snapshot.households}
            now={now}
            character={character}
            chat={snapshot.chat}
            meId={me?.id}
            act={act}
            onCity={() => goto("map")}
            onAll={() => setPlaceId(insidePlace.id)}
            onHome={async () => {
              if (!character) return;
              const ok = await act("/api/place", { characterId: character.id, placeId: insidePlace.id, actionId: "__home" });
              if (ok) {
                toast(`🏠 ${character.name} headed home`, "success");
                goto("home");
              }
            }}
          />
        )}

        {/* Onboarding */}
        {auth.ready && !auth.authenticated && <Welcome />}
        {auth.authenticated && snapshot.me && !snapshot.me.householdId && !linking && !(auth.method === "privy" && auth.savedGuestId && !synced.current.guest) && (
          <CreateHousehold onCreate={onCreate} />
        )}

        {/* Trip in progress */}
        {trip && !phone && !placeId && (
          <div className="pointer-events-none absolute inset-x-0 bottom-[calc(9.8rem+env(safe-area-inset-bottom))] z-30 flex justify-center">
            <div className="glass font-display flex items-center gap-2 rounded-2xl px-4 py-2 text-base text-stroke">
              <span className="text-2xl">{TRAVEL[trip.travel ?? "car"].emoji}</span>
              {character!.name} → {PLACE_BY_ID[trip.place!].short}
              <span className="text-gold">{Math.max(0, Math.ceil(((trip.arriveAt ?? now) - now) / 1000))}s</span>
            </div>
          </div>
        )}

        {/* Another player's Sim */}
        {simMenu && (
          <Sheet title={simMenu.c.name} subtitle={simMenu.h.id === me?.id ? "Your Sim" : simMenu.h.name} icon={<Portrait look={simMenu.c.look} size={44} />} onClose={() => setSimMenu(null)}>
            {simMenu.h.id === me?.id ? (
              <div className="well rounded-2xl p-3 text-sm font-bold text-white">
                That&apos;s {simMenu.c.name}. Tap a station to do something, or open 💬 to talk to everyone here.
              </div>
            ) : (
              <div className="space-y-2 pb-2">
                <div className="text-xs font-bold text-[#cfe0ff]">
                  {now - simMenu.h.lastActive < ONLINE_MS ? "🟢 Online now" : "Away"} · {whereabouts(simMenu.h, now).text}
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={async () => {
                      const ok = await act("/api/chat", { kind: "wave", targetCharacterId: simMenu.c.id, characterId: character?.id });
                      if (ok) {
                        toast(`👋 You waved at ${simMenu.c.name} (+social for both)`, "success");
                        setSimMenu(null);
                      }
                    }}
                    className="btn-gold cursor-pointer rounded-2xl py-3 text-base"
                  >
                    👋 Wave
                  </button>
                  <button
                    onClick={() => {
                      setChatWith(simMenu.h.id);
                      setPhone("chat");
                      setSimMenu(null);
                    }}
                    className="btn-blue cursor-pointer rounded-2xl py-3 text-base"
                  >
                    💬 Message
                  </button>
                  <button
                    onClick={() => {
                      const id = simMenu.h.id;
                      setSimMenu(null);
                      visit(id);
                    }}
                    className="btn-blue cursor-pointer rounded-2xl py-3 text-base"
                  >
                    🏠 Visit
                  </button>
                </div>
                <div className="text-[11px] text-slate-400">Do an activity here at the same time to get a together bonus.</div>
              </div>
            )}
          </Sheet>
        )}

        {/* NEAR Pad */}
        {phone && (
          <Phone
            key={chatWith ?? "pad"}
            chat={chat}
            chatWith={chatWith}
            snapshot={snapshot}
            me={me}
            character={character}
            now={now}
            app={phone}
            setApp={setPhone}
            act={act}
            toast={toast}
            onVisit={(id) => {
              setPhone(null);
              visit(id);
            }}
            onClose={() => {
              setPhone(null);
              setChatWith(null);
            }}
            onPlace={(id) => {
              setPhone(null);
              setSheet(null);
              setPlaceId(id);
            }}
            onSignOut={async () => {
              setPhone(null);
              await auth.logout();
            }}
          />
        )}
      </div>
      </RealTxProvider>
    </div>
  );
}
