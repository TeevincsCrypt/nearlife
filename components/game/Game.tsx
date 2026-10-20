"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { useToast } from "@/components/toaster";
import { useGame } from "@/hooks/use-game";
import { ACTIONS, CURRENCY_SYMBOL, ITEMS, NEED_META, WORLD_EVENTS, gameClock } from "@/lib/catalog";
import { canPlace } from "@/lib/layout";
import type { PlacedFurniture } from "@/lib/types";
import { NEED_KEYS } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Projector } from "./three/anchors";
import { PLACE_BY_ID } from "@/lib/places";
import { City, housePosition, type Landmark, type Trip } from "./three/City";
import { PlaceSheet } from "./ui/PlaceSheet";
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
import { GlassButton } from "./ui/Sheet";
import { TopUpSheet } from "./ui/TopUpSheet";
import { Welcome } from "./ui/Welcome";

type View = "home" | "map" | "visit";

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

function DockButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: string; label: string }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex w-14 cursor-pointer flex-col items-center gap-0.5 rounded-xl py-2 text-[10px] font-bold tracking-wide uppercase transition",
        active ? "bg-[#00ec97]/15 text-[#00ec97] shadow-[inset_0_0_0_1px_rgba(0,236,151,0.5)]" : "text-slate-400",
      )}
    >
      <span className="text-xl leading-none">{icon}</span>
      {label}
    </button>
  );
}

