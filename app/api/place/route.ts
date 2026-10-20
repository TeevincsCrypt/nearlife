import { readBody, runGame } from "@/lib/api";
import { getCharacter, goHome, startPlaceAction } from "@/lib/engine";
import type { TravelMode } from "@/lib/places";

export const dynamic = "force-dynamic";

/** Send a Sim to a city place by car, train or plane to do an activity there. */
export async function POST(req: Request) {
  const body = await readBody<{ characterId?: string; placeId?: string; actionId?: string; travel?: TravelMode }>(req);
  return runGame(
    req,
    ({ state, now, household }) => {
      const c = getCharacter(household!, body.characterId ?? "");
      if (body.actionId === "__home") {
        goHome(household!, c, now);
        return null;
      }
      startPlaceAction(state, household!, c, body.placeId ?? "", body.actionId ?? "", body.travel ?? "car", now);
      return null;
    },
    { household: true },
  );
}
