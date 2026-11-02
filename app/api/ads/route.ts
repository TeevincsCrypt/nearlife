import { NextResponse } from "next/server";
import { AdError, createBooking, publicAds, type BookingInput } from "@/lib/ads";
import { readBody } from "@/lib/api";

export const dynamic = "force-dynamic";

/** Billboards: prices, availability and the ads running now. */
export async function GET() {
  return NextResponse.json(await publicAds());
}

/** Book a billboard. The NEAR payment to the treasury is checked on-chain; the owner then approves it. */
export async function POST(req: Request) {
  try {
    return NextResponse.json(await createBooking(await readBody<BookingInput>(req)));
  } catch (e) {
    if (e instanceof AdError) return NextResponse.json({ error: e.message }, { status: e.status });
    console.error(e);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
