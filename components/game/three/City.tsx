"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { CanvasTexture, SRGBColorSpace, type Group } from "three";
import { Anchor } from "./anchors";
import { LogoSignpost } from "./LogoBoard";
import { PLACES, type BuildingStyle, type PlaceDef, type TravelMode } from "@/lib/places";
import type { ActivityEvent, HouseholdView } from "@/lib/types";

export type Landmark = "market" | "office" | "park";

const NEON = "#00ec97";
const NEON_2 = "#a78bfa";
const NEON_3 = "#22d3ee";

const ROADS_X = [-14, 0, 14];
const ROADS_Z = [-12, 0, 12];

const TRADE_SCREEN: [number, number] = [-3.5, -17];
/** Railway loop around the town. */
const RAIL = { x0: -46, x1: 46, z0: -42, z1: 30 };
const AIRFIELD: [number, number] = [-38, 38];

/** House plots sorted by distance from the center, kept clear of roads, landmarks and places. */
function plotSlots(): Array<[number, number]> {
  const out: Array<[number, number]> = [];
  const blocked: Array<[number, number]> = [...PLACES.map((p) => p.pos), TRADE_SCREEN];
  for (let x = -42; x <= 42; x += 4.5) {
    for (let z = -38; z <= 20; z += 4.5) {
      const nearRoadX = ROADS_X.some((r) => Math.abs(x - r) < 3);
      const nearRoadZ = ROADS_Z.some((r) => Math.abs(z - r) < 3);
      const civic = Math.abs(x) < 12 && Math.abs(z) < 10;
      const nearPlace = blocked.some(([px, pz]) => Math.abs(x - px) < 5 && Math.abs(z - pz) < 5);
      if (!nearRoadX && !nearRoadZ && !civic && !nearPlace) out.push([x, z]);
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
        <meshStandardMaterial color={mine ? "#ffe08a" : "#cfd8e8"} />
      </mesh>
      <mesh position={[0, h / 2, 0]} castShadow>
        <boxGeometry args={[w, h, w]} />
        <meshStandardMaterial color="#e8e6f0" />
      </mesh>
      {/* overhanging roof slab */}
      <mesh position={[0, h + 0.08, 0.1]} castShadow>
        <boxGeometry args={[w + 0.4, 0.16, w + 0.6]} />
        <meshStandardMaterial color="#2a4ed0" />
      </mesh>
      <Glow p={[0, h - 0.02, w / 2 + 0.41]} s={[w + 0.4, 0.04, 0.03]} c={mine ? "#fbbf24" : color} />
      {/* glass front + door */}
      <mesh position={[-0.45, 0.8, w / 2 + 0.01]}>
        <planeGeometry args={[1.1, 0.9]} />
        <meshStandardMaterial color="#1b2550" emissive="#fcd34d" emissiveIntensity={0.25} />
      </mesh>
      <mesh position={[0.75, 0.5, w / 2 + 0.01]}>
        <planeGeometry args={[0.5, 1.0]} />
        <meshStandardMaterial color="#2a4ed0" />
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
        <meshStandardMaterial color="#7cc483" />
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
        <meshStandardMaterial color="#3fa34d" flatShading />
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
        <meshStandardMaterial color="#d9c49a" />
      </mesh>
      {awnings.map((c, i) => (
        <group key={i} position={[-3 + (i % 3) * 3, 0, -1.5 + Math.floor(i / 3) * 3]}>
          <mesh position={[0, 0.45, 0]}>
            <boxGeometry args={[1.8, 0.9, 1]} />
            <meshStandardMaterial color="#b0703a" />
          </mesh>
          <mesh position={[0, 1.6, 0]}>
            <boxGeometry args={[2.0, 0.06, 1.3]} />
            <meshStandardMaterial color="#2a4ed0" />
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
    <group position={[TRADE_SCREEN[0], 0, TRADE_SCREEN[1]]}>
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

/** Building for a named ecosystem place, styled by type, with a neon roof sign. */
function PlaceBuilding({ place }: { place: PlaceDef }) {
  const c = place.color;
  const h = place.height;
  const body = (w: number, d: number, hh: number, color = "#262b3d") => (
    <mesh position={[0, hh / 2, 0]} castShadow>
      <boxGeometry args={[w, hh, d]} />
      <meshStandardMaterial color={color} />
    </mesh>
  );
  const pad = (w: number, d: number, color = "#30354a") => (
    <mesh position={[0, 0.025, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[w, d]} />
      <meshStandardMaterial color={color} />
    </mesh>
  );
  const styles: Record<BuildingStyle, React.ReactNode> = {
    tower: (
      <>
        {pad(5, 5)}
        {body(3.2, 3.2, h)}
        {Array.from({ length: Math.floor(h / 1.1) }).map((_, j) => (
          <Glow key={j} p={[0, 0.8 + j * 1.1, 1.61]} s={[2.8, 0.14, 0.02]} c={c} i={0.9} />
        ))}
        <mesh position={[0, h + 0.9, 0]}>
          <torusGeometry args={[0.7, 0.08, 10, 32]} />
          <meshStandardMaterial color={c} emissive={c} emissiveIntensity={2.4} toneMapped={false} />
        </mesh>
      </>
    ),
    office: (
      <>
        {pad(5, 4.4)}
        {body(3.6, 2.8, h, "#2b3245")}
        {Array.from({ length: Math.floor(h / 1.2) }).map((_, j) => (
          <Glow key={j} p={[0, 0.8 + j * 1.2, 1.41]} s={[3.2, 0.3, 0.02]} c="#93c5fd" i={0.5} />
        ))}
        <Glow p={[0, h + 0.05, 0]} s={[3.62, 0.08, 2.82]} c={c} i={1.6} />
      </>
    ),
    lab: (
      <>
        {pad(5, 4.4)}
        {body(3.6, 3, h * 0.6, "#2a3042")}
        <mesh position={[0.6, h * 0.6 + 0.6, 0]}>
          <sphereGeometry args={[1, 18, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshStandardMaterial color="#1e2433" emissive={c} emissiveIntensity={0.35} />
        </mesh>
        <Glow p={[0, h * 0.6, 1.51]} s={[3.6, 0.08, 0.02]} c={c} />
      </>
    ),
    hall: (
      <>
        {pad(5.4, 4.6)}
        {body(4, 3, h * 0.7, "#e2e0ea")}
        {[-1.5, -0.5, 0.5, 1.5].map((x) => (
          <mesh key={x} position={[x, h * 0.35, 1.7]}>
            <cylinderGeometry args={[0.14, 0.14, h * 0.7, 10]} />
            <meshStandardMaterial color="#f1f0f5" />
          </mesh>
        ))}
        <mesh position={[0, h * 0.7 + 0.5, 0.2]} rotation={[0, Math.PI / 4, 0]}>
          <coneGeometry args={[3.0, 1, 4]} />
          <meshStandardMaterial color="#3b3355" />
        </mesh>
        <Glow p={[0, h * 0.7, 1.95]} s={[4, 0.06, 0.04]} c={c} />
      </>
    ),
    kiosk: (
      <>
        {pad(3.4, 3.4)}
        {body(1.8, 1.8, 2.2, "#2b2f42")}
        <mesh position={[0, 2.35, 0]}>
          <boxGeometry args={[2.4, 0.15, 2.4]} />
          <meshStandardMaterial color={c} emissive={c} emissiveIntensity={0.8} />
        </mesh>
      </>
    ),
    pool: (
      <>
        {pad(7.5, 5.8, "#cbd5e1")}
        <mesh position={[0, 0.06, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[6, 4.2]} />
          <meshStandardMaterial color="#0ea5e9" emissive="#22d3ee" emissiveIntensity={0.45} />
        </mesh>
        {[-1.4, 0, 1.4].map((z) => (
          <Glow key={z} p={[0, 0.08, z]} s={[6, 0.02, 0.05]} c="#e0f2fe" i={0.8} />
        ))}
        {[-3.2, 3.2].map((x) => (
          <group key={x} position={[x, 0, -2.4]}>
            <mesh position={[0, 0.6, 0]}>
              <cylinderGeometry args={[0.04, 0.04, 1.2]} />
              <meshStandardMaterial color="#e5e7eb" />
            </mesh>
            <mesh position={[0, 1.3, 0]}>
              <coneGeometry args={[0.7, 0.4, 12]} />
              <meshStandardMaterial color={x < 0 ? "#f472b6" : "#00ec97"} />
            </mesh>
          </group>
        ))}
      </>
    ),
    datacenter: (
      <>
        {pad(6, 4.4)}
        {body(5, 3, h, "#1f2433")}
        {Array.from({ length: 8 }).map((_, i) => (
          <Glow key={i} p={[-2.1 + i * 0.6, h * 0.5, 1.51]} s={[0.35, h * 0.7, 0.02]} c={i % 3 ? "#22d3ee" : "#00ec97"} i={0.6} />
        ))}
      </>
    ),
    store: (
      <>
        {pad(5, 4)}
        {body(3.6, 2.6, h, "#2b2f42")}
        <mesh position={[0, 1.1, 1.31]}>
          <planeGeometry args={[3, 1.6]} />
          <meshStandardMaterial color="#1b2550" emissive={c} emissiveIntensity={0.35} />
        </mesh>
        <Glow p={[0, h + 0.1, 1.3]} s={[3.6, 0.5, 0.06]} c={c} i={1.3} />
      </>
    ),
    exchange: (
      <>
        {pad(5.4, 4.6)}
        {body(4, 3.2, h, "#232a3b")}
        <mesh position={[0, h * 0.6, 1.62]}>
          <planeGeometry args={[3.4, 1.4]} />
          <meshStandardMaterial color="#05140e" emissive={c} emissiveIntensity={0.5} />
        </mesh>
        {[0, 1, 2, 3, 4].map((i) => (
          <Glow key={i} p={[-1.3 + i * 0.65, h * 0.6 - 0.4 + ((i * 37) % 5) * 0.15, 1.64]} s={[0.4, 0.06, 0.01]} c={i % 2 ? "#fb7185" : "#00ec97"} />
        ))}
        <Glow p={[0, h + 0.05, 0]} s={[4.02, 0.08, 3.22]} c={c} i={1.4} />
      </>
    ),
    launchpad: (
      <>
        {pad(5, 5, "#2a2433")}
        <mesh position={[0, 0.3, 0]}>
          <cylinderGeometry args={[1.8, 2, 0.6, 24]} />
          <meshStandardMaterial color="#b0703a" />
        </mesh>
        <mesh position={[0, 2.3, 0]}>
          <cylinderGeometry args={[0.35, 0.45, 3, 16]} />
          <meshStandardMaterial color="#f8fafc" />
        </mesh>
        <mesh position={[0, 4.1, 0]}>
          <coneGeometry args={[0.35, 0.8, 16]} />
          <meshStandardMaterial color={c} emissive={c} emissiveIntensity={0.8} />
        </mesh>
        <Glow p={[0, 0.62, 0]} s={[3.2, 0.02, 3.2]} c={c} i={0.6} />
      </>
    ),
    hub: (
      <>
        {pad(7, 5.6, "#2f3a4f")}
        <mesh position={[0, h * 0.5 + 0.1, 0]}>
          <cylinderGeometry args={[1.2, 1.4, Math.max(0.3, h), 24]} />
          <meshStandardMaterial color="#2a3042" />
        </mesh>
        <mesh position={[0, Math.max(0.3, h) + 0.5, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[1.6, 0.06, 10, 48]} />
          <meshStandardMaterial color={c} emissive={c} emissiveIntensity={2} toneMapped={false} />
        </mesh>
        {[
          [-2.6, -1.8],
          [2.6, 1.8],
        ].map((p, i) => (
          <Tree key={i} p={p as [number, number]} s={0.9} />
        ))}
      </>
    ),
  };
  return (
    <group position={[place.pos[0], 0, place.pos[1]]}>
      {styles[place.style]}
      <LogoSignpost id={place.id} position={[2.1, 0, 2.3]} />
      <Anchor id={`pl:${place.id}`} offsetY={Math.max(2.4, place.height + 1.6)} scaleRef={40} />
    </group>
  );
}

/** Rail loop around town with a train running on it. */
function Railway() {
  const train = useRef<Group>(null);
  const { x0, x1, z0, z1 } = RAIL;
  const w = x1 - x0;
  const d = z1 - z0;
  const perimeter = 2 * (w + d);
  useFrame(({ clock }) => {
    if (!train.current) return;
    let t = (clock.elapsedTime * 9) % perimeter;
    let x = x0;
    let z = z0;
    let rot = Math.PI / 2;
    if (t < w) [x, z, rot] = [x0 + t, z0, Math.PI / 2];
    else if ((t -= w) < d) [x, z, rot] = [x1, z0 + t, 0];
    else if ((t -= d) < w) [x, z, rot] = [x1 - t, z1, -Math.PI / 2];
    else [x, z, rot] = [x0, z1 - (t - w), Math.PI];
    train.current.position.set(x, 0.35, z);
    train.current.rotation.y = rot;
  });
  const sides: Array<[number, number, number, number]> = [
    [(x0 + x1) / 2, z0, w, 0.5],
    [(x0 + x1) / 2, z1, w, 0.5],
    [x0, (z0 + z1) / 2, 0.5, d],
    [x1, (z0 + z1) / 2, 0.5, d],
  ];
  return (
    <group>
      {sides.map(([x, z, sw, sd], i) => (
        <group key={i}>
          <mesh position={[x, 0.03, z]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[sw + 0.8, sd + 0.8]} />
            <meshStandardMaterial color="#3b3a44" />
          </mesh>
          <Glow p={[x, 0.06, z]} s={[sw, 0.02, sd]} c={NEON_2} i={0.9} />
        </group>
      ))}
      {/* stations */}
      {[
        [0, z0],
        [x1, 0],
        [0, z1],
        [x0, 0],
      ].map(([x, z], i) => (
        <group key={i} position={[x, 0, z]}>
          <mesh position={[0, 1.2, 0]}>
            <boxGeometry args={[2.6, 0.12, 2.6]} />
            <meshStandardMaterial color="#2a4ed0" />
          </mesh>
          <Glow p={[0, 1.12, 0]} s={[2.6, 0.04, 2.6]} c={NEON_2} i={1.2} />
          {[-1.1, 1.1].map((px) => (
            <mesh key={px} position={[px, 0.6, 0]}>
              <cylinderGeometry args={[0.06, 0.06, 1.2]} />
              <meshStandardMaterial color="#64748b" />
            </mesh>
          ))}
        </group>
      ))}
      <group ref={train}>
        <TrainModel />
      </group>
    </group>
  );
}

function TrainModel() {
  return (
    <group>
      {[0, 1, 2].map((i) => (
        <group key={i} position={[0, 0, -i * 1.5]}>
          <mesh>
            <boxGeometry args={[0.8, 0.6, 1.35]} />
            <meshStandardMaterial color={i === 0 ? "#e5e7eb" : "#cbd5e1"} />
          </mesh>
          <Glow p={[0, 0.08, 0]} s={[0.82, 0.12, 1.36]} c={NEON_2} i={1.2} />
        </group>
      ))}
    </group>
  );
}

function PlaneModel() {
  return (
    <group>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <capsuleGeometry args={[0.22, 1.4, 6, 12]} />
        <meshStandardMaterial color="#f8fafc" />
      </mesh>
      <mesh position={[0, 0, 0.1]}>
        <boxGeometry args={[2.2, 0.05, 0.45]} />
        <meshStandardMaterial color="#cbd5e1" />
      </mesh>
      <mesh position={[0, 0.25, -0.75]}>
        <boxGeometry args={[0.05, 0.45, 0.35]} />
        <meshStandardMaterial color={NEON} emissive={NEON} emissiveIntensity={1} />
      </mesh>
    </group>
  );
}

function CarModel({ color }: { color: string }) {
  return (
    <group>
      <mesh castShadow>
        <boxGeometry args={[0.6, 0.28, 1.15]} />
        <meshStandardMaterial color={color} metalness={0.3} roughness={0.4} />
      </mesh>
      <mesh position={[0, 0.24, -0.05]}>
        <boxGeometry args={[0.5, 0.2, 0.6]} />
        <meshStandardMaterial color="#0f172a" />
      </mesh>
      <Glow p={[0, 0, 0.58]} s={[0.45, 0.06, 0.02]} c="#fef3c7" />
    </group>
  );
}

/** An airstrip at the edge of town. */
function Airfield() {
  return (
    <group position={[AIRFIELD[0], 0, AIRFIELD[1]]} rotation={[0, Math.PI / 2, 0]}>
      <mesh position={[0, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[4, 22]} />
        <meshStandardMaterial color="#2b2f3a" />
      </mesh>
      {Array.from({ length: 9 }).map((_, i) => (
        <Glow key={i} p={[0, 0.05, -10 + i * 2.5]} s={[0.12, 0.02, 1]} c="#fef3c7" i={1} />
      ))}
      {[-2.1, 2.1].map((x) => (
        <Glow key={x} p={[x, 0.05, 0]} s={[0.06, 0.02, 22]} c="#38bdf8" i={1.2} />
      ))}
      <mesh position={[4, 1.5, 4]}>
        <cylinderGeometry args={[0.5, 0.7, 3, 12]} />
        <meshStandardMaterial color="#e5e7eb" />
      </mesh>
      <Glow p={[4, 3.1, 4]} s={[1.3, 0.4, 1.3]} c={NEON_3} i={1.2} />
      <group position={[0, 0.35, 6]} rotation={[0, Math.PI, 0]}>
        <PlaneModel />
      </group>
    </group>
  );
}

export interface Trip {
  id: string;
  mode: TravelMode;
  from: [number, number];
  to: [number, number];
  /** Server timestamps (ms). */
  start: number;
  arrive: number;
  until: number;
  color: string;
}

/** A Sim's vehicle travelling to (then parked at) a place. Positions are interpolated every frame. */
function TripVehicle({ trip, clockOffset }: { trip: Trip; clockOffset: number }) {
  const ref = useRef<Group>(null);
  useFrame(() => {
    const g = ref.current;
    if (!g) return;
    const now = Date.now() + clockOffset;
    const t = Math.max(0, Math.min(1, (now - trip.start) / Math.max(1, trip.arrive - trip.start)));
    const [fx, fz] = trip.from;
    const [tx, tz] = trip.to;
    // Park next to the destination so the vehicle doesn't sit inside the building.
    const px = tx + 2.6;
    const pz = tz + 2.6;
    const x = fx + (px - fx) * t;
    const z = fz + (pz - fz) * t;
    const y = trip.mode === "plane" ? 0.4 + Math.sin(t * Math.PI) * 14 : trip.mode === "train" ? 0.35 : 0.25;
    g.position.set(x, y, z);
    if (t < 1) g.rotation.y = Math.atan2(px - fx, pz - fz);
    g.visible = now < trip.until;
  });
  return (
    <group ref={ref}>
      {trip.mode === "plane" ? <PlaneModel /> : trip.mode === "train" ? <TrainModel /> : <CarModel color={trip.color} />}
      <Anchor id={`trip:${trip.id}`} offsetY={trip.mode === "plane" ? 1 : 1.2} scaleRef={40} />
    </group>
  );
}

export function housePosition(households: HouseholdView[], id: string): [number, number] | null {
  return cityPlacement(households).find((p) => p.h.id === id)?.pos ?? null;
}

/** Player households in plot order, so overlay markers can match houses by id. */
export function cityPlacement(households: HouseholdView[]) {
  return [...households]
    .sort((a, b) => a.createdAt - b.createdAt)
    .slice(0, SLOTS.length)
    .map((h, i) => ({ h, pos: SLOTS[i] }));
}

export function City({
  households,
  myHouseholdId,
  latestTrade,
  trips = [],
  clockOffset = 0,
}: {
  households: HouseholdView[];
  myHouseholdId?: string | null;
  latestTrade?: ActivityEvent;
  trips?: Trip[];
  clockOffset?: number;
}) {
  const placed = useMemo(() => cityPlacement(households), [households]);
  const open = SLOTS.slice(placed.length, placed.length + OPEN_PLOTS);
  const lamps = useMemo(() => {
    const out: Array<[number, number]> = [];
    for (const z of ROADS_Z) for (let x = -42; x <= 42; x += 7) out.push([x + 1.6, z + 1.6]);
    return out;
  }, []);

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
        <planeGeometry args={[130, 130]} />
        <meshStandardMaterial color="#5fae62" />
      </mesh>
      {/* canal */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[20, 0.0, 44]}>
        <planeGeometry args={[90, 22]} />
        <meshStandardMaterial color="#1d4f86" emissive="#1e3a8a" emissiveIntensity={0.3} />
      </mesh>
      <Glow p={[20, 0.02, 33.1]} s={[90, 0.03, 0.12]} c={NEON_3} i={1.2} />
      {ROADS_X.map((x) => (
        <group key={`rx${x}`}>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[x, 0.01, -6]}>
            <planeGeometry args={[2.4, 72]} />
            <meshStandardMaterial color="#56608a" />
          </mesh>
          <Glow p={[x, 0.02, -6]} s={[0.06, 0.01, 72]} c={NEON} i={1.1} />
        </group>
      ))}
      {ROADS_Z.map((z) => (
        <group key={`rz${z}`}>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, z]}>
            <planeGeometry args={[92, 2.4]} />
            <meshStandardMaterial color="#56608a" />
          </mesh>
          <Glow p={[0, 0.022, z]} s={[92, 0.01, 0.06]} c={NEON} i={1.1} />
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
      {PLACES.map((p) => (
        <PlaceBuilding key={p.id} place={p} />
      ))}
      <Railway />
      <Airfield />
      {trips.map((t) => (
        <TripVehicle key={t.id} trip={t} clockOffset={clockOffset} />
      ))}
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
