"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { CanvasTexture, SRGBColorSpace, type Group } from "three";
import { Anchor } from "./anchors";
import type { ActivityEvent, HouseholdView } from "@/lib/types";

export type Landmark = "market" | "office" | "park";

const NEON = "#00ec97";
const NEON_2 = "#a78bfa";
const NEON_3 = "#22d3ee";

const ROADS_X = [-14, 0, 14];
const ROADS_Z = [-12, 0, 12];

/** House plots sorted by distance from the center. */
function plotSlots(): Array<[number, number]> {
  const out: Array<[number, number]> = [];
  for (let x = -28; x <= 28; x += 4.5) {
    for (let z = -24; z <= 22; z += 4.5) {
      const nearRoadX = ROADS_X.some((r) => Math.abs(x - r) < 3);
      const nearRoadZ = ROADS_Z.some((r) => Math.abs(z - r) < 3);
      const civic = Math.abs(x) < 12 && Math.abs(z) < 10;
      const canal = z > 22;
      if (!nearRoadX && !nearRoadZ && !civic && !canal) out.push([x, z]);
    }
  }
  return out.sort((a, b) => Math.hypot(a[0], a[1] * 1.2) - Math.hypot(b[0], b[1] * 1.2));
}
const SLOTS = plotSlots();
/** How many empty "available" plots to show after the occupied ones. */
const OPEN_PLOTS = 4;

function Glow({ p, s, c, i = 2 }: { p: [number, number, number]; s: [number, number, number]; c: string; i?: number }) {
  return (
    <mesh position={p}>
      <boxGeometry args={s} />
      <meshStandardMaterial color={c} emissive={c} emissiveIntensity={i} toneMapped={false} />
    </mesh>
  );
}

/** Modern flat-roof home with neon trim in the household's color. */
function House({ color, mine }: { color: string; mine?: boolean }) {
  const w = 2.6;
  const h = 1.5;
  return (
    <group>
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[w + 1.2, w + 1.2]} />
        <meshStandardMaterial color={mine ? "#3b3a1e" : "#2a2f3f"} />
      </mesh>
      <mesh position={[0, h / 2, 0]} castShadow>
        <boxGeometry args={[w, h, w]} />
        <meshStandardMaterial color="#e8e6f0" />
      </mesh>
      {/* overhanging roof slab */}
      <mesh position={[0, h + 0.08, 0.1]} castShadow>
        <boxGeometry args={[w + 0.4, 0.16, w + 0.6]} />
        <meshStandardMaterial color="#20222e" />
      </mesh>
      <Glow p={[0, h - 0.02, w / 2 + 0.41]} s={[w + 0.4, 0.04, 0.03]} c={mine ? "#fbbf24" : color} />
      {/* glass front + door */}
      <mesh position={[-0.45, 0.8, w / 2 + 0.01]}>
        <planeGeometry args={[1.1, 0.9]} />
        <meshStandardMaterial color="#1b2550" emissive="#fcd34d" emissiveIntensity={0.25} />
      </mesh>
      <mesh position={[0.75, 0.5, w / 2 + 0.01]}>
        <planeGeometry args={[0.5, 1.0]} />
        <meshStandardMaterial color="#20222e" />
      </mesh>
    </group>
  );
}

/** An empty plot waiting for a new player. */
function OpenPlot() {
  return (
    <group>
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[3.6, 3.6]} />
        <meshStandardMaterial color="#35503f" />
      </mesh>
      {[
        [0, 1.8, 3.6, 0.05],
        [0, -1.8, 3.6, 0.05],
        [1.8, 0, 0.05, 3.6],
        [-1.8, 0, 0.05, 3.6],
      ].map(([x, z, w, d], i) => (
        <Glow key={i} p={[x, 0.04, z]} s={[w, 0.03, d]} c={NEON} i={0.8} />
      ))}
      <mesh position={[0, 0.5, 0]}>
        <cylinderGeometry args={[0.04, 0.04, 1]} />
        <meshStandardMaterial color="#9ca3af" />
      </mesh>
      <Glow p={[0, 1.05, 0]} s={[0.8, 0.4, 0.05]} c={NEON} i={0.9} />
    </group>
  );
}

