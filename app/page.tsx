"use client";

import dynamic from "next/dynamic";

const Game = dynamic(() => import("@/components/game/Game"), {
  ssr: false,
  loading: () => <div className="flex h-dvh items-center justify-center bg-sky-100 text-slate-600">Loading NEARLIFE…</div>,
});

export default function Page() {
  return <Game />;
}
