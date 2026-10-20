import { NextResponse } from "next/server";
import { HttpError, readBody, runGame } from "@/lib/api";
import { getUser } from "@/lib/auth";
import { CURRENCY, CURRENCY_SYMBOL } from "@/lib/catalog";
import { addActivity, applyEffects, getCharacter } from "@/lib/engine";
import { NEARLIFE_DAO, OUTLAYER_CONTRACT, REAL_NETWORK, SOCIAL_CONTRACT, realProvider } from "@/lib/near-real";
import { mt_mint } from "@/lib/nep245";
import { readState } from "@/lib/store";
import type { Needs } from "@/lib/types";

export const dynamic = "force-dynamic";

type Kind = "send" | "social" | "dao" | "intents" | "outlayer";

/** What each real action is expected to look like on-chain, and what it earns in the game. */
const KINDS: Record<Kind, { receiver?: () => string; reward: number; effects: Partial<Needs>; text: (detail: string) => string; emoji: string }> = {
  send: { reward: 0, effects: {}, emoji: "Ⓝ", text: (d) => `sent real NEAR ${d}` },
  social: { receiver: () => SOCIAL_CONTRACT, reward: 5, effects: { social: 30, fun: 5 }, emoji: "💬", text: () => "posted on NEAR Social" },
  dao: { receiver: () => NEARLIFE_DAO, reward: 5, effects: { social: 20 }, emoji: "🗳️", text: (d) => `voted on the NEARLIFE DAO ${d}` },
  intents: { receiver: () => "wrap.near", reward: 5, effects: { fun: 15 }, emoji: "🌐", text: (d) => `swapped via NEAR Intents ${d}` },
  outlayer: { receiver: () => OUTLAYER_CONTRACT, reward: 10, effects: { fun: 10 }, emoji: "🤖", text: () => "ran a real OutLayer job" },
};
const REWARD_COOLDOWN_MS = 10 * 60_000;

interface Body {
  kind?: Kind;
  txHash?: string;
  characterId?: string;
  detail?: string;
}

/**
 * Record a real NEAR transaction the player signed in the browser. The server checks it on-chain
 * (signer = the household's own Privy wallet, expected receiver, success) before posting it to the
 * feed and granting a small, rate-limited in-game reward.
 */
export async function POST(req: Request) {
  const body = await readBody<Body>(req);
  const kind = body.kind && KINDS[body.kind] ? body.kind : null;
  const txHash = (body.txHash ?? "").trim();
  if (!kind || !/^[1-9A-HJ-NP-Za-km-z]{32,64}$/.test(txHash)) return NextResponse.json({ error: "Bad request" }, { status: 400 });

  // Look up the household's account first (read-only) so we can verify against the chain.
  const user = await getUser(req);
  if (!user) return NextResponse.json({ error: "Sign in first" }, { status: 401 });
  const s = await readState();
  const hh = s.households[s.players[user.userId] ?? ""];
  const account = hh ? { accountId: hh.accountId, source: hh.accountSource } : null;
  if (!account) return NextResponse.json({ error: "Create a household first" }, { status: 400 });
  if (account.source !== "privy") return NextResponse.json({ error: "Real mode needs a Privy NEAR wallet" }, { status: 400 });

  let verified = false;
  let reason = "";
  try {
    const res = (await realProvider().viewTransactionStatus({ txHash, accountId: account.accountId, waitUntil: "EXECUTED_OPTIMISTIC" })) as unknown as {
      status: Record<string, unknown>;
      transaction: { signer_id: string; receiver_id: string };
    };
    const expected = KINDS[kind].receiver?.();
    if (res.transaction.signer_id !== account.accountId) reason = "signed by a different account";
    else if (expected && res.transaction.receiver_id !== expected) reason = `sent to ${res.transaction.receiver_id}, expected ${expected}`;
    else if (!("SuccessValue" in res.status || "SuccessReceiptId" in res.status)) reason = "transaction failed";
    else verified = true;
  } catch {
    reason = "could not reach NEAR RPC to verify";
  }

  return runGame(
    req,
    ({ state, now, household }) => {
      const hh = household!;
      state.realTxs ??= [];
      if (state.realTxs.includes(txHash)) throw new HttpError(409, "Already recorded");
      if (!verified) throw new HttpError(400, `Couldn't verify the transaction: ${reason}`);
      state.realTxs.push(txHash);
      if (state.realTxs.length > 1000) state.realTxs.splice(0, state.realTxs.length - 1000);

      const def = KINDS[kind];
      const c = body.characterId ? hh.characters.find((x) => x.id === body.characterId) : undefined;
      if (c) applyEffects(getCharacter(hh, c.id), def.effects);
      hh.realRewards ??= {};
      let reward = 0;
      if (def.reward && now - (hh.realRewards[kind] ?? 0) > REWARD_COOLDOWN_MS) {
        reward = def.reward;
        hh.realRewards[kind] = now;
        mt_mint(state, hh.accountId, CURRENCY, reward, `real:${kind}`);
      }
      hh.lastActive = now;
      addActivity(state, {
        householdId: hh.id,
        householdName: hh.name,
        ts: now,
        type: "action",
        emoji: def.emoji,
        txHash,
        txNetwork: REAL_NETWORK,
        text: `🔗 ${c ? `${c.name} (${hh.name})` : hh.name} ${def.text((body.detail ?? "").slice(0, 60))} on NEAR ${REAL_NETWORK}${reward ? ` (+${reward} ${CURRENCY_SYMBOL})` : ""}`,
      });
      return { reward };
    },
    { household: true },
  );
}