function Tree({ p, s = 1 }: { p: [number, number]; s?: number }) {
  return (
    <group position={[p[0], 0, p[1]]} scale={s}>
      <mesh position={[0, 0.4, 0]}>
        <cylinderGeometry args={[0.1, 0.13, 0.8]} />
        <meshStandardMaterial color="#5b3a22" />
      </mesh>
      <mesh position={[0, 1.2, 0]} castShadow>
        <sphereGeometry args={[0.6, 10, 8]} />
        <meshStandardMaterial color="#2f7d55" flatShading />
      </mesh>
    </group>
  );
}

function StreetLamp({ p }: { p: [number, number] }) {
  return (
    <group position={[p[0], 0, p[1]]}>
      <mesh position={[0, 0.9, 0]}>
        <cylinderGeometry args={[0.05, 0.06, 1.8]} />
        <meshStandardMaterial color="#1f2937" />
      </mesh>
      <mesh position={[0, 1.85, 0]}>
        <sphereGeometry args={[0.13, 12, 10]} />
        <meshStandardMaterial color="#fef3c7" emissive="#fde68a" emissiveIntensity={2} toneMapped={false} />
      </mesh>
    </group>
  );
}

function Car({ axis, line, color, speed, offset }: { axis: "x" | "z"; line: number; color: string; speed: number; offset: number }) {
  const ref = useRef<Group>(null);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = ((clock.elapsedTime * speed + offset) % 70) - 35;
    if (axis === "x") ref.current.position.set(t, 0.25, line + (speed > 0 ? 0.5 : -0.5));
    else ref.current.position.set(line + (speed > 0 ? 0.5 : -0.5), 0.25, t);
    ref.current.rotation.y = axis === "x" ? (speed > 0 ? Math.PI / 2 : -Math.PI / 2) : speed > 0 ? 0 : Math.PI;
  });
  return (
    <group ref={ref}>
      <mesh castShadow>
        <boxGeometry args={[0.6, 0.28, 1.15]} />
        <meshStandardMaterial color={color} metalness={0.3} roughness={0.4} />
      </mesh>
      <mesh position={[0, 0.24, -0.05]}>
        <boxGeometry args={[0.5, 0.2, 0.6]} />
        <meshStandardMaterial color="#0f172a" />
      </mesh>
      <Glow p={[0, 0, 0.58]} s={[0.45, 0.06, 0.02]} c="#fef3c7" />
      <Glow p={[0, 0, -0.58]} s={[0.45, 0.06, 0.02]} c="#f43f5e" />
    </group>
  );
}

/** Night market: stalls under strings of lights. */
function Market() {
  const awnings = [NEON, NEON_2, NEON_3, "#f472b6", "#fbbf24", NEON];
  return (
    <group position={[7, 0, -5.5]}>
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[9, 7]} />
        <meshStandardMaterial color="#2b2840" />
      </mesh>
      {awnings.map((c, i) => (
        <group key={i} position={[-3 + (i % 3) * 3, 0, -1.5 + Math.floor(i / 3) * 3]}>
          <mesh position={[0, 0.45, 0]}>
            <boxGeometry args={[1.8, 0.9, 1]} />
            <meshStandardMaterial color="#3f3a5a" />
          </mesh>
          <mesh position={[0, 1.6, 0]}>
            <boxGeometry args={[2.0, 0.06, 1.3]} />
            <meshStandardMaterial color="#1f1d2e" />
          </mesh>
          <Glow p={[0, 1.56, 0.66]} s={[2.0, 0.05, 0.03]} c={c} />
          {[-0.9, 0.9].map((x) => (
            <mesh key={x} position={[x, 0.8, -0.55]}>
              <cylinderGeometry args={[0.04, 0.04, 1.6]} />
              <meshStandardMaterial color="#57534e" />
            </mesh>
          ))}
        </group>
      ))}
      {/* string lights */}
      {Array.from({ length: 14 }).map((_, i) => (
        <mesh key={i} position={[-4 + i * 0.62, 2.35 - Math.sin((i / 13) * Math.PI) * 0.35, 0]}>
          <sphereGeometry args={[0.07, 8, 6]} />
          <meshStandardMaterial color="#fde68a" emissive={i % 3 === 0 ? "#f472b6" : "#fde68a"} emissiveIntensity={2} toneMapped={false} />
        </mesh>
      ))}
      <Anchor id="lm:market" offsetY={3.2} scaleRef={40} />
    </group>
  );
}

