import { readBody, runGame } from "@/lib/api";
import { getCharacter, goHome, startPlaceAction, travelTo } from "@/lib/engine";
import type { TravelMode } from "@/lib/places";

export const dynamic = "force-dynamic";

/** Travel to a city place ("__travel"), do an activity there, or head home ("__home"). */
export async function POST(req: Request) {
  const body = await readBody<{ characterId?: string; placeId?: string; actionId?: string; travel?: TravelMode }>(req);
  return runGame(
    req,
    ({ state, now, household }) => {
      const c = getCharacter(household!, body.characterId ?? "");
      if (body.actionId === "__travel") {
        travelTo(state, household!, c, body.placeId ?? "", body.travel ?? "car", now);
        return null;
      }
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
