"use client";

import { useState } from "react";
import { Canvas } from "@react-three/fiber";
import { useAuth } from "@/components/auth-provider";
import { CLOTHES, HAIR_COLORS, HAIR_STYLES, SKIN_TONES, randomLook } from "@/lib/looks";
import type { CharacterLook } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Character3D } from "../three/Character3D";

const NAMES = ["Sam", "Robin", "Alex", "Jo", "Kai", "Noa", "Remy", "Ari", "Max", "Lee", "Dani", "Quinn", "Tolu", "Ada", "Kemi", "Femi"];
const AVATARS = ["🧑", "👩", "👨", "🧑🏽", "👩🏾", "👨🏿", "🧑🏼", "👩🏻"];

interface Draft {
  name: string;
  avatar: string;
  look: CharacterLook;
}

function newDraft(i: number): Draft {
  return { name: NAMES[Math.floor(Math.random() * NAMES.length)], avatar: AVATARS[i % AVATARS.length], look: randomLook() };
}

function Swatches({ colors, value, onChange }: { colors: string[]; value: string; onChange: (c: string) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {colors.map((c) => (
        <button
          key={c}
          onClick={() => onChange(c)}
          className={cn("size-7 cursor-pointer rounded-full border-2", value === c ? "border-[#ffd23f] ring-[3px] ring-[#0d1b5e]" : "border-[#0d1b5e]")}
          style={{ background: c }}
        />
      ))}
    </div>
  );
}

export function CreateHousehold({ onCreate }: { onCreate: (body: unknown) => Promise<void> }) {
  const auth = useAuth();
  const [name, setName] = useState(`${auth.displayName || "My"}'s Place`);
  const [chars, setChars] = useState<Draft[]>([newDraft(0)]);
  const [sel, setSel] = useState(0);
  const [busy, setBusy] = useState(false);
  const [invite, setInvite] = useState("");
  const c = chars[sel];
  const update = (patch: Partial<Draft> | ((d: Draft) => Draft)) =>
    setChars(chars.map((d, i) => (i === sel ? (typeof patch === "function" ? patch(d) : { ...d, ...patch }) : d)));
  const setLook = (patch: Partial<CharacterLook>) => update((d) => ({ ...d, look: { ...d.look, ...patch } }));

  return (
    <div className="pointer-events-auto absolute inset-0 z-40 flex items-end justify-center bg-black/50 backdrop-blur-sm sm:items-center">
      <div className="sheet-in glass-strong flex max-h-[94vh] w-full max-w-md flex-col overflow-hidden rounded-t-3xl shadow-2xl sm:rounded-3xl">
        <div className="relative h-60 shrink-0 bg-[radial-gradient(ellipse_at_bottom,#9ad7ff,#3d6cf2_70%)]">
          <Canvas camera={{ position: [0, 0.9, 2.6], fov: 35 }}>
            <ambientLight intensity={0.8} />
            <directionalLight position={[2, 4, 3]} intensity={1.4} />
            <pointLight position={[-2, 1, 1]} intensity={6} color="#a78bfa" />
            <pointLight position={[2, 0.5, 1]} intensity={5} color="#00ec97" />
            <group position={[0, -0.75, 0]} rotation={[0, -0.35, 0]}>
              <Character3D look={c.look} pose="stand" />
            </group>
          </Canvas>
          <div className="absolute top-3 left-3 flex gap-1.5">
            {chars.map((d, i) => (
              <button
                key={i}
                onClick={() => setSel(i)}
                className={cn("cursor-pointer rounded-full px-3 py-1 text-sm font-semibold", i === sel ? "btn-neon" : "bg-white/10 text-slate-200")}
              >
                {d.name || "?"}
              </button>
            ))}
            {chars.length < 4 && (
              <button
                onClick={() => {
                  setChars([...chars, newDraft(chars.length)]);
                  setSel(chars.length);
                }}
                className="cursor-pointer rounded-full bg-white/10 px-3 py-1 text-sm font-bold text-slate-200"
              >
                +
              </button>
            )}
          </div>
          <button onClick={() => update({ look: randomLook() })} className="btn-gold absolute right-3 bottom-3 cursor-pointer rounded-xl px-3 py-1.5 text-sm">
            🎲 Random
          </button>
        </div>

        <div className="space-y-4 overflow-y-auto p-5">
          <div className="font-display text-2xl text-stroke uppercase">Create your household</div>
          <label className="block">
            <span className="text-[11px] font-black tracking-widest text-[#ffd23f] uppercase">Household name</span>
            <input
              value={name}
              maxLength={32}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 text-white outline-none focus:border-[#ffd23f]"
            />
          </label>
          <div className="flex items-end gap-2">
            <label className="block flex-1">
              <span className="text-[11px] font-black tracking-widest text-[#ffd23f] uppercase">Sim name</span>
              <input
                value={c.name}
                maxLength={16}
                onChange={(e) => update({ name: e.target.value })}
                className="mt-1 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 text-white outline-none focus:border-[#ffd23f]"
              />
            </label>
            {chars.length > 1 && (
              <button
                onClick={() => {
                  setChars(chars.filter((_, i) => i !== sel));
                  setSel(0);
                }}
                className="cursor-pointer rounded-2xl bg-rose-500/15 px-3 py-2.5 text-sm font-semibold text-rose-300"
              >
                Remove
              </button>
            )}
          </div>
          <div className="grid grid-cols-[70px_1fr] items-center gap-x-3 gap-y-3 text-sm">
            <span className="font-semibold text-slate-400">Skin</span>
            <Swatches colors={SKIN_TONES} value={c.look.skin} onChange={(skin) => setLook({ skin })} />
            <span className="font-semibold text-slate-400">Hair</span>
            <div className="flex flex-wrap gap-1.5">
              {HAIR_STYLES.map((h) => (
                <button
                  key={h}
                  onClick={() => setLook({ hairStyle: h })}
                  className={cn("cursor-pointer rounded-full px-2.5 py-1 text-xs font-semibold capitalize", c.look.hairStyle === h ? "btn-neon" : "bg-white/10 text-slate-300")}
                >
                  {h}
                </button>
              ))}
            </div>
            <span className="font-semibold text-slate-400">Color</span>
            <Swatches colors={HAIR_COLORS} value={c.look.hair} onChange={(hair) => setLook({ hair })} />
            <span className="font-semibold text-slate-400">Top</span>
            <Swatches colors={CLOTHES} value={c.look.top} onChange={(top) => setLook({ top })} />
          </div>
          <button
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              await onCreate({ name, displayName: auth.displayName, nearAccountId: auth.nearAddress ?? undefined, characters: chars });
              setBusy(false);
            }}
            className="btn-neon w-full cursor-pointer rounded-2xl py-3.5 text-lg font-bold active:scale-[0.98] disabled:opacity-50"
          >
            Move in · 150 SB + starter flat
          </button>
          <div className="flex gap-2 border-t border-white/10 pt-4">
            <input
              value={invite}
              onChange={(e) => setInvite(e.target.value)}
              placeholder="Friend's invite code (hh_…)"
              className="min-w-0 flex-1 rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white placeholder:text-slate-500"
            />
            <button
              disabled={!invite.trim() || busy}
              onClick={async () => {
                setBusy(true);
                await onCreate({ join: invite.trim(), displayName: auth.displayName });
                setBusy(false);
              }}
              className="cursor-pointer rounded-2xl bg-white/10 px-4 py-2 text-sm font-bold text-white disabled:opacity-40"
            >
              Join
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
