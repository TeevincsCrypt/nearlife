import { readBody, runGame } from "@/lib/api";
import { buyListing, logPurchase } from "@/lib/engine";

export const dynamic = "force-dynamic";

/** A player buys one unit of a listing. The item lands in the household inventory (NEP-245 balance). */
export async function POST(req: Request) {
  const body = await readBody<{ listingId?: string }>(req);
  return runGame(
    req,
    ({ state, now, household }) => {
      const { seller, item, listing } = buyListing(state, household!, body.listingId ?? "", now);
      logPurchase(state, household!, seller, item.id, listing.price, now);
      return { itemId: item.id };
    },
    { household: true },
  );
}
