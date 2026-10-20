"use client";

import Link from "next/link";
import type { ActivityEvent } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn, timeAgo } from "@/lib/utils";

const FILTERS: Array<{ id: string; label: string; types?: ActivityEvent["type"][] }> = [
  { id: "all", label: "All" },
  { id: "trade", label: "Trades", types: ["purchase"] },
  { id: "market", label: "Listings", types: ["listing", "price"] },
  { id: "life", label: "Life", types: ["action", "production", "social", "join"] },
];

export function ActivityFeed({
  activity,
  now,
  myHouseholdId,
  filter = "all",
  onFilter,
  limit = 40,
  title = "Neighborhood activity",
}: {
  activity: ActivityEvent[];
  now: number;
  myHouseholdId?: string | null;
  filter?: string;
  onFilter?: (f: string) => void;
  limit?: number;
  title?: string;
}) {
  const types = FILTERS.find((f) => f.id === filter)?.types;
  const items = activity.filter((a) => !types || types.includes(a.type)).slice(0, limit);
  return (
    <Card className="gap-3">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span className="relative flex size-2">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
          </span>
          {title}
        </CardTitle>
        <CardDescription>Public to everyone: players and NPC agents.</CardDescription>
        {onFilter && (
          <div className="flex gap-1 pt-1">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                onClick={() => onFilter(f.id)}
                className={cn(
                  "cursor-pointer rounded-full border px-2.5 py-0.5 text-xs",
                  filter === f.id ? "border-primary bg-primary text-primary-foreground" : "bg-white hover:bg-secondary",
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        )}
      </CardHeader>
      <CardContent className="px-2">
        <ul className="max-h-[640px] space-y-0.5 overflow-y-auto">
          {items.length === 0 && <li className="text-muted-foreground px-3 py-6 text-center text-sm">Nothing yet.</li>}
          {items.map((a) => {
            const mine = myHouseholdId && (a.householdId === myHouseholdId || a.counterpartyHouseholdId === myHouseholdId);
            return (
              <li key={a.id} className={cn("feed-in flex gap-2.5 rounded-lg px-3 py-2 text-sm", mine && "bg-amber-50")}>
                <span className="text-lg leading-5">{a.emoji}</span>
                <div className="min-w-0 flex-1">
                  <div className="leading-snug">{a.text}</div>
                  <div className="text-muted-foreground mt-0.5 flex items-center gap-1.5 text-[11px]">
                    {timeAgo(a.ts, now)}
                    {a.householdId && (
                      <>
                        ·
                        <Link href={`/household/${a.householdId}`} className="hover:underline">
                          {a.householdName}
                        </Link>
                        <Badge variant={a.isNpc ? "npc" : "player"} className="px-1 py-0 text-[10px]">
                          {a.isNpc ? "NPC" : "Player"}
                        </Badge>
                      </>
                    )}
                    {a.type === "purchase" && a.counterpartyIsNpc === false && a.isNpc && (
                      <Badge className="bg-amber-100 px-1 py-0 text-[10px] text-amber-800">NPC bought from a player</Badge>
                    )}
                    {mine && <Badge className="bg-amber-200 px-1 py-0 text-[10px] text-amber-900">You</Badge>}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}