export default function Game() {
  const auth = useAuth();
  const toast = useToast();
  const { snapshot, myHousehold, act } = useGame();
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

  const me = myHousehold;
  const effectiveView: View = !me && view === "home" ? "map" : view;
  const visited = visitId ? (snapshot?.households.find((h) => h.id === visitId) ?? null) : null;
  const roomHousehold = effectiveView === "visit" ? visited : effectiveView === "home" ? me : null;
  const character = me?.characters.find((c) => c.id === selCharId) ?? me?.characters[0] ?? null;
  const ev = WORLD_EVENTS.find((e) => e.id === snapshot?.worldEvent?.id) ?? WORLD_EVENTS[0];
  const clock = gameClock(now);
  const latestTrade = useMemo(() => snapshot?.activity.find((a) => a.type === "purchase"), [snapshot?.activity]);
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
      <div className="flex h-dvh items-center justify-center bg-[#0b0d1a] font-mono text-sm tracking-widest text-[#00ec97]">LOADING NEARLIFE…</div>
    );
  }

  const sceneKind = roomHousehold ? "room" : "city";
  const selectedPlaced = selFurn && me ? me.layout.find((f) => f.uid === selFurn) : null;
  const placementValid = placement && me ? canPlace(me.layout, placement.itemId, placement.x, placement.z, placement.rot, placement.uid) : false;

  return (
    <div className="relative h-dvh w-full overflow-hidden bg-[#0b0d1a] select-none">
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
          ) : (
            <City households={snapshot.households} myHouseholdId={me?.id} latestTrade={latestTrade} trips={trips} clockOffset={clockOffset} />
          )}
          <Projector />
        </Scene>
      </div>

      <div className="pointer-events-none absolute inset-0 z-[5]">
        {roomHousehold ? (
          !buyMode && <CharacterBubbles household={roomHousehold} now={now} />
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
          <div className="pointer-events-none absolute inset-x-0 top-0 z-30 flex justify-center px-2.5 pt-[max(0.6rem,env(safe-area-inset-top))]">
            <div className="glass pointer-events-auto flex w-full max-w-xl items-center gap-3 rounded-2xl px-3 py-2">
              <span className="font-mono text-xs font-bold tracking-[0.25em] text-[#00ec97]">BUILD MODE</span>
              <span className="ml-auto font-mono text-lg font-bold neon-text">
                {me?.balance.toLocaleString()} <span className="text-[10px] text-slate-400">{CURRENCY_SYMBOL}</span>
              </span>
              <button onClick={() => goto("home")} className="cursor-pointer rounded-xl bg-white/10 px-3 py-1.5 text-sm font-bold text-white">
                Done
              </button>
            </div>
          </div>
        ) : (
          <Hud
            snapshot={snapshot}
            now={now}
            balance={me ? me.balance : null}
            onTopUp={() => setSheet("topup")}
            onTicker={() => setPhone("feed")}
            showTicker={effectiveView !== "visit"}
          />
        )}

        {/* Right-hand dock */}
        {me && !buyMode && (
          <div className="glass pointer-events-auto absolute right-2 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-30 flex flex-col gap-1 rounded-2xl p-1.5 shadow-xl">
            <DockButton active={effectiveView === "home"} onClick={() => goto("home")} icon="🏠" label="Home" />
            <DockButton
              active={false}
              onClick={() => {
                goto("home");
                setBuyMode(true);
                setCatalogueOpen(true);
              }}
              icon="🛠"
              label="Build"
            />
            <DockButton active={effectiveView !== "home"} onClick={() => goto("map")} icon="🌆" label="City" />
            <div className="mx-2 my-0.5 h-px bg-white/10" />
            <DockButton active={!!phone} onClick={() => setPhone("home")} icon="📟" label="Pad" />
          </div>
        )}

        {/* Visit panel */}
        {effectiveView === "visit" && visited && (
          <div className="glass-strong pointer-events-auto absolute inset-x-2 bottom-3 z-30 mx-auto max-w-xl rounded-3xl p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
            <div className="font-mono text-[10px] font-bold tracking-[0.25em] text-[#00ec97]">VISITING</div>
            <div className="truncate text-xl font-extrabold text-white">{visited.name}</div>
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
              <button onClick={() => goto("map")} className="flex-1 cursor-pointer rounded-2xl bg-white/10 py-2.5 font-semibold text-white">
                ← City
              </button>
              {visited.activeListings > 0 && (
                <button onClick={() => setPhone("market")} className="btn-neon flex-1 cursor-pointer rounded-2xl py-2.5 font-semibold">
                  Shop their listings
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
              <div className={cn("text-xs", placementValid ? "text-[#00ec97]" : "text-rose-400")}>{placementValid ? "Tap the floor to move it" : "Doesn't fit here"}</div>
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
          <div className="pointer-events-none absolute bottom-0 left-0 z-30 flex gap-2 p-2.5 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            <button
              onClick={() => setSheet(sheet === "needs" ? null : "needs")}
              className="glass pointer-events-auto flex cursor-pointer items-center gap-3 rounded-2xl p-2 pr-3 text-left shadow-xl"
            >
              <Portrait look={character.look} size={48} ring={moodColor(charMood(character))} />
              <span className="flex flex-col gap-1">
                <span className="flex items-baseline gap-2">
                  <span className="text-sm font-bold text-white">{character.name}</span>
                  <span className="font-mono text-xs font-bold" style={{ color: moodColor(charMood(character)) }}>
                    {charMood(character)}%
                  </span>
                </span>
                <span className="flex gap-1.5">
                  {NEED_KEYS.map((k) => {
                    const v = character.needs[k];
                    return (
                      <span key={k} className="flex flex-col items-center gap-0.5" title={NEED_META[k].label}>
                        <span className="text-[11px] leading-none">{NEED_META[k].emoji}</span>
                        <span className="h-1.5 w-5 overflow-hidden rounded-full bg-white/10">
                          <span className="block h-full rounded-full" style={{ width: `${v}%`, background: needColor(v) }} />
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
            onClose={() => setPlaceId(null)}
          />
        )}

        {/* Onboarding */}
        {auth.ready && !auth.authenticated && <Welcome />}
        {auth.authenticated && snapshot.me && !snapshot.me.householdId && <CreateHousehold onCreate={onCreate} />}

        {/* NEAR Pad */}
        {phone && (
          <Phone
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
            onClose={() => setPhone(null)}
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
