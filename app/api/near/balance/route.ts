import { NextResponse } from "next/server";
import { explorerFor, formatNear, getNativeBalance, NEAR_NETWORK, type Network } from "@/lib/near";
import { isValidNearAccountId } from "@/lib/accounts";

export const dynamic = "force-dynamic";

/** Native NEAR balance straight from NEAR RPC. */
export async function GET(req: Request) {
  const params = new URL(req.url).searchParams;
  const accountId = params.get("account_id") ?? "";
  const network: Network = params.get("network") === "mainnet" ? "mainnet" : params.get("network") === "testnet" ? "testnet" : (NEAR_NETWORK as Network);
  const explorer = `${explorerFor(network)}/address/${accountId}`;
  if (!isValidNearAccountId(accountId)) return NextResponse.json({ error: "invalid account id" }, { status: 400 });
  let b: { exists: boolean; yocto: string };
  try {
    b = await getNativeBalance(accountId, network);
  } catch {
    return NextResponse.json({ accountId, network, error: "NEAR RPC unavailable", explorer }, { status: 502 });
  }
  return NextResponse.json({
    accountId,
    network,
    exists: b.exists,
    near: formatNear(b.yocto),
    explorer,
  });
}
