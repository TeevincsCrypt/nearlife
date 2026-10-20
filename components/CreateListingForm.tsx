"use client";

import { useEffect, useMemo, useState } from "react";
import { CURRENCY_SYMBOL, ITEMS } from "@/lib/catalog";
import type { HouseholdView, Listing } from "@/lib/types";
import { useGame } from "@/hooks/use-game";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/select";

export function CreateListingForm({ household, listings, onDone }: { household: HouseholdView; listings: Listing[]; onDone?: () => void }) {
  const { act } = useGame();
  const owned = useMemo(() => Object.entries(household.inventory).filter(([id, q]) => q > 0 && ITEMS[id]), [household.inventory]);
  const [itemId, setItemId] = useState(owned[0]?.[0] ?? "");
  const [qty, setQty] = useState(1);
  const [price, setPrice] = useState(0);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!owned.find(([id]) => id === itemId)) setItemId(owned[0]?.[0] ?? "");
  }, [owned, itemId]);

  const competitors = listings.filter((l) => l.itemId === itemId && l.sellerHouseholdId !== household.id);
  const cheapest = competitors.length ? Math.min(...competitors.map((l) => l.price)) : null;
  const suggested = itemId ? Math.max(1, (cheapest ?? ITEMS[itemId].basePrice) - 1) : 0;

  useEffect(() => {
    if (itemId) setPrice(suggested);
    setQty(Math.max(1, household.inventory[itemId] ?? 1));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemId]);

  if (owned.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        Nothing to sell yet. Have a character <b>🍳 Cook</b>, <b>☕ Brew</b>, <b>🎉 Plan Party</b>, <b>🛁 Run Spa</b> or <b>🔨 Craft</b>, then list what they make.
      </p>
    );
  }

  const max = household.inventory[itemId] ?? 0;
  return (
    <form
      className="grid gap-3 sm:grid-cols-[2fr_1fr_1fr_auto] sm:items-end"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        const ok = await act("/api/listing", { itemId, quantity: qty, price });
        setBusy(false);
        if (ok) onDone?.();
      }}
    >
      <div className="space-y-1.5">
        <Label>Item</Label>
        <NativeSelect value={itemId} onChange={(e) => setItemId(e.target.value)}>
          {owned.map(([id, q]) => (
            <option key={id} value={id}>
              {ITEMS[id].emoji} {ITEMS[id].name} (you own {q})
            </option>
          ))}
        </NativeSelect>
      </div>
      <div className="space-y-1.5">
        <Label>Qty</Label>
        <Input type="number" min={1} max={max} value={qty} onChange={(e) => setQty(Math.max(1, Math.min(max, Number(e.target.value) || 1)))} />
      </div>
      <div className="space-y-1.5">
        <Label>Price ({CURRENCY_SYMBOL} each)</Label>
        <Input type="number" min={1} max={500} value={price} onChange={(e) => setPrice(Math.max(1, Number(e.target.value) || 1))} />
      </div>
      <Button type="submit" disabled={busy || !itemId}>
        🏷️ List
      </Button>
      {itemId && (
        <p className="text-muted-foreground text-xs sm:col-span-4">
          {cheapest !== null
            ? `Cheapest competing ${ITEMS[itemId].name}: ${cheapest} ${CURRENCY_SYMBOL}. NPCs buy the cheapest suitable listing when their needs drop, so undercutting sells fastest.`
            : `No competing ${ITEMS[itemId].name} listings right now. Base price is ${ITEMS[itemId].basePrice} ${CURRENCY_SYMBOL}.`}
        </p>
      )}
    </form>
  );
}
