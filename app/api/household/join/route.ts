import { HttpError, readBody, runGame } from "@/lib/api";
import { addActivity } from "@/lib/engine";

export const dynamic = "force-dynamic";

/** Join an existing player household as a co-owner (share the household id as an invite code). */
export async function POST(req: Request) {
  const body = await readBody<{ householdId?: string; displayName?: string }>(req);
  return runGame(
    req,
    ({ state, now, user, household }) => {
      if (household) throw new HttpError(409, "You already have a household");
      const target = state.households[(body.householdId ?? "").trim()];
      if (!target) throw new HttpError(404, "No player household with that invite code");
      if (target.ownerIds.length >= 4) throw new HttpError(400, "That household is full");
      target.ownerIds.push(user!.userId);
      const displayName = (body.displayName ?? "").trim().slice(0, 24) || "Player";
      target.ownerNames.push(displayName);
      target.lastActive = now;
      state.players[user!.userId] = target.id;
      addActivity(state, {
        householdId: target.id,
        householdName: target.name,
        ts: now,
        type: "join",
        emoji: "🤝",
        text: `${displayName} joined ${target.name}`,
      });
      return { householdId: target.id };
    },
    { auth: true },
  );
}
