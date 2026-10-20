import { after, NextResponse } from "next/server";
import { getUser, guestEnabled, privyEnabled, type AuthUser } from "./auth";
import { GameError, NPC_TICK_MS, advance, getHousehold, snapshot } from "./engine";
import { ESCROW_ACCOUNT, LedgerError } from "./nep245";
import { NEAR_NETWORK, NEP245_CONTRACT_ID, settleEvents, settlementMode } from "./near";
import { mutateState, storageMode } from "./store";
import type { GameState, Household, StateSnapshot } from "./types";

export function gameConfig(): StateSnapshot["config"] {
  return {
    auth: privyEnabled && guestEnabled ? "privy+guest" : privyEnabled ? "privy" : "guest",
    storage: storageMode,
    settlement: settlementMode,
    network: NEAR_NETWORK,
    nep245Contract: NEP245_CONTRACT_ID || "(off-chain ledger)",
    escrowAccount: ESCROW_ACCOUNT,
    npcTickMs: NPC_TICK_MS,
  };
}

export function errorResponse(e: unknown) {
  if (e instanceof GameError || e instanceof LedgerError) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
  console.error(e);
  return NextResponse.json({ error: (e as Error).message || "Server error" }, { status: 500 });
}

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

/**
 * Run a game mutation: advances the world clock first, then applies `fn`.
 * Returns a fresh snapshot for the caller so the UI updates immediately.
 * New NEP-245 events are settled on-chain after the response when enabled.
 */
export async function runGame<T>(
  req: Request,
  fn: (ctx: { state: GameState; now: number; user: AuthUser | null; household: Household | null }) => T,
  opts: { auth?: boolean; household?: boolean; forceNpcTick?: boolean } = {},
) {
  try {
    const user = await getUser(req);
    if ((opts.auth || opts.household) && !user) throw new HttpError(401, "Sign in first");
    let fromSeq = 0;
    const { state, result } = await mutateState((state) => {
      const now = Date.now();
      fromSeq = state.nep245Seq ?? 0;
      advance(state, now, { forceNpcTick: opts.forceNpcTick });
      let household: Household | null = null;
      if (user) {
        const hid = state.players[user.userId];
        if (hid && state.households[hid]) {
          household = getHousehold(state, hid);
        }
      }
      if (opts.household && !household) throw new HttpError(400, "Create a household first");
      return fn({ state, now, user, household });
    });

    if (settlementMode === "onchain") {
      const events = state.nep245Log.filter((e) => e.seq > fromSeq);
      if (events.length) {
        after(async () => {
          const receipts = await settleEvents(events);
          await mutateState((s) => {
            for (const r of receipts) s.settlements.unshift({ ts: Date.now(), ...r });
            s.settlements.length = Math.min(s.settlements.length, 100);
            for (const r of receipts) {
              const ev = s.nep245Log.find((e) => e.seq === r.seq);
              if (ev && r.txHash) ev.txHash = r.txHash;
            }
          });
        });
      }
    }

    return NextResponse.json({
      ok: true,
      result: result ?? null,
      snapshot: snapshot(state, Date.now(), user?.userId ?? null, gameConfig()),
    });
  } catch (e) {
    if (e instanceof HttpError) return NextResponse.json({ error: e.message }, { status: e.status });
    return errorResponse(e);
  }
}

export async function readBody<T = Record<string, unknown>>(req: Request): Promise<T> {
  try {
    return (await req.json()) as T;
  } catch {
    return {} as T;
  }
}
