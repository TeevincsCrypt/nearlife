import { readBody, runGame } from "@/lib/api";
import { answerCall, endCall, startCall } from "@/lib/engine";

export const dynamic = "force-dynamic";

/** Voice call signaling: start (with a WebRTC offer), answer (with the answer), end. */
export async function POST(req: Request) {
  const body = await readBody<{ op?: "start" | "answer" | "end"; to?: string; id?: string; offer?: string; answer?: string }>(req);
  return runGame(
    req,
    ({ state, now, household }) => {
      if (body.op === "start") return startCall(state, household!, body.to ?? "", body.offer ?? "", now);
      if (body.op === "answer") return answerCall(state, household!, body.id ?? "", body.answer ?? "", now);
      if (body.op === "end") return endCall(state, household!, body.id ?? "", now);
      return null;
    },
    { household: true },
  );
}
