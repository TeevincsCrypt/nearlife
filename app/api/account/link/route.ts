import { isValidNearAccountId } from "@/lib/accounts";
import { HttpError, readBody, runGame } from "@/lib/api";
import { addActivity } from "@/lib/engine";
import { inventoryOf, mt_transfer } from "@/lib/nep245";

export const dynamic = "force-dynamic";

/**
 * Keeps a player's progress attached to their login:
 * - `guest`: a household made as a guest on this device moves onto the signed-in account.
 * - `nearAccountId`: a household on a server-derived account moves its tokens onto the
 *   player's own Privy NEAR wallet, so the wallet they can export is the one in the game.
 */
export async function POST(req: Request) {
  const body = await readBody<{ nearAccountId?: string }>(req);
  const guestId = req.headers.get("x-guest-id");
  const validGuest = guestId && /^guest_[a-z0-9]{8,40}$/.test(guestId) ? guestId : null;
  return runGame(
    req,
    ({ state, now, user }) => {
      if (user!.kind !== "privy") throw new HttpError(400, "Log in with email or Google first");
      const result = { merged: false, conflict: false, migrated: false };

      if (validGuest && state.players[validGuest]) {
        const guestHid = state.players[validGuest];
        if (!state.players[user!.userId]) {
          state.players[user!.userId] = guestHid;
          delete state.players[validGuest];
          const hh = state.households[guestHid];
          if (hh) hh.ownerIds = hh.ownerIds.map((id) => (id === validGuest ? user!.userId : id));
          result.merged = true;
        } else if (state.players[user!.userId] !== guestHid) {
          result.conflict = true;
        }
      }

      const hid = state.players[user!.userId];
      const hh = hid ? state.households[hid] : null;
      const wallet = (body.nearAccountId ?? "").trim().toLowerCase();
      if (hh && hh.accountSource === "derived" && wallet && isValidNearAccountId(wallet) && wallet !== hh.accountId) {
        const taken = Object.values(state.households).some((h) => h.id !== hh.id && h.accountId === wallet);
        if (!taken) {
          const from = hh.accountId;
          for (const [token, amount] of Object.entries(inventoryOf(state, from))) mt_transfer(state, from, wallet, token, amount, "move-to-own-wallet");
          for (const l of Object.values(state.listings)) if (l.sellerAccountId === from) l.sellerAccountId = wallet;
          hh.accountId = wallet;
          hh.accountSource = "privy";
          result.migrated = true;
          addActivity(state, { householdId: hh.id, householdName: hh.name, ts: now, type: "system", emoji: "🔐", text: `${hh.name} moved into their own NEAR wallet` });
        }
      }
      return result;
    },
    { auth: true },
  );
}
