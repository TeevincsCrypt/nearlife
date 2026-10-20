"use client";

import { useState } from "react";
import { ActivityFeed } from "@/components/ActivityFeed";
import { CreateListingForm } from "@/components/CreateListingForm";
import { ListingCard } from "@/components/ListingCard";
import { NpcTickButton } from "@/components/NpcTickButton";
import { useToast } from "@/components/toaster";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useGame } from "@/hooks/use-game";
import { ITEMS, NEED_META } from "@/lib/catalog";
import { NEED_KEYS, type NeedKey } from "@/lib/types";
import { cn } from "@/lib/utils";

export default function MarketPage() {
  const { snapshot, myHousehold, act } = useGame();
  const toast = useToast();
  const [need, setNeed] = useState<NeedKey | "all" | "furniture">("all");
  const [seller, setSeller] = useState<"all" | "player" | "npc">("all");

  if (!snapshot) return <div className="text-muted-foreground py-24 text-center">Loading market…</div>;
  const byId = new Map(snapshot.households.map((h) => [h.id, h]));
  const listings = snapshot.listings
    .filter((l) => {
      const item = ITEMS[l.itemId];
      if (need === "furniture") return item.kind === "furniture";
      if (need !== "all" && !(item.effects?.[need] ?? 0)) return false;
      return true;
    })
    .filter((l) => seller === "all" || byId.get(l.sellerHouseholdId)?.kind === seller)
    .sort((a, b) => a.price - b.price);

  const chip = (active: boolean) =>
    cn("cursor-pointer rounded-full border px-3 py-1 text-xs", active ? "border-primary bg-primary text-primary-foreground" : "bg-white hover:bg-secondary");

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Public Market</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Every listing is public. Players buy with a click; NPC agents buy automatically when one of their needs falls below 55, always picking the cheapest listing that fixes it. Listed tokens sit in
            the market escrow account until sold (NEP-245 <code>mt_transfer</code>).
          </p>
        </div>
        <NpcTickButton />
      </div>

      {myHousehold && (
        <Card>
          <CardHeader>
            <CardTitle>Sell something</CardTitle>
            <CardDescription>List items your household made. Payment arrives in SimBucks the moment anyone buys.</CardDescription>
          </CardHeader>
          <CardContent>
            <CreateListingForm household={myHousehold} listings={snapshot.listings} onDone={() => toast("Listed! Watch the feed for buyers.", "success")} />
          </CardContent>
        </Card>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <button className={chip(need === "all")} onClick={() => setNeed("all")}>
          All needs
        </button>
        {NEED_KEYS.map((k) => (
          <button key={k} className={chip(need === k)} onClick={() => setNeed(k)}>
            {NEED_META[k].emoji} {NEED_META[k].label}
          </button>
        ))}
        <button className={chip(need === "furniture")} onClick={() => setNeed("furniture")}>
          🛋️ Furniture
        </button>
        <span className="mx-2 h-5 w-px bg-border" />
        {(["all", "player", "npc"] as const).map((s) => (
          <button key={s} className={chip(seller === s)} onClick={() => setSeller(s)}>
            {s === "all" ? "All sellers" : s === "player" ? "Players" : "NPCs"}
          </button>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="grid content-start gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {listings.length === 0 && (
            <p className="text-muted-foreground col-span-full rounded-xl border border-dashed p-8 text-center text-sm">No listings match. NPCs restock every few ticks.</p>
          )}
          {listings.map((l) => (
            <ListingCard
              key={l.id}
              listing={l}
              seller={byId.get(l.sellerHouseholdId)}
              now={snapshot.now}
              canBuy={Boolean(myHousehold)}
              isMine={l.sellerHouseholdId === myHousehold?.id}
              affordable={(myHousehold?.balance ?? 0) >= l.price}
              onBuy={async () => {
                const r = await act("/api/buy", { listingId: l.id });
                if (r) toast(`Bought ${ITEMS[l.itemId].name}. It's in your inventory.`, "success");
              }}
              onCancel={() => act(`/api/listing?id=${l.id}`, undefined, "DELETE")}
            />
          ))}
        </div>
        <div className="lg:sticky lg:top-20 lg:self-start">
          <ActivityFeed
            activity={snapshot.activity.filter((a) => ["purchase", "listing", "price"].includes(a.type))}
            now={snapshot.now}
            myHouseholdId={myHousehold?.id}
            title="Market activity"
            limit={30}
          />
        </div>
      </div>
    </div>
  );
}
