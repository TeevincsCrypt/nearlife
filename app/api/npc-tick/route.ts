import { NextResponse } from "next/server";
import { runGame } from "@/lib/api";
import { fastForwardNpcs, npcTick } from "@/lib/engine";

export const dynamic = "force-dynamic";

/**
 * Manual trigger: fast-forwards NPC needs by a few minutes and runs one NPC agent tick
 * immediately (so a judge doesn't have to wait). The world also ticks on its own whenever
 * anyone polls /api/state, and via Vercel Cron (GET).
 */
export async function POST(req: Request) {
  let fastForward = 3;
  return runGame(
    req,
    ({ state, now }) => {
      if (now - (state.lastForcedTick ?? 0) < 1500) fastForward = 0; // debounce button mashing
      if (fastForward) fastForwardNpcs(state, fastForward, now);
      state.lastForcedTick = now;
      npcTick(state, now);
      return { fastForwardMinutes: fastForward, tick: state.tickCount };
    },
  );
}

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  return runGame(req, ({ state }) => ({ tick: state.tickCount }), { forceNpcTick: true });
}
