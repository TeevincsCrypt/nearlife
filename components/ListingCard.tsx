"use client";

import Link from "next/link";
import { CURRENCY_SYMBOL, ITEMS, NEED_META } from "@/lib/catalog";
import type { HouseholdView, Listing, NeedKey } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { timeAgo } from "@/lib/utils";

export function ListingCard({
  listing,
  seller,
  now,
  canBuy,
  isMine,
  affordable,
  onBuy,
  onCancel,
}: {
  listing: Listing;
  seller?: HouseholdView;
  now: number;
  canBuy: boolean;
  isMine: boolean;
  affordable: boolean;
  onBuy?: () => void;
  onCancel?: () => void;
}) {
  const item = ITEMS[listing.itemId];
  return (
    <div className="feed-in flex flex-col rounded-xl border bg-white p-4 shadow-xs">
      <div className="flex items-start gap-3">
        <div className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-secondary text-3xl">{item.emoji}</div>
        <div className="min-w-0 flex-1">
          <div className="font-semibold leading-tight">{item.name}</div>
          <div className="text-muted-foreground mt-1 flex flex-wrap items-center gap-1 text-xs">
            <Badge variant="outline" className="capitalize">
              {item.kind}
            </Badge>
            by{" "}
            {seller ? (
              <Link href={`/household/${seller.id}`} className="hover:underline">
                {seller.name}
              </Link>
            ) : (
              "unknown"
            )}{" "}
            {seller && <Badge variant={seller.kind === "npc" ? "npc" : "player"}>{seller.kind === "npc" ? "NPC" : "Player"}</Badge>}
          </div>
        </div>
        <div className="text-right">
          <div className="text-lg font-bold tabular-nums">
            {listing.price} <span className="text-muted-foreground text-xs font-medium">{CURRENCY_SYMBOL}</span>
          </div>
          <div className="text-muted-foreground text-xs">{listing.quantity} left</div>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-1">
        {Object.entries(item.effects ?? {}).map(([k, v]) => (
          <span key={k} className="rounded bg-emerald-50 px-1.5 py-0.5 text-[11px] text-emerald-700">
            {NEED_META[k as NeedKey].emoji} +{v}
          </span>
        ))}
        {item.bonus && <span className="rounded bg-sky-50 px-1.5 py-0.5 text-[11px] text-sky-700">{item.description.replace("Owned furniture: ", "")}</span>}
      </div>
      <div className="mt-auto flex items-center justify-between pt-3">
        <span className="text-muted-foreground text-[11px]">listed {timeAgo(listing.createdAt, now)}</span>
        {isMine ? (
          <Button size="sm" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        ) : (
          <Button size="sm" disabled={!canBuy || !affordable} onClick={onBuy} title={!canBuy ? "Create a household to buy" : !affordable ? "Not enough SimBucks" : ""}>
            Buy
          </Button>
        )}
      </div>
    </div>
  );
}
