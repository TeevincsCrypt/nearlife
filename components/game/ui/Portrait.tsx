import { useId } from "react";
import type { CharacterLook } from "@/lib/types";

const FALLBACK: CharacterLook = { skin: "#c68a62", hair: "#1c1917", hairStyle: "short", top: "#3b82f6", bottom: "#1f2937" };

/** Illustrated head-and-shoulders portrait drawn from a Sim's look. */
export function Portrait({ look = FALLBACK, size = 56, ring }: { look?: CharacterLook; size?: number; ring?: string }) {
  const hair = look.hair;
  const uid = useId().replace(/:/g, "");
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className="shrink-0 rounded-full" style={{ boxShadow: ring ? `0 0 0 2px ${ring}, 0 0 14px ${ring}66` : undefined }}>
      <defs>
        <radialGradient id={`bg${uid}`} cx="50%" cy="35%" r="70%">
          <stop offset="0%" stopColor="#2a2f4f" />
          <stop offset="100%" stopColor="#0f1122" />
        </radialGradient>
        <clipPath id={`c${uid}`}>
          <circle cx="32" cy="32" r="32" />
        </clipPath>
      </defs>
      <g clipPath={`url(#c${uid})`}>
        <rect width="64" height="64" fill={`url(#bg${uid})`} />
        {look.hairStyle === "long" && <path d="M16 30 Q16 14 32 13 Q48 14 48 30 L49 52 L15 52 Z" fill={hair} />}
        {look.hairStyle === "afro" && <circle cx="32" cy="24" r="17" fill={hair} />}
        {/* shoulders */}
        <path d="M8 64 Q10 46 32 45 Q54 46 56 64 Z" fill={look.top} />
        <rect x="28" y="38" width="8" height="9" rx="3" fill={look.skin} />
        {/* face */}
        <ellipse cx="32" cy="29" rx="11.5" ry="13" fill={look.skin} />
        <circle cx="20.5" cy="30" r="2.6" fill={look.skin} />
        <circle cx="43.5" cy="30" r="2.6" fill={look.skin} />
        <circle cx="27.5" cy="29.5" r="1.6" fill="#231a14" />
        <circle cx="36.5" cy="29.5" r="1.6" fill="#231a14" />
        <path d="M28 36 Q32 38.5 36 36" stroke="#8a3b3b" strokeWidth="1.4" fill="none" strokeLinecap="round" />
        {look.hairStyle === "short" && <path d="M20.5 27 Q21 15 32 15 Q43 15 43.5 27 Q38 20 32 21 Q26 20 20.5 27 Z" fill={hair} />}
        {look.hairStyle === "long" && <path d="M20.5 28 Q21 15 32 15 Q43 15 43.5 28 Q38 19 32 20 Q26 19 20.5 28 Z" fill={hair} />}
        {look.hairStyle === "bun" && (
          <>
            <circle cx="32" cy="12.5" r="5" fill={hair} />
            <path d="M20.5 27 Q21 15 32 15 Q43 15 43.5 27 Q38 20 32 21 Q26 20 20.5 27 Z" fill={hair} />
          </>
        )}
        {look.hairStyle === "afro" && <path d="M21 26 Q24 20 32 20 Q40 20 43 26 L43 22 Q32 12 21 22 Z" fill={hair} />}
      </g>
    </svg>
  );
}
