import { readBody, runGame } from "@/lib/api";
import { cancelListing, createListing } from "@/lib/engine";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = await readBody<{ itemId?: string; quantity?: number; price?: number }>(req);
  return runGame(
    req,
    ({ state, now, household }) =>
      createListing(state, household!, body.itemId ?? "", Math.floor(Number(body.quantity ?? 1)), Math.floor(Number(body.price ?? 0)), now),
    { household: true },
  );
}

export async function DELETE(req: Request) {
  const id = new URL(req.url).searchParams.get("id") ?? "";
  return runGame(
    req,
    ({ state, now, household }) => {
      cancelListing(state, household!, id, now);
      return null;
    },
    { household: true },
  );
}
