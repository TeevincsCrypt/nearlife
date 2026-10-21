"use client";

import { useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import type { Group } from "three";
import { useAuth } from "@/components/auth-provider";
import { randomLook } from "@/lib/looks";
import { Character3D } from "../three/Character3D";

function SpinningSim() {
  const ref = useRef<Group>(null);
  const look = useMemo(() => ({ ...randomLook(), top: "#3b82f6" }), []);
  useFrame(({ clock }) => {
    if (ref.current) ref.current.rotation.y = Math.sin(clock.elapsedTime * 0.8) * 0.5;
  });
  return (
    <group ref={ref} position={[0, -0.75, 0]}>
      <Character3D look={look} pose="stand" />
    </group>
  );
}

/** Title screen: sunburst, logo badge, hero Sim, and the start / login card. */
export function Welcome() {
  const auth = useAuth();
  const [name, setName] = useState("");
  return (
    <div className="pointer-events-auto absolute inset-0 z-40 overflow-hidden">
      {/* sunburst background */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#3a2fb8] via-[#5b3ee0] to-[#2b4fd6]" />
      <div
        className="absolute top-[38%] left-1/2 size-[160vmax] -translate-x-1/2 -translate-y-1/2 animate-[spin_60s_linear_infinite] opacity-40"
        style={{ background: "repeating-conic-gradient(from 0deg, #ffffff 0deg 6deg, transparent 6deg 18deg)", maskImage: "radial-gradient(circle, black 0%, transparent 55%)", WebkitMaskImage: "radial-gradient(circle, black 0%, transparent 55%)" }}
      />
      <div className="absolute top-[38%] left-1/2 size-80 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#9ad7ff] opacity-50 blur-3xl" />

      <div className="relative flex h-full flex-col items-center px-4 pt-[max(1.5rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))]">
        {/* logo badge */}
        <div className="relative mt-2 flex flex-col items-center">
          <div className="relative rounded-[28px] border-[4px] border-[#0d1b5e] bg-gradient-to-b from-[#5fd3ff] to-[#2f5be8] px-6 pt-2 pb-3 shadow-[inset_0_3px_0_rgba(255,255,255,0.5),0_6px_0_#0d1b5e]">
            <div className="font-display text-center text-[54px] leading-[0.9] text-gold [-webkit-text-stroke:3px_#0d1b5e] [text-shadow:0_5px_0_#0d1b5e]">NEAR</div>
            <div className="font-display -mt-1 text-center text-[44px] leading-[0.9] text-white [-webkit-text-stroke:3px_#0d1b5e] [paint-order:stroke_fill] [text-shadow:0_5px_0_#0d1b5e]">
              LIFE
            </div>
          </div>
          <div className="font-display relative z-10 -mt-2 rounded-lg border-[3px] border-[#7a3d00] bg-gradient-to-b from-[#ffe46b] to-[#f59e0b] px-3 py-0.5 text-sm text-white [-webkit-text-stroke:1px_#7a3d00] [paint-order:stroke_fill] shadow-[0_3px_0_#7a3d00]">
            A SHARED LIFE SIM ON NEAR
          </div>
        </div>

        {/* hero */}
        <div className="relative w-full flex-1">
          <Canvas camera={{ position: [0, 0.6, 2.6], fov: 32 }} style={{ position: "absolute", inset: 0 }}>
            <ambientLight intensity={0.9} />
            <directionalLight position={[2, 4, 3]} intensity={1.6} />
            <pointLight position={[-2, 1, 1]} intensity={8} color="#b28cff" />
            <pointLight position={[2, 0.5, 1.5]} intensity={6} color="#5fd3ff" />
            <SpinningSim />
          </Canvas>
        </div>

        {/* start card */}
        <div className="glass-strong w-full max-w-sm rounded-3xl p-4">
          <div className="font-display text-center text-2xl text-stroke">NEW LIFE</div>
          {auth.guestAvailable && (
            <form
              className="mt-3 flex flex-col gap-2.5"
              onSubmit={(e) => {
                e.preventDefault();
                auth.loginAsGuest(name || "Guest");
              }}
            >
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                maxLength={24}
                className="well rounded-2xl px-4 py-3 text-center text-base font-extrabold text-white outline-none placeholder:text-[#9fb6ff]"
              />
              <button type="submit" className="btn-gold mx-auto w-48 cursor-pointer rounded-2xl py-3 text-2xl">
                START
              </button>
            </form>
          )}
          {auth.privyAvailable && (
            <>
              <div className="mt-3 text-center text-[11px] font-black tracking-wider text-[#cfe0ff]">{auth.guestAvailable ? "OR LOG IN WITH:" : "LOG IN WITH:"}</div>
              <div className="mt-2 flex justify-center gap-3">
                {[
                  ["✉️", "Email"],
                  ["G", "Google"],
                ].map(([icon, label]) => (
                  <button
                    key={label}
                    onClick={auth.login}
                    aria-label={`Log in with ${label}`}
                    className="flex size-14 cursor-pointer items-center justify-center rounded-2xl border-[3px] border-[#0d1b5e] bg-white text-2xl font-black text-[#2446c8] shadow-[0_4px_0_#0d1b5e] active:translate-y-0.5"
                  >
                    {icon}
                  </button>
                ))}
              </div>
            </>
          )}
          <p className="mt-3 text-center text-[11px] font-bold text-[#cfe0ff]">No wallet popups. A NEAR account is created for you.</p>
        </div>
      </div>
    </div>
  );
}
