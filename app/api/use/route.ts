import { readBody, runGame } from "@/lib/api";
import { getCharacter, useItem } from "@/lib/engine";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = await readBody<{ characterId?: string; itemId?: string }>(req);
  return runGame(
    req,
    ({ state, now, household }) => {
      const c = getCharacter(household!, body.characterId ?? "");
      useItem(state, household!, c, body.itemId ?? "", now);
      return null;
    },
    { household: true },
  );
}
