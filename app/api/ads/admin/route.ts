import { NextResponse } from "next/server";
import { AdError, allBookings, isAdmin, reviewBooking } from "@/lib/ads";
import { readBody } from "@/lib/api";

export const dynamic = "force-dynamic";

/** Owner only (Authorization: Bearer NEARLIFE_ADMIN_TOKEN): every booking, with contact details. */
export async function GET(req: Request) {
  if (!isAdmin(req)) return NextResponse.json({ error: "Wrong admin token" }, { status: 401 });
  return NextResponse.json({ bookings: await allBookings() });
}

/** Approve, reject or take down a booking. */
export async function POST(req: Request) {
  if (!isAdmin(req)) return NextResponse.json({ error: "Wrong admin token" }, { status: 401 });
  const body = await readBody<{ id?: string; op?: "approve" | "reject" | "stop"; note?: string }>(req);
  if (!body.id || !["approve", "reject", "stop"].includes(body.op ?? "")) return NextResponse.json({ error: "Bad request" }, { status: 400 });
  try {
    return NextResponse.json({ booking: await reviewBooking(body.id, body.op!, body.note ?? "") });
  } catch (e) {
    if (e instanceof AdError) return NextResponse.json({ error: e.message }, { status: e.status });
    throw e;
  }
}
