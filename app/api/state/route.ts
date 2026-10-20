import { runGame } from "@/lib/api";

export const dynamic = "force-dynamic";

/** Shared world snapshot. Polling this also advances the simulation clock (lazy ticking). */
export async function GET(req: Request) {
  return runGame(req, ({ household, now }) => {
    if (household) household.lastActive = now;
    return null;
  });
}
