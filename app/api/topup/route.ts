import { runGame } from "@/lib/api";
import { topUp } from "@/lib/engine";

export const dynamic = "force-dynamic";

/** Testnet SimBucks faucet (rate-limited per household). */
export async function POST(req: Request) {
  return runGame(req, ({ state, now, household }) => ({ amount: topUp(state, household!, now) }), { household: true });
}
