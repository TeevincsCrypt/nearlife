"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";
import { ActivityFeed } from "@/components/ActivityFeed";
import { CharacterCard } from "@/components/CharacterCard";
import { CreateListingForm } from "@/components/CreateListingForm";
import { presence } from "@/components/HouseholdLot";
import { NpcTickButton } from "@/components/NpcTickButton";
import { useToast } from "@/components/toaster";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useGame } from "@/hooks/use-game";
import { ACTIONS, CURRENCY_SYMBOL, ITEMS, ROLE_LABEL } from "@/lib/catalog";
import { shortAccount } from "@/lib/utils";

interface NearInfo {
  error?: string;
  exists: boolean;
  near: string;
  explorer: string;
  network: string;
}

function useNow(serverNow?: number) {
  // Tick locally between polls so busy timers count down smoothly.
  const [offset, setOffset] = useState(0);
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (serverNow) setOffset(serverNow - Date.now());
  }, [serverNow]);
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(t);
  }, []);
  return now + offset;
}

export default function HouseholdPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { snapshot, act, myHousehold } = useGame();
  const toast = useToast();
  const now = useNow(snapshot?.now);
  const [near, setNear] = useState<NearInfo | null>(null);
  const hh = snapshot?.households.find((h) => h.id === id);

  useEffect(() => {
    if (!hh?.accountId) return;
    fetch(`/api/near/balance?account_id=${hh.accountId}`)
      .then((r) => r.json())
      .then(setNear)
      .catch(() => {});
  }, [hh?.accountId]);

  if (!snapshot) return <div className="text-muted-foreground py-24 text-center">Loading…</div>;
  if (!hh)
    return (
      <div className="py-24 text-center">
        Household not found. <Link href="/">Back to the neighborhood</Link>
      </div>
    );

  const isMine = myHousehold?.id === hh.id;
  const listings = snapshot.listings.filter((l) => l.sellerHouseholdId === hh.id);
  const activity = snapshot.activity.filter((a) => a.householdId === hh.id || a.counterpartyHouseholdId === hh.id);
  const p = presence(hh, now);
  const inventory = Object.entries(hh.inventory).filter(([, q]) => q > 0);

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-2xl border bg-white shadow-sm">
        <div className="h-20" style={{ background: `linear-gradient(135deg, ${hh.color}, ${hh.color}88)` }} />
        <div className="flex flex-col gap-4 p-5 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-extrabold">{hh.name}</h1>
              <Badge variant={hh.kind === "npc" ? "npc" : "player"}>{hh.kind === "npc" ? "NPC agent" : "Player"}</Badge>
              {isMine && <Badge className="bg-amber-300 text-amber-950">You</Badge>}
            </div>
            <div className="text-muted-foreground mt-1 text-sm">
              {p.label}
              {hh.role && ` · ${ROLE_LABEL[hh.role]}`}
              {hh.kind === "player" && ` · owned by ${hh.ownerNames.join(", ")}`}
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
              <span className="text-muted-foreground">NEAR account</span>
              <code className="rounded bg-secondary px-1.5 py-0.5" title={hh.accountId}>
                {shortAccount(hh.accountId)}
              </code>
              <Badge variant="outline">{hh.accountSource === "privy" ? "Privy embedded wallet" : "implicit account (derived)"}</Badge>
              {near && (
                <a href={near.explorer} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                  {near.error ? `view on explorer` : near.exists ? `${near.near} NEAR on ${near.network}` : `not funded on ${near.network} yet`} ↗
                </a>
              )}
              {isMine && (
                <button
                  className="text-primary cursor-pointer hover:underline"
                  onClick={() => {
                    navigator.clipboard?.writeText(hh.id);
                    toast(`Invite code ${hh.id} copied. Friends can join from the home page.`, "success");
                  }}
                >
                  copy invite code
                </button>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-amber-100 px-4 py-2 text-right">
              <div className="text-2xl font-extrabold tabular-nums text-amber-900">{hh.balance}</div>
              <div className="text-[11px] text-amber-800">SimBucks (NEP-245)</div>
            </div>
            <NpcTickButton />
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <section>
            <h2 className="mb-3 text-lg font-bold">Characters</h2>
            <div className="grid gap-3 md:grid-cols-2">
              {hh.characters.map((c) => (
                <CharacterCard
                  key={c.id}
                  character={c}
                  now={now}
                  controllable={isMine}
                  showThought={hh.kind === "npc"}
                  inventory={hh.inventory}
                  balance={hh.balance}
                  onAction={async (actionId) => {
                    const ok = await act("/api/action", { characterId: c.id, action: actionId });
                    if (ok) toast(`${c.name} is ${ACTIONS[actionId].verb}`);
                  }}
                  onUse={(itemId) => act("/api/use", { characterId: c.id, itemId })}
                />
              ))}
            </div>
          </section>

          <Card>
            <CardHeader>
              <CardTitle>Inventory</CardTitle>
              <CardDescription>NEP-245 balances held by this household&apos;s NEAR account.</CardDescription>
            </CardHeader>
            <CardContent>
              {inventory.length === 0 ? (
                <p className="text-muted-foreground text-sm">Empty.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {inventory.map(([itemId, q]) => (
                    <div key={itemId} className="flex items-center gap-2 rounded-lg border bg-white px-3 py-2 text-sm" title={ITEMS[itemId]?.description}>
                      <span className="text-xl">{ITEMS[itemId]?.emoji}</span>
                      <span>{ITEMS[itemId]?.name}</span>
                      <span className="text-muted-foreground">×{q}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {isMine && (
            <Card>
              <CardHeader>
                <CardTitle>List on the public market</CardTitle>
                <CardDescription>Other players and NPC agents can buy it. NPCs pick the cheapest listing that fixes a low need.</CardDescription>
              </CardHeader>
              <CardContent>
                <CreateListingForm household={hh} listings={snapshot.listings} onDone={() => toast("Listed! Run an NPC tick to speed things up.", "success")} />
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Active listings ({listings.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {listings.length === 0 ? (
                <p className="text-muted-foreground text-sm">None.</p>
              ) : (
                <ul className="divide-y">
                  {listings.map((l) => (
                    <li key={l.id} className="flex items-center gap-3 py-2 text-sm">
                      <span className="text-xl">{ITEMS[l.itemId].emoji}</span>
                      <span className="flex-1">
                        {ITEMS[l.itemId].name} × {l.quantity}
                        {l.initialQuantity > l.quantity && <span className="text-emerald-700"> ({l.initialQuantity - l.quantity} sold)</span>}
                      </span>
                      <span className="font-semibold tabular-nums">
                        {l.price} {CURRENCY_SYMBOL}
                      </span>
                      {isMine ? (
                        <Button size="sm" variant="outline" onClick={() => act(`/api/listing?id=${l.id}`, undefined, "DELETE")}>
                          Cancel
                        </Button>
                      ) : myHousehold ? (
                        <Button size="sm" disabled={myHousehold.balance < l.price} onClick={() => act("/api/buy", { listingId: l.id })}>
                          Buy
                        </Button>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
        <div className="lg:sticky lg:top-20 lg:self-start">
          <ActivityFeed activity={activity} now={snapshot.now} myHouseholdId={myHousehold?.id} title={`${hh.name} activity`} limit={30} />
        </div>
      </div>
    </div>
  );
}
