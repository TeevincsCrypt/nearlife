"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { useToast } from "@/components/toaster";
import { useGame } from "@/hooks/use-game";
import { ACTIONS, CURRENCY_SYMBOL, ITEMS, WORLD_EVENTS, gameClock } from "@/lib/catalog";
import { canPlace } from "@/lib/layout";
import type { PlacedFurniture } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Projector } from "./three/anchors";
import { City, ROLE_EMOJI, type Landmark } from "./three/City";
import { CharacterBubbles, CityMarkers } from "./ui/Markers";
import { Room, charMood, moodColor, type Placement } from "./three/Room";
import { Scene } from "./three/Scene";
import { Catalogue } from "./ui/Catalogue";
import { CreateHousehold } from "./ui/CreateHousehold";
import { FurnitureMenu } from "./ui/FurnitureMenu";
import { Hud } from "./ui/Hud";
import { NeedsSheet } from "./ui/NeedsSheet";
import { Phone, type AppId } from "./ui/Phone";
import { Pill, RoundButton } from "./ui/Sheet";
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
  return now + offset;
}

function NavButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: string; label: string }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-1 cursor-pointer flex-col items-center justify-center gap-0.5 rounded-[26px] py-2 text-sm font-semibold transition",
        active ? "bg-slate-900 text-white" : "text-slate-500",
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
  const now = useNow(snapshot?.now);

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

  const me = myHousehold;
  const effectiveView: View = !me && view === "home" ? "map" : view;
  const visited = visitId ? snapshot?.households.find((h) => h.id === visitId) ?? null : null;
  const roomHousehold = effectiveView === "visit" ? visited : effectiveView === "home" ? me : null;
  const character = me?.characters.find((c) => c.id === selCharId) ?? me?.characters[0] ?? null;
  const ev = WORLD_EVENTS.find((e) => e.id === snapshot?.worldEvent?.id) ?? WORLD_EVENTS[0];
  const clock = gameClock(now);
  const latestTrade = useMemo(() => snapshot?.activity.find((a) => a.type === "purchase"), [snapshot?.activity]);

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
      if (mode === "buy") toast(`${ITEMS[itemId].emoji} ${ITEMS[itemId].name} bought and placed`, "success");
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
      toast("Welcome home! Tap furniture to use it.", "success");
      goto("home");
    }
  }

  async function npcTick() {
    const r = await act<{ fastForwardMinutes: number }>("/api/npc-tick");
    if (r) toast(`🤖 NPC agents acted (+${r.fastForwardMinutes} min of needs). Watch the ticker.`, "success");
  }

  function onLandmark(l: Landmark) {
    if (l === "market") setPhone("market");
    else if (l === "office") setPhone("jobs");
    else if (character) void doAction("socialize");
    else toast("Move in first to meet the neighbors");
  }

  if (!snapshot) {
    return (
      <div className="flex h-dvh items-center justify-center bg-sky-100">
        <div className="flex flex-col items-center gap-3 text-slate-600">
          <svg width="26" height="42" viewBox="0 0 10 16" className="plumbob">
            <polygon points="5,0 10,6 5,16 0,6" fill="#22c55e" />
          </svg>
          Loading the neighborhood…
        </div>
      </div>
    );
  }

  const sceneKind = roomHousehold ? "room" : "city";
  const selectedPlaced = selFurn && me ? me.layout.find((f) => f.uid === selFurn) : null;
  const placementValid = placement && me ? canPlace(me.layout, placement.itemId, placement.x, placement.z, placement.rot, placement.uid) : false;

  return (
    <div className="relative h-dvh w-full overflow-hidden bg-sky-100 select-none">
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
                  toast(`${c.avatar} ${c.name}${c.thought ? `: ${c.thought}` : ""}`);
                  return;
                }
                setSelCharId(c.id);
                setSheet("needs");
              }}
            />
          ) : (
            <City households={snapshot.households} myHouseholdId={me?.id} latestTrade={latestTrade} />
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
            onHouse={(h) => {
              if (h.id === me?.id) goto("home");
              else {
                setVisitId(h.id);
                goto("visit");
              }
            }}
            onLandmark={onLandmark}
          />
        )}
      </div>

      <div className="pointer-events-none absolute inset-0 z-10">
        {/* Top HUD */}
        {buyMode ? (
          <div className="pointer-events-none absolute inset-x-0 top-0 z-30 flex items-center justify-between gap-2 px-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
            <div className="pointer-events-auto rounded-full bg-white px-5 py-2.5 text-lg font-bold shadow-lg">Buy mode</div>
            <div className="pointer-events-auto rounded-full bg-white px-5 py-2.5 text-lg font-extrabold tabular-nums shadow-lg">
              {me?.balance.toLocaleString()} {CURRENCY_SYMBOL}
            </div>
            <RoundButton label="Exit buy mode" onClick={() => goto("home")}>
              ✕
            </RoundButton>
          </div>
        ) : (
          <Hud
            snapshot={snapshot}
            now={now}
            balance={me ? me.balance : null}
            mood={character ? charMood(character) : null}
            onTopUp={() => setSheet("topup")}
            onTicker={() => setPhone("feed")}
            showTicker={effectiveView === "home"}
          />
        )}

        {/* Visit banner */}
        {effectiveView === "visit" && visited && (
          <div className="pointer-events-auto absolute inset-x-3 bottom-28 z-30 mx-auto max-w-xl rounded-[28px] bg-white p-4 shadow-xl">
            <div className="flex items-center gap-3">
              <span className="text-3xl">{visited.kind === "npc" && visited.role ? ROLE_EMOJI[visited.role] : "🏠"}</span>
              <div className="min-w-0 flex-1">
                <div className="truncate font-extrabold">Visiting {visited.name}</div>
                <div className="truncate text-xs text-slate-500">
                  {visited.kind === "npc" ? "🤖 Autonomous NPC agent" : `🧑 ${visited.ownerNames.join(", ")}`} · {visited.balance} {CURRENCY_SYMBOL} ·{" "}
                  {visited.activeListings} listings · mood {visited.mood}
                </div>
              </div>
            </div>
            {visited.kind === "npc" && (
              <div className="mt-2 space-y-1">
                {visited.characters.map((c) => (
                  <div key={c.id} className="truncate rounded-xl bg-violet-50 px-3 py-1.5 text-xs text-violet-800">
                    {c.avatar} <b>{c.name}</b>: {c.thought ?? "…"}
                  </div>
                ))}
              </div>
            )}
            <div className="mt-3 flex gap-2">
              <button onClick={() => goto("map")} className="flex-1 cursor-pointer rounded-full bg-slate-100 py-2.5 font-semibold">
                🗺️ Back to map
              </button>
              <button onClick={() => goto("home")} className="cursor-pointer rounded-full bg-slate-100 px-4 py-2.5 font-semibold">
                🏠
              </button>
              {visited.activeListings > 0 && (
                <button onClick={() => setPhone("market")} className="flex-1 cursor-pointer rounded-full bg-emerald-500 py-2.5 font-semibold text-white">
                  🛒 Shop listings
                </button>
              )}
            </div>
          </div>
        )}

        {/* Buy mode: placement / selection bars */}
        {buyMode && placement && (
          <div className="pointer-events-auto absolute inset-x-3 bottom-6 z-40 mx-auto flex max-w-xl items-center gap-2 rounded-[28px] bg-white p-3 shadow-2xl">
            <span className="text-3xl">{ITEMS[placement.itemId].emoji}</span>
            <div className="min-w-0 flex-1">
              <div className="truncate font-bold">{ITEMS[placement.itemId].name}</div>
              <div className={cn("text-xs", placementValid ? "text-emerald-600" : "text-rose-600")}>
                {placementValid ? "Tap the floor to move it, then confirm" : "Doesn't fit here. Tap another spot"}
              </div>
            </div>
            <RoundButton label="Rotate" className="size-11 bg-slate-100 shadow-none" onClick={() => setPlacement({ ...placement, rot: (placement.rot + 1) % 4 })}>
              ⟳
            </RoundButton>
            <button
              disabled={!placementValid}
              onClick={confirmPlacement}
              className="cursor-pointer rounded-full bg-emerald-500 px-4 py-3 font-bold whitespace-nowrap text-white disabled:opacity-40"
            >
              {placement.mode === "buy" ? `Buy ${ITEMS[placement.itemId].furniture!.storePrice} ${CURRENCY_SYMBOL}` : placement.mode === "place" ? "Place" : "Move"}
            </button>
            <RoundButton
              label="Cancel"
              className="size-11 bg-slate-100 shadow-none"
              onClick={() => {
                setPlacement(null);
                setCatalogueOpen(true);
              }}
            >
              ✕
            </RoundButton>
          </div>
        )}
        {buyMode && !placement && selectedPlaced && (
          <div className="pointer-events-auto absolute inset-x-3 bottom-6 z-40 mx-auto max-w-xl rounded-[28px] bg-white p-3 shadow-2xl">
            <div className="flex items-center gap-2 px-1 pb-2">
              <span className="text-2xl">{ITEMS[selectedPlaced.itemId].emoji}</span>
              <span className="flex-1 font-bold">{ITEMS[selectedPlaced.itemId].name}</span>
              <button onClick={() => setSelFurn(null)} className="cursor-pointer text-slate-400">
                ✕
              </button>
            </div>
            <div className="grid grid-cols-4 gap-2 text-sm font-semibold">
              <button
                className="cursor-pointer rounded-2xl bg-slate-100 py-2.5"
                onClick={() => setPlacement({ itemId: selectedPlaced.itemId, x: selectedPlaced.x, z: selectedPlaced.z, rot: selectedPlaced.rot, uid: selectedPlaced.uid, mode: "move" })}
              >
                ✥ Move
              </button>
              <button
                className="cursor-pointer rounded-2xl bg-slate-100 py-2.5"
                onClick={() => act("/api/furniture", { op: "move", uid: selectedPlaced.uid, x: selectedPlaced.x, z: selectedPlaced.z, rot: (selectedPlaced.rot + 1) % 4 })}
              >
                ⟳ Rotate
              </button>
              <button
                className="cursor-pointer rounded-2xl bg-amber-100 py-2.5 text-amber-900"
                onClick={async () => {
                  if (await act("/api/furniture", { op: "store", uid: selectedPlaced.uid })) {
                    toast("Stored. Sell it on the market from 🏷️ Sell, or place it again from 📦 Stored.", "success");
                    setSelFurn(null);
                    setCatalogueOpen(true);
                  }
                }}
              >
                📦 Store
              </button>
              <button
                className="cursor-pointer rounded-2xl bg-rose-100 py-2.5 text-rose-800"
                onClick={async () => {
                  const r = await act<{ refund: number }>("/api/furniture", { op: "sell", uid: selectedPlaced.uid });
                  if (r) {
                    toast(`Sold back for ${r.refund} ${CURRENCY_SYMBOL}`, "success");
                    setSelFurn(null);
                    setCatalogueOpen(true);
                  }
                }}
              >
                💰 +{Math.floor(ITEMS[selectedPlaced.itemId].furniture!.storePrice / 2)}
              </button>
            </div>
          </div>
        )}
        {buyMode && !placement && !selectedPlaced && me && (
          catalogueOpen ? (
            <Catalogue
              household={me}
              onHide={() => setCatalogueOpen(false)}
              onPick={(itemId, mode) => {
                const spot = { x: 3, z: 3, rot: 0 };
                setPlacement({ itemId, ...spot, mode });
                setCatalogueOpen(false);
              }}
            />
          ) : (
            <div className="pointer-events-auto absolute inset-x-0 bottom-6 z-40 flex justify-center">
              <button onClick={() => setCatalogueOpen(true)} className="cursor-pointer rounded-full bg-slate-900 px-6 py-3 font-bold text-white shadow-xl">
                🛋️ Open catalogue
              </button>
            </div>
          )
        )}

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

        {/* Bottom bar */}
        {me && !buyMode && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-30 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            <div className="mx-auto flex max-w-xl flex-col gap-3">
              <div className="flex items-end justify-between">
                {effectiveView !== "visit" && character ? (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        const idx = me.characters.findIndex((c) => c.id === character.id);
                        const next = me.characters[(idx + 1) % me.characters.length];
                        setSelCharId(next.id);
                        if (me.characters.length > 1) toast(`${next.avatar} ${next.name} selected`);
                      }}
                      className="pointer-events-auto relative flex size-16 cursor-pointer items-center justify-center rounded-full border-4 bg-white text-3xl shadow-lg"
                      style={{ borderColor: moodColor(charMood(character)) }}
                      aria-label="Switch Sim"
                    >
                      {character.avatar}
                      {me.characters.length > 1 && (
                        <span className="absolute -right-1 -bottom-1 rounded-full bg-slate-900 px-1.5 text-[10px] font-bold text-white">{me.characters.length}</span>
                      )}
                    </button>
                    <Pill onClick={() => setSheet(sheet === "needs" ? null : "needs")} className="bg-white text-slate-800">
                      <span className="flex size-8 items-center justify-center rounded-full bg-emerald-50">💬</span>
                      <span className="text-lg font-bold text-emerald-600">{charMood(character)}%</span>
                    </Pill>
                  </div>
                ) : (
                  <span />
                )}
                <div className={cn("flex flex-col items-end gap-2", effectiveView === "visit" && "invisible")}>
                  <RoundButton label="Agents" onClick={() => setPhone("agents")}>
                    🤖
                  </RoundButton>
                  {effectiveView === "home" ? (
                    <Pill onClick={() => goto("map")} className="bg-white py-3 text-slate-800">
                      🚪 <span className="font-semibold">Go outside</span>
                    </Pill>
                  ) : (
                    <Pill onClick={() => goto("home")} className="bg-white py-3 text-slate-800">
                      🏠 <span className="font-semibold">Go home</span>
                    </Pill>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="pointer-events-auto flex flex-1 gap-1 rounded-[32px] bg-white p-1.5 shadow-xl">
                  <NavButton active={effectiveView === "home"} onClick={() => goto("home")} icon="🏠" label="Home" />
                  <NavButton
                    active={false}
                    onClick={() => {
                      goto("home");
                      setBuyMode(true);
                      setCatalogueOpen(true);
                    }}
                    icon="🛋️"
                    label="Buy"
                  />
                  <NavButton active={effectiveView !== "home"} onClick={() => goto("map")} icon="🗺️" label="Map" />
                </div>
                <RoundButton label="Phone" className="size-16 text-2xl" onClick={() => setPhone("home")}>
                  📱
                </RoundButton>
              </div>
            </div>
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

        {/* Onboarding */}
        {auth.ready && !auth.authenticated && <Welcome />}
        {auth.authenticated && snapshot.me && !snapshot.me.householdId && <CreateHousehold onCreate={onCreate} />}

        {/* Phone */}
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
              if (id === me?.id) goto("home");
              else {
                setVisitId(id);
                goto("visit");
              }
            }}
            onClose={() => setPhone(null)}
            onNpcTick={npcTick}
            onSignOut={async () => {
              setPhone(null);
              await auth.logout();
            }}
          />
        )}
      </div>
    </div>
  );
}
