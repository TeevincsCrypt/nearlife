import { adImage, imageType } from "@/lib/ads";

export const dynamic = "force-dynamic";

/** An ad's logo, served from our own origin so the 3D billboard can draw it. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const buf = await adImage((await params).id);
  if (!buf) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(buf), {
    headers: { "content-type": imageType(buf), "cache-control": "public, max-age=86400", "x-content-type-options": "nosniff" },
  });
}
