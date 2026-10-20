import { NextResponse } from "next/server";
import { explorerAccountUrl, formatNear, getNativeBalance, NEAR_NETWORK } from "@/lib/near";
import { isValidNearAccountId } from "@/lib/accounts";

export const dynamic = "force-dynamic";

/** Native NEAR balance straight from NEAR RPC. */
export async function GET(req: Request) {
  const accountId = new URL(req.url).searchParams.get("account_id") ?? "";
  if (!isValidNearAccountId(accountId)) return NextResponse.json({ error: "invalid account id" }, { status: 400 });
  let b: { exists: boolean; yocto: string };
  try {
    b = await getNativeBalance(accountId);
  } catch {
    return NextResponse.json({ accountId, network: NEAR_NETWORK, error: "NEAR RPC unavailable", explorer: explorerAccountUrl(accountId) }, { status: 502 });
  }
  return NextResponse.json({
    accountId,
    network: NEAR_NETWORK,
    exists: b.exists,
    near: formatNear(b.yocto),
    explorer: explorerAccountUrl(accountId),
  });
}
