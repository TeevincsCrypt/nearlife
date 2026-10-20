import { NextResponse } from "next/server";
import { ITEMS } from "@/lib/catalog";
import { mt_balance_of, mt_batch_balance_of, mt_metadata, mt_supply } from "@/lib/nep245";
import { readState } from "@/lib/store";

export const dynamic = "force-dynamic";

/**
 * NEP-245 view methods over the game ledger, plus the recent event log.
 *   /api/nep245?method=mt_balance_of&account_id=...&token_id=simbucks
 *   /api/nep245?method=mt_batch_balance_of&account_id=...&token_ids=simbucks,meal
 *   /api/nep245?method=mt_supply&token_id=meal
 *   /api/nep245?method=mt_metadata&token_ids=meal,comfy_bed
 *   /api/nep245?method=events&limit=20
 */
export async function GET(req: Request) {
  const p = new URL(req.url).searchParams;
  const method = p.get("method") ?? "events";
  const state = await readState();
  const accountId = p.get("account_id") ?? "";
  const tokenId = p.get("token_id") ?? "";
  const tokenIds = (p.get("token_ids") ?? Object.keys(ITEMS).join(",")).split(",").filter(Boolean);
  switch (method) {
    case "mt_balance_of":
      return NextResponse.json(String(mt_balance_of(state, accountId, tokenId)));
    case "mt_batch_balance_of":
      return NextResponse.json(mt_batch_balance_of(state, accountId, tokenIds));
    case "mt_supply":
      return NextResponse.json(String(mt_supply(state, tokenId)));
    case "mt_batch_supply":
      return NextResponse.json(tokenIds.map((t) => String(mt_supply(state, t))));
    case "mt_metadata":
      return NextResponse.json(mt_metadata(tokenIds));
    case "events": {
      const limit = Math.min(200, Math.max(1, Number(p.get("limit") ?? 30)));
      return NextResponse.json({
        events: state.nep245Log.slice(0, limit).map((e) => ({ ...e, log: `EVENT_JSON:${JSON.stringify(e.event)}` })),
        settlements: state.settlements.slice(0, limit),
      });
    }
    default:
      return NextResponse.json({ error: `unknown method ${method}` }, { status: 400 });
  }
}
