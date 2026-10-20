"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { CanvasTexture, SRGBColorSpace, type Group } from "three";
import { Anchor } from "./anchors";
import type { ActivityEvent, HouseholdView, NpcRole } from "@/lib/types";

export const ROLE_EMOJI: Record<NpcRole, string> = { chef: "🍲", barista: "☕", host: "🎉", artisan: "🔨", commuter: "💼" };

export type Landmark = "market" | "office" | "park";

const ROADS_X = [-14, 0, 14];
const ROADS_Z = [-12, 0, 12];

/** House plots sorted by distance from the center; NPCs take the first ones. */
function plotSlots(): Array<[number, number]> {
  const out: Array<[number, number]> = [];
  for (let x = -28; x <= 28; x += 4.5) {
    for (let z = -24; z <= 22; z += 4.5) {
      const nearRoadX = ROADS_X.some((r) => Math.abs(x - r) < 3);
      const nearRoadZ = ROADS_Z.some((r) => Math.abs(z - r) < 3);
      const civic = Math.abs(x) < 12 && Math.abs(z) < 10;
      const lagoon = z > 22;
      if (!nearRoadX && !nearRoadZ && !civic && !lagoon) out.push([x, z]);
    }
  }
  return out.sort((a, b) => Math.hypot(a[0], a[1] * 1.2) - Math.hypot(b[0], b[1] * 1.2));
}
const SLOTS = plotSlots();