/** Work hub: towers with lit window bands. */
function WorkHub() {
  return (
    <group position={[-7, 0, -5.5]}>
      {[
        [-1.6, 0, 7, "#2b3245"],
        [1.4, -0.5, 10, "#232a3b"],
        [0.2, 2, 5, "#353d52"],
      ].map(([x, z, h, c], i) => (
        <group key={i} position={[x as number, 0, z as number]}>
          <mesh position={[0, (h as number) / 2, 0]} castShadow>
            <boxGeometry args={[2.4, h as number, 2.4]} />
            <meshStandardMaterial color={c as string} />
          </mesh>
          {Array.from({ length: Math.floor((h as number) / 1.2) }).map((_, j) => (
            <Glow key={j} p={[0, 0.8 + j * 1.2, 1.21]} s={[2.0, 0.18, 0.02]} c={j % 2 ? NEON_3 : "#93c5fd"} i={0.9} />
          ))}
          <Glow p={[0, h as number, 0]} s={[2.42, 0.06, 2.42]} c={NEON_2} i={1.4} />
        </group>
      ))}
      <Anchor id="lm:office" offsetY={11.5} scaleRef={40} />
    </group>
  );
}

/** Plaza with a neon fountain. */
function Plaza() {
  return (
    <group position={[-7, 0, 5.5]}>
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[9, 7]} />
        <meshStandardMaterial color="#3d6b56" />
      </mesh>
      <mesh position={[0.5, 0.15, 0.3]}>
        <cylinderGeometry args={[1.6, 1.7, 0.3, 32]} />
        <meshStandardMaterial color="#3a3f55" />
      </mesh>
      <mesh position={[0.5, 0.31, 0.3]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[1.45, 32]} />
        <meshStandardMaterial color="#0e7490" emissive="#22d3ee" emissiveIntensity={0.5} />
      </mesh>
      <mesh position={[0.5, 0.33, 0.3]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.62, 0.04, 8, 48]} />
        <meshStandardMaterial color={NEON} emissive={NEON} emissiveIntensity={2} toneMapped={false} />
      </mesh>
      {[
        [-3, -2],
        [-3.3, 1.8],
        [3.4, -2.4],
        [3.2, 2.5],
      ].map((p, i) => (
        <Tree key={i} p={p as [number, number]} s={1.1} />
      ))}
      <Anchor id="lm:park" offsetY={3} scaleRef={40} />
    </group>
  );
}

function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number) {
  const words = text.split(" ");
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = w;
    } else line = test;
  }
  if (line) lines.push(line);
  return lines;
}

/** Screen showing the latest trade, drawn into a canvas texture. */
function TradeScreen({ text }: { text: string }) {
  const texture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 1024;
    canvas.height = 456;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#0b0d17";
    ctx.fillRect(0, 0, 1024, 456);
    ctx.strokeStyle = NEON;
    ctx.lineWidth = 10;
    ctx.strokeRect(10, 10, 1004, 436);
    ctx.fillStyle = NEON;
    ctx.font = "bold 34px ui-monospace, monospace";
    ctx.fillText("▲ NEARLIFE TRADES · LIVE", 48, 80);
    ctx.fillStyle = "#e5e7eb";
    ctx.font = "800 50px system-ui, sans-serif";
    wrap(ctx, text, 930)
      .slice(0, 5)
      .forEach((l, i) => ctx.fillText(l, 48, 160 + i * 62));
    const t = new CanvasTexture(canvas);
    t.colorSpace = SRGBColorSpace;
    return t;
  }, [text]);
  return (
    <group position={[7, 0, 5.5]}>
      <mesh position={[0, 1.6, 0]}>
        <boxGeometry args={[0.3, 3.2, 0.3]} />
        <meshStandardMaterial color="#1f2937" />
      </mesh>
      <mesh position={[0, 3.6, 0]}>
        <boxGeometry args={[5.4, 2.6, 0.2]} />
        <meshStandardMaterial color="#0b0d17" />
      </mesh>
      <mesh position={[0, 3.6, 0.11]}>
        <planeGeometry args={[5.1, 2.27]} />
        <meshBasicMaterial map={texture} toneMapped={false} />
      </mesh>
    </group>
  );
}

