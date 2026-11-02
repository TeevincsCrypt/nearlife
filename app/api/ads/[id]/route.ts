import { NextResponse } from "next/server";
import { bookingStatus } from "@/lib/ads";

export const dynamic = "force-dynamic";

/** Booking status for the advertiser (the booking id is the secret link). */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const status = await bookingStatus((await params).id);
  return status ? NextResponse.json(status) : NextResponse.json({ error: "Booking not found" }, { status: 404 });
}
