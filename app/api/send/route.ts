import { readBody, runGame } from "@/lib/api";
import { sendSimBucks } from "@/lib/engine";

export const dynamic = "force-dynamic";

/** NEAR Wallet "Send": transfer SimBucks to another household. */
export async function POST(req: Request) {
  const body = await readBody<{ toHouseholdId?: string; amount?: number }>(req);
  return runGame(
    req,
    ({ state, now, household }) => {
      sendSimBucks(state, household!, body.toHouseholdId ?? "", Math.floor(Number(body.amount ?? 0)), now);
      return null;
    },
    { household: true },
  );
}
