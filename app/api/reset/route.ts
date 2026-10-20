import { NextResponse } from "next/server";
import { resetState } from "@/lib/store";

export const dynamic = "force-dynamic";

/** Reset the world. Requires NEARLIFE_ADMIN_TOKEN. */
export async function POST(req: Request) {
  const token = process.env.NEARLIFE_ADMIN_TOKEN;
  if (!token || req.headers.get("authorization") !== `Bearer ${token}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  await resetState();
  return NextResponse.json({ ok: true });
}
