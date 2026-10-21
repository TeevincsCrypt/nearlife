import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "NEARLIFE · Reveal",
  description: "Watch the NEARLIFE reveal: a shared life sim with a real economy on NEAR.",
  openGraph: { title: "NEARLIFE · Reveal", images: ["/reveal/poster.jpg"], videos: ["/reveal/nearlife-reveal.mp4"] },
};

// [left, top, width, show on phones]
const CLOUDS = [
  ["-2%", "14%", 170, true],
  ["80%", "4%", 220, true],
  ["86%", "34%", 150, false],
  ["3%", "46%", 140, false],
] as const;

export default function RevealPage() {
  return (
    <main className="relative min-h-dvh overflow-x-hidden bg-[linear-gradient(180deg,#2f7cf0_0%,#5aa6ff_40%,#a8dbff_75%,#d8f0ff_100%)] text-white">
      {/* sun + clouds */}
      <div className="pointer-events-none absolute -top-24 -left-24 size-[420px] rounded-full bg-[radial-gradient(circle,#fffbe0_0_13%,rgba(255,240,160,0.9)_15%,rgba(255,230,140,0.4)_32%,transparent_62%)]" />
      {CLOUDS.map(([l, t, w, phone], i) => (
        <svg key={i} className={`pointer-events-none absolute opacity-90 ${phone ? "" : "hidden lg:block"}`} style={{ left: l, top: t, width: w }} viewBox="0 0 200 90" aria-hidden>
          <g fill="#fff">
            <ellipse cx="60" cy="58" rx="52" ry="30" />
            <ellipse cx="105" cy="40" rx="48" ry="36" />
            <ellipse cx="148" cy="60" rx="46" ry="26" />
            <rect x="20" y="58" width="170" height="30" rx="15" />
          </g>
        </svg>
      ))}
      <svg className="pointer-events-none absolute bottom-0 left-0 h-48 w-full" viewBox="0 0 1440 200" preserveAspectRatio="none" aria-hidden>
        <path d="M0 80 Q 240 10 480 70 T 960 60 T 1440 70 V200 H0Z" fill="#9edb8f" />
        <path d="M0 130 Q 300 70 640 120 T 1440 115 V200 H0Z" fill="#6cc46a" />
        <path d="M0 170 Q 380 130 820 165 T 1440 155 V200 H0Z" fill="#4fae55" />
      </svg>

      <div className="relative mx-auto flex max-w-5xl flex-col items-center px-4 pt-10 pb-56 sm:pt-14">
        <div className="rounded-[26px] border-4 border-[#0d1b5e] bg-gradient-to-b from-[#5fd3ff] to-[#2f5be8] px-6 pt-1.5 pb-2.5 shadow-[inset_0_3px_0_rgba(255,255,255,0.5),0_6px_0_#0d1b5e]">
          <div className="font-display text-gold text-center text-5xl leading-[0.9] [-webkit-text-stroke:3px_#0d1b5e] [text-shadow:0_5px_0_#0d1b5e] sm:text-6xl">NEAR</div>
          <div className="font-display -mt-0.5 text-center text-4xl leading-[0.9] text-white [-webkit-text-stroke:3px_#0d1b5e] [paint-order:stroke_fill] [text-shadow:0_5px_0_#0d1b5e] sm:text-5xl">
            LIFE
          </div>
        </div>
        <h1 className="font-display mt-6 text-center text-3xl text-white [-webkit-text-stroke:5px_#0d1b5e] [paint-order:stroke_fill] [text-shadow:0_4px_0_#0d1b5e] sm:text-5xl">
          The <span className="text-[#ffd23f]">reveal</span>
        </h1>
        <p className="mt-2 max-w-xl text-center text-base font-extrabold text-[#0d1b5e] sm:text-lg">
          A shared life sim where your money, your stuff and your neighbors are real. Built on NEAR.
        </p>

        <div className="mt-6 w-full overflow-hidden rounded-[22px] border-[5px] border-white bg-white shadow-[0_0_0_4px_#0d1b5e,0_12px_0_4px_#0d1b5e,0_30px_60px_rgba(13,27,94,0.35)] sm:rounded-[30px] sm:border-[7px]">
          <video
            className="block aspect-video w-full rounded-[16px] bg-[#6fb7ff] sm:rounded-[22px]"
            src="/reveal/nearlife-reveal.mp4"
            poster="/reveal/poster.jpg"
            controls
            playsInline
            preload="metadata"
          />
        </div>

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/" className="btn-gold rounded-2xl px-8 py-3 text-2xl">
            PLAY NOW
          </Link>
          <a href="/reveal/nearlife-reveal.mp4" download className="btn-blue rounded-2xl px-6 py-3 text-xl">
            Download MP4
          </a>
        </div>
      </div>
    </main>
  );
}
