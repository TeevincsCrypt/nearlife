import { readBody, runGame } from "@/lib/api";
import { getCharacter, startAction } from "@/lib/engine";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = await readBody<{ characterId?: string; action?: string }>(req);
  return runGame(
    req,
    ({ state, now, household }) => {
      const c = getCharacter(household!, body.characterId ?? "");
      startAction(state, household!, c, body.action ?? "", now);
      return null;
    },
    { household: true },
  );
}
