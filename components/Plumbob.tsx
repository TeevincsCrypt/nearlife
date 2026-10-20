import { cn } from "@/lib/utils";

export function moodColor(mood: number) {
  if (mood >= 65) return "#22c55e";
  if (mood >= 35) return "#eab308";
  return "#ef4444";
}

export function moodLabel(mood: number) {
  if (mood >= 80) return "Very happy";
  if (mood >= 65) return "Happy";
  if (mood >= 45) return "Fine";
  if (mood >= 25) return "Uncomfortable";
  return "Miserable";
}

/** The Sims-style diamond, colored by mood. */
export function Plumbob({ mood, size = 14, className }: { mood: number; size?: number; className?: string }) {
  const c = moodColor(mood);
  return (
    <svg width={size} height={size * 1.6} viewBox="0 0 10 16" className={cn("plumbob drop-shadow-sm", className)} aria-label={`mood ${mood}`}>
      <polygon points="5,0 10,6 5,16 0,6" fill={c} />
      <polygon points="5,0 10,6 5,7" fill="white" opacity="0.35" />
      <polygon points="5,7 0,6 5,16" fill="black" opacity="0.12" />
    </svg>
  );
}
