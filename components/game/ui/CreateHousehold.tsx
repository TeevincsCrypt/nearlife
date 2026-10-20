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
          className={cn("size-7 cursor-pointer rounded-full border-2", value === c ? "border-slate-900 ring-2 ring-slate-900/20" : "border-white shadow")}
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
    <div className="pointer-events-auto absolute inset-0 z-40 flex items-end justify-center bg-slate-900/30 sm:items-center">
      <div className="sheet-in flex max-h-[94vh] w-full max-w-md flex-col overflow-hidden rounded-t-[32px] bg-white shadow-2xl sm:rounded-[32px]">
        <div className="relative h-56 shrink-0 bg-gradient-to-b from-sky-200 to-emerald-100">
          <Canvas camera={{ position: [0, 1.1, 3.2], fov: 35 }}>
            <ambientLight intensity={0.7} />
            <directionalLight position={[2, 4, 3]} intensity={1.2} />
            <group position={[0, -0.6, 0]} rotation={[0, -0.35, 0]}>
              <Character3D look={c.look} pose="stand" />
            </group>
          </Canvas>
          <div className="absolute top-3 left-3 flex gap-1.5">
            {chars.map((d, i) => (
              <button
                key={i}
                onClick={() => setSel(i)}
                className={cn("cursor-pointer rounded-full px-3 py-1 text-sm font-semibold", i === sel ? "bg-slate-900 text-white" : "bg-white/80 text-slate-700")}
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
                className="cursor-pointer rounded-full bg-white/80 px-3 py-1 text-sm font-bold"
              >
                +
              </button>
            )}
          </div>
          <button onClick={() => update({ look: randomLook() })} className="absolute right-3 bottom-3 cursor-pointer rounded-full bg-white px-3 py-1.5 text-sm font-semibold shadow">
            🎲 Random
          </button>
        </div>

        <div className="space-y-4 overflow-y-auto p-5">
          <div className="text-2xl font-black">Create your household</div>
          <label className="block">
            <span className="text-xs font-semibold text-slate-500 uppercase">Household name</span>
            <input
              value={name}
              maxLength={32}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 outline-none focus:border-emerald-400"
            />
          </label>
          <div className="flex items-end gap-2">
            <label className="block flex-1">
              <span className="text-xs font-semibold text-slate-500 uppercase">Sim name</span>
              <input
                value={c.name}
                maxLength={16}
                onChange={(e) => update({ name: e.target.value })}
                className="mt-1 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 outline-none focus:border-emerald-400"
              />
            </label>
            {chars.length > 1 && (
              <button
                onClick={() => {
                  setChars(chars.filter((_, i) => i !== sel));
                  setSel(0);
                }}
                className="cursor-pointer rounded-2xl bg-rose-50 px-3 py-2.5 text-sm font-semibold text-rose-700"
              >
                Remove
              </button>
            )}
          </div>
          <div className="grid grid-cols-[70px_1fr] items-center gap-x-3 gap-y-3 text-sm">
            <span className="font-semibold text-slate-500">Skin</span>
            <Swatches colors={SKIN_TONES} value={c.look.skin} onChange={(skin) => setLook({ skin })} />
            <span className="font-semibold text-slate-500">Hair</span>
            <div className="flex flex-wrap gap-1.5">
              {HAIR_STYLES.map((h) => (
                <button
                  key={h}
                  onClick={() => setLook({ hairStyle: h })}
                  className={cn("cursor-pointer rounded-full px-2.5 py-1 text-xs font-semibold capitalize", c.look.hairStyle === h ? "bg-slate-900 text-white" : "bg-slate-100")}
                >
                  {h}
                </button>
              ))}
            </div>
            <span className="font-semibold text-slate-500">Color</span>
            <Swatches colors={HAIR_COLORS} value={c.look.hair} onChange={(hair) => setLook({ hair })} />
            <span className="font-semibold text-slate-500">Top</span>
            <Swatches colors={CLOTHES} value={c.look.top} onChange={(top) => setLook({ top })} />
          </div>
          <button
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              await onCreate({ name, displayName: auth.displayName, nearAccountId: auth.nearAddress ?? undefined, characters: chars });
              setBusy(false);
            }}
            className="w-full cursor-pointer rounded-full bg-emerald-500 py-3.5 text-lg font-bold text-white active:scale-[0.98] disabled:opacity-50"
          >
            🏠 Move in · 150 SB + starter flat
          </button>
          <div className="flex gap-2 border-t pt-4">
            <input
              value={invite}
              onChange={(e) => setInvite(e.target.value)}
              placeholder="Friend's invite code (hh_…)"
              className="min-w-0 flex-1 rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm"
            />
            <button
              disabled={!invite.trim() || busy}
              onClick={async () => {
                setBusy(true);
                await onCreate({ join: invite.trim(), displayName: auth.displayName });
                setBusy(false);
              }}
              className="cursor-pointer rounded-full bg-slate-900 px-4 py-2 text-sm font-bold text-white disabled:opacity-40"
            >
              Join
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
