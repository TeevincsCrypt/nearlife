import { readBody, runGame } from "@/lib/api";
import { inviteTo, postChat, waveAt } from "@/lib/engine";

export const dynamic = "force-dynamic";

interface Body {
  kind?: "text" | "wave" | "invite";
  channel?: string;
  text?: string;
  characterId?: string;
  targetCharacterId?: string;
  toHouseholdId?: string;
  placeId?: string;
}

/** Chat with other players: town chat, place chat, direct messages, waves and invites. */
export async function POST(req: Request) {
  const body = await readBody<Body>(req);
  return runGame(
    req,
    ({ state, now, household }) => {
      if (body.kind === "wave") return waveAt(state, household!, body.targetCharacterId ?? "", now, body.characterId);
      if (body.kind === "invite") return inviteTo(state, household!, body.toHouseholdId ?? "", body.placeId ?? "", now, body.characterId);
      return postChat(state, household!, String(body.channel ?? ""), String(body.text ?? ""), now, body.characterId);
    },
    { household: true },
  );
}
