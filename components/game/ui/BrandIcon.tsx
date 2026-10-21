"use client";

/** Official project logos, keyed by place id or Pad app id. Files live in /public/logos. */
export const LOGOS: Record<string, string> = {
  // places
  near_hq: "/logos/near.png",
  pool: "/logos/near.png",
  ref: "/logos/ref.svg",
  burrow: "/logos/burrow.png",
  rhea: "/logos/rhea.png",
  jumbo: "/logos/jumbo.png",
  aurora: "/logos/aurora.png",
  sputnik: "/logos/sputnik.svg",
  outlayer: "/logos/outlayer.png",
  meme: "/logos/meme.png",
  social: "/logos/nsocial.svg",
  meteor: "/logos/meteor.png",
  here: "/logos/here.png",
  intents: "/logos/intents.png",
  explorer: "/logos/explorer.svg",
  electric: "/logos/electric.png",
  a16z: "/logos/a16z.png",
  dragonfly: "/logos/dragonfly.png",
  // Pad apps that don't share a place id
  wallet: "/logos/near.png",
  names: "/logos/near.png",
  nsocial: "/logos/nsocial.svg",
};

/** A project's logo on a white tile, or its emoji when there is no logo. */
export function BrandIcon({ id, emoji, size = 40, radius = 12, className = "" }: { id: string; emoji: string; size?: number; radius?: number; className?: string }) {
  const src = LOGOS[id];
  if (!src) return <span className={className}>{emoji}</span>;
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center overflow-hidden bg-white ${className}`}
      style={{ width: size, height: size, borderRadius: radius }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="" width={size} height={size} draggable={false} className="size-full object-contain" />
    </span>
  );
}
