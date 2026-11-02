import { readBody, runGame } from "@/lib/api";
import { getCharacter, goHome, hangAtHome, startPlaceAction, travelTo } from "@/lib/engine";
import type { TravelMode } from "@/lib/places";

export const dynamic = "force-dynamic";

/** Travel to a city place or a neighbor's home ("__travel"), do an activity there, hang out at a home ("__hang"), or head home ("__home"). */
export async function POST(req: Request) {
  const body = await readBody<{ characterId?: string; placeId?: string; actionId?: string; travel?: TravelMode }>(req);
  return runGame(
    req,
    ({ state, now, household }) => {
      const c = getCharacter(household!, body.characterId ?? "");
      if (body.actionId === "__hang") {
        hangAtHome(state, household!, c, body.placeId ?? "", now);
        return null;
      }
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