/** Player households in plot order, so overlay markers can match houses by id. */
export function cityPlacement(households: HouseholdView[]) {
  return [...households]
    .sort((a, b) => a.createdAt - b.createdAt)
    .slice(0, SLOTS.length)
    .map((h, i) => ({ h, pos: SLOTS[i] }));
}

export function City({ households, myHouseholdId, latestTrade }: { households: HouseholdView[]; myHouseholdId?: string | null; latestTrade?: ActivityEvent }) {
  const placed = useMemo(() => cityPlacement(households), [households]);
  const open = SLOTS.slice(placed.length, placed.length + OPEN_PLOTS);
  const lamps = useMemo(() => {
    const out: Array<[number, number]> = [];
    for (const z of ROADS_Z) for (let x = -30; x <= 30; x += 7.5) out.push([x + 1.6, z + 1.6]);
    return out;
  }, []);

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
        <planeGeometry args={[90, 90]} />
        <meshStandardMaterial color="#4c7a61" />
      </mesh>
      {/* canal */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.0, 34]}>
        <planeGeometry args={[90, 22]} />
        <meshStandardMaterial color="#1d4f86" emissive="#1e3a8a" emissiveIntensity={0.3} />
      </mesh>
      <Glow p={[0, 0.02, 23.2]} s={[90, 0.03, 0.12]} c={NEON_3} i={1.2} />
      {ROADS_X.map((x) => (
        <group key={`rx${x}`}>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[x, 0.01, -5]}>
            <planeGeometry args={[2.4, 56]} />
            <meshStandardMaterial color="#262a36" />
          </mesh>
          <Glow p={[x, 0.02, -5]} s={[0.06, 0.01, 56]} c={NEON} i={1.1} />
        </group>
      ))}
      {ROADS_Z.map((z) => (
        <group key={`rz${z}`}>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, z]}>
            <planeGeometry args={[80, 2.4]} />
            <meshStandardMaterial color="#262a36" />
          </mesh>
          <Glow p={[0, 0.022, z]} s={[80, 0.01, 0.06]} c={NEON} i={1.1} />
        </group>
      ))}
      {lamps.map((p, i) => (
        <StreetLamp key={i} p={p} />
      ))}
      <Car axis="x" line={0} color="#f43f5e" speed={4} offset={0} />
      <Car axis="x" line={12} color="#fbbf24" speed={-3.2} offset={20} />
      <Car axis="z" line={14} color="#22d3ee" speed={3.6} offset={10} />
      <Car axis="z" line={-14} color="#e5e7eb" speed={-4.2} offset={40} />
      <Car axis="x" line={-12} color="#a78bfa" speed={3} offset={33} />

      <Market />
      <WorkHub />
      <Plaza />
      <TradeScreen text={latestTrade ? `${latestTrade.emoji} ${latestTrade.text}` : "No trades yet. Make something and list it on the night market."} />

      {placed.map(({ h, pos }) => (
        <group key={h.id} position={[pos[0], 0, pos[1]]}>
          <House color={h.color} mine={h.id === myHouseholdId} />
          <Anchor id={`hh:${h.id}`} offsetY={3.2} scaleRef={40} />
        </group>
      ))}
      {open.map((pos, i) => (
        <group key={`open${i}`} position={[pos[0], 0, pos[1]]}>
          <OpenPlot />
        </group>
      ))}

      {[
        [-20, -16],
        [20, -17],
        [-25, 8],
        [26, 4],
        [-12, 18],
        [12, 19],
        [-30, -2],
        [31, -12],
        [0, 19],
        [-4, -18],
      ].map((p, i) => (
        <Tree key={i} p={p as [number, number]} s={1.3} />
      ))}
    </group>
  );
}
