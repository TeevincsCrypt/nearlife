import { NextResponse } from "next/server";
import { readState } from "@/lib/store";

export const dynamic = "force-dynamic";

/** Public activity feed: listings, purchases (players and NPCs), production, social actions. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const limit = Math.min(150, Math.max(1, Number(url.searchParams.get("limit") ?? 50)));
  const type = url.searchParams.get("type");
  const state = await readState();
  const items = state.activity.filter((a) => !type || a.type === type).slice(0, limit);
  return NextResponse.json({ activity: items, stats: state.stats });
}