function House({ color, big, mine }: { color: string; big?: boolean; mine?: boolean }) {
  const w = big ? 3 : 2.4;
  const h = big ? 1.8 : 1.4;
  return (
    <group>
      <mesh position={[0, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[w + 1.4, w + 1.4]} />
        <meshStandardMaterial color={mine ? "#fde68a" : "#e7e5e4"} />
      </mesh>
      <mesh position={[0, h / 2, 0]} castShadow>
        <boxGeometry args={[w, h, w]} />
        <meshStandardMaterial color="#f5f5f4" />
      </mesh>
      <mesh position={[0, h + 0.55, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
        <coneGeometry args={[w * 0.82, 1.1, 4]} />
        <meshStandardMaterial color={color} flatShading />
      </mesh>
      <mesh position={[0.3, 0.45, w / 2 + 0.01]}>
        <boxGeometry args={[0.5, 0.9, 0.02]} />
        <meshStandardMaterial color="#5b3a1f" />
      </mesh>
      <mesh position={[-0.55, 0.85, w / 2 + 0.01]}>
        <boxGeometry args={[0.5, 0.4, 0.02]} />
        <meshStandardMaterial color="#bae6fd" />
      </mesh>
    </group>
  );
}

function Tree({ p, s = 1 }: { p: [number, number]; s?: number }) {
  return (
    <group position={[p[0], 0, p[1]]} scale={s}>
      <mesh position={[0, 0.4, 0]}>
        <cylinderGeometry args={[0.1, 0.13, 0.8]} />
        <meshStandardMaterial color="#7c4a1e" />
      </mesh>
      <mesh position={[0, 1.15, 0]} castShadow>
        <coneGeometry args={[0.6, 1.3, 7]} />
        <meshStandardMaterial color="#3f8f46" flatShading />
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
        <boxGeometry args={[0.6, 0.3, 1.1]} />
        <meshStandardMaterial color={color} />
      </mesh>
      <mesh position={[0, 0.25, -0.05]}>
        <boxGeometry args={[0.5, 0.22, 0.6]} />
        <meshStandardMaterial color="#e0f2fe" />
      </mesh>
    </group>
  );
}

function Market() {
  const awnings = ["#ef4444", "#f59e0b", "#10b981", "#3b82f6", "#ec4899", "#8b5cf6"];
  return (
    <group position={[7, 0, -5.5]}>
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[9, 7]} />
        <meshStandardMaterial color="#d6c7a1" />
      </mesh>
      {awnings.map((c, i) => (
        <group key={i} position={[-3 + (i % 3) * 3, 0, -1.5 + Math.floor(i / 3) * 3]}>
          <mesh position={[0, 0.45, 0]}>
            <boxGeometry args={[1.8, 0.9, 1]} />
            <meshStandardMaterial color="#a16207" />
          </mesh>
          <mesh position={[0, 1.55, 0]} rotation={[0.25, 0, 0]}>
            <boxGeometry args={[2.1, 0.08, 1.4]} />
            <meshStandardMaterial color={c} />
          </mesh>
          {[-0.9, 0.9].map((x) => (
            <mesh key={x} position={[x, 0.8, -0.55]}>
              <cylinderGeometry args={[0.04, 0.04, 1.6]} />
              <meshStandardMaterial color="#57534e" />
            </mesh>
          ))}
        </group>
      ))}
      <Anchor id="lm:market" offsetY={3.2} scaleRef={40} />
    </group>
  );
}

function Office() {
  return (
    <group position={[-7, 0, -5.5]}>
      {[
        [-1.6, 0, 7, "#64748b"],
        [1.4, -0.5, 10, "#475569"],
        [0.2, 2, 5, "#94a3b8"],
      ].map(([x, z, h, c], i) => (
        <group key={i} position={[x as number, 0, z as number]}>
          <mesh position={[0, (h as number) / 2, 0]} castShadow>
            <boxGeometry args={[2.4, h as number, 2.4]} />
            <meshStandardMaterial color={c as string} />
          </mesh>
          {Array.from({ length: Math.floor((h as number) / 1.2) }).map((_, j) => (
            <mesh key={j} position={[0, 0.8 + j * 1.2, 1.21]}>
              <boxGeometry args={[2.0, 0.5, 0.02]} />
              <meshStandardMaterial color="#bfdbfe" emissive="#60a5fa" emissiveIntensity={0.15} />
            </mesh>
          ))}
        </group>
      ))}
      <Anchor id="lm:office" offsetY={11.5} scaleRef={40} />
    </group>
  );
}

function Park() {
  return (
    <group position={[-7, 0, 5.5]}>
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[9, 7]} />
        <meshStandardMaterial color="#86c26b" />
      </mesh>
      <mesh position={[1, 0.04, 0.5]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[1.8, 24]} />
        <meshStandardMaterial color="#38bdf8" />
      </mesh>
      {[
        [-3, -2],
        [-3.3, 1.8],
        [3.4, -2.4],
        [3.2, 2.5],
        [-1, -2.8],
      ].map((p, i) => (
        <Tree key={i} p={p as [number, number]} s={1.2} />
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

/** Billboard showing the latest trade, drawn into a canvas texture. */
function Billboard({ text }: { text: string }) {
  const texture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 1024;
    canvas.height = 456;
    const ctx = canvas.getContext("2d")!;
    const g = ctx.createLinearGradient(0, 0, 1024, 456);
    g.addColorStop(0, "#4f46e5");
    g.addColorStop(0.55, "#7c3aed");
    g.addColorStop(1, "#c026d3");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 1024, 456);
    ctx.fillStyle = "#f5d0fe";
    ctx.font = "bold 34px system-ui, sans-serif";
    ctx.fillText("● LIVE · NEIGHBORHOOD MARKET", 48, 80);
    ctx.fillStyle = "#ffffff";
    ctx.font = "800 52px system-ui, sans-serif";
    wrap(ctx, text, 930)
      .slice(0, 5)
      .forEach((l, i) => ctx.fillText(l, 48, 160 + i * 64));
    const t = new CanvasTexture(canvas);
    t.colorSpace = SRGBColorSpace;
    return t;
  }, [text]);
  return (
    <group position={[7, 0, 5.5]}>
      {[-2.2, 2.2].map((x) => (
        <mesh key={x} position={[x, 1.6, 0]}>
          <cylinderGeometry args={[0.1, 0.1, 3.2]} />
          <meshStandardMaterial color="#334155" />
        </mesh>
      ))}
      <mesh position={[0, 3.6, 0]}>
        <boxGeometry args={[5.4, 2.6, 0.2]} />
        <meshStandardMaterial color="#1e1b4b" />
      </mesh>
      <mesh position={[0, 3.6, 0.11]}>
        <planeGeometry args={[5.1, 2.27]} />
        <meshBasicMaterial map={texture} toneMapped={false} />
      </mesh>
    </group>
  );
}

/** Same ordering the map uses, so overlay markers can match houses by id. */
export function cityPlacement(households: HouseholdView[]) {
  const npcs = households.filter((h) => h.kind === "npc").sort((a, b) => a.id.localeCompare(b.id));
  const players = households.filter((h) => h.kind === "player").sort((a, b) => a.createdAt - b.createdAt);
  return [...npcs, ...players].slice(0, SLOTS.length).map((h, i) => ({ h, pos: SLOTS[i] }));
}

export function City({ households, myHouseholdId, latestTrade }: { households: HouseholdView[]; myHouseholdId?: string | null; latestTrade?: ActivityEvent }) {
  const placed = useMemo(() => cityPlacement(households), [households]);

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
        <planeGeometry args={[90, 90]} />
        <meshStandardMaterial color="#9dc97f" />
      </mesh>
      {/* lagoon */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.0, 34]}>
        <planeGeometry args={[90, 22]} />
        <meshStandardMaterial color="#4fb3e8" />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 23.2]}>
        <planeGeometry args={[90, 1.2]} />
        <meshStandardMaterial color="#e9dcb5" />
      </mesh>
      {ROADS_X.map((x) => (
        <mesh key={`rx${x}`} rotation={[-Math.PI / 2, 0, 0]} position={[x, 0.01, -5]}>
          <planeGeometry args={[2.4, 56]} />
          <meshStandardMaterial color="#6b7280" />
        </mesh>
      ))}
      {ROADS_Z.map((z) => (
        <mesh key={`rz${z}`} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, z]}>
          <planeGeometry args={[80, 2.4]} />
          <meshStandardMaterial color="#6b7280" />
        </mesh>
      ))}
      {ROADS_Z.map((z) => (
        <mesh key={`lz${z}`} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.015, z]}>
          <planeGeometry args={[80, 0.08]} />
          <meshStandardMaterial color="#fde68a" />
        </mesh>
      ))}
      <Car axis="x" line={0} color="#ef4444" speed={4} offset={0} />
      <Car axis="x" line={12} color="#facc15" speed={-3.2} offset={20} />
      <Car axis="z" line={14} color="#3b82f6" speed={3.6} offset={10} />
      <Car axis="z" line={-14} color="#f8fafc" speed={-4.2} offset={40} />
      <Car axis="x" line={-12} color="#22c55e" speed={3} offset={33} />

      <Market />
      <Office />
      <Park />
      <Billboard text={latestTrade ? `${latestTrade.emoji} ${latestTrade.text}` : "Cook, craft or host, then list it. Neighbors and NPC agents buy what they need."} />

      {placed.map(({ h, pos }) => (
        <group key={h.id} position={[pos[0], 0, pos[1]]}>
          <House color={h.color} big={h.kind === "npc"} mine={h.id === myHouseholdId} />
          <Anchor id={`hh:${h.id}`} offsetY={3.4} scaleRef={40} />
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
