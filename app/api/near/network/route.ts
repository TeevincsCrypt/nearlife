import { NextResponse } from "next/server";
import { getNetworkStatus, type Network } from "@/lib/near";

export const dynamic = "force-dynamic";

/** Live NEAR network status (block height, gas price) from RPC. */
export async function GET(req: Request) {
  const n = new URL(req.url).searchParams.get("network");
  const network: Network | undefined = n === "mainnet" || n === "testnet" ? n : undefined;
  try {
    return NextResponse.json(await getNetworkStatus(network));
  } catch {
    return NextResponse.json({ error: "NEAR RPC unavailable" }, { status: 502 });
  }
}
