"use client";

import Link from "next/link";
import { useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { ActivityFeed } from "@/components/ActivityFeed";
import { CreateHousehold } from "@/components/CreateHousehold";
import { HouseholdLot } from "@/components/HouseholdLot";
import { NpcTickButton } from "@/components/NpcTickButton";
import { SignInPanel } from "@/components/SignInPanel";
import { StatsBar } from "@/components/StatsBar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useGame } from "@/hooks/use-game";
import { CURRENCY_SYMBOL, ITEMS } from "@/lib/catalog";
import { timeAgo } from "@/lib/utils";

export default function NeighborhoodPage() {
  const auth = useAuth();
  const { snapshot, myHousehold } = useGame();
  const [filter, setFilter] = useState("all");

  if (!snapshot) {
    return <div className="text-muted-foreground py-24 text-center">Loading the neighborhood…</div>;
  }
  const now = snapshot.now;
  const players = snapshot.households.filter((h) => h.kind === "player");
  const npcs = snapshot.households.filter((h) => h.kind === "npc");
  const myListings = myHousehold ? snapshot.listings.filter((l) => l.sellerHouseholdId === myHousehold.id) : [];

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">The Neighborhood</h1>
          <p className="text-muted-foreground mt-1 max-w-2xl text-sm">
            Every household here (yours, other players&apos;, and {npcs.length} autonomous NPC agents) has needs, a NEAR account and a NEP-245
            balance. When a need drops, NPCs buy the cheapest listing that fixes it, including yours.
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5 text-[11px]">
            <Badge variant="outline">auth: {snapshot.config.auth}</Badge>
            <Badge variant="outline">state: {snapshot.config.storage}</Badge>
            <Badge variant="outline">NEP-245: {snapshot.config.settlement === "onchain" ? `on-chain (${snapshot.config.nep245Contract})` : "game ledger"}</Badge>
            <Badge variant="outline">network: {snapshot.config.network}</Badge>
            <Badge variant="outline">
              NPC tick #{snapshot.stats.tickCount} · {timeAgo(snapshot.stats.lastNpcTick, now)}
            </Badge>
          </div>
        </div>
        <NpcTickButton />
      </section>

      {!auth.authenticated && auth.ready && <SignInPanel />}
      {auth.authenticated && !snapshot.me?.householdId && <CreateHousehold />}

      {myHousehold && (
        <section className="flex flex-col gap-3 rounded-xl border border-amber-200 bg-amber-50/70 p-4 md:flex-row md:items-center">
          <div className="flex-1">
            <div className="font-semibold">
              {myHousehold.name} · {myHousehold.balance} {CURRENCY_SYMBOL}
            </div>
            <div className="text-muted-foreground text-sm">
              {myListings.length
                ? `You have ${myListings.length} listing(s) live: ${myListings.map((l) => `${ITEMS[l.itemId].emoji}×${l.quantity} @ ${l.price}`).join(", ")}. Run an NPC tick and watch the feed.`
                : "Demo loop: 🍳 Cook → 🏷️ list a Cooked Meal below the NPC price → 🤖 Run NPC tick → see an NPC buy it."}
            </div>
          </div>
          <div className="flex gap-2">
            <Button asChild>
              <Link href={`/household/${myHousehold.id}`}>Manage household</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/market">Market</Link>
            </Button>
          </div>
        </section>
      )}

      <StatsBar snapshot={snapshot} />

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          <section>
            <h2 className="mb-3 text-lg font-bold">Player households ({players.length})</h2>
            {players.length === 0 ? (
              <p className="text-muted-foreground rounded-xl border border-dashed p-6 text-center text-sm">No players yet. Be the first to move in.</p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {players.map((h) => (
                  <HouseholdLot key={h.id} household={h} now={now} isMine={h.id === myHousehold?.id} />
                ))}
              </div>
            )}
          </section>
          <section>
            <h2 className="mb-3 text-lg font-bold">NPC agent households ({npcs.length})</h2>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {npcs.map((h) => (
                <HouseholdLot key={h.id} household={h} now={now} />
              ))}
            </div>
          </section>
        </div>
        <div className="lg:sticky lg:top-20 lg:self-start">
          <ActivityFeed activity={snapshot.activity} now={now} myHouseholdId={myHousehold?.id} filter={filter} onFilter={setFilter} />
        </div>
      </div>
    </div>
  );
}
