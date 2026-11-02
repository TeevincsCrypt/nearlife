import { NextResponse } from "next/server";
import { recordAdEvent } from "@/lib/ads";
import { readBody } from "@/lib/api";

export const dynamic = "force-dynamic";

/** Count a view or a click on a running ad (players' clients send each at most once per session). */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { type } = await readBody<{ type?: string }>(req);
  if (type === "view" || type === "click") await recordAdEvent((await params).id, type);
  return NextResponse.json({ ok: true });
}
