"use client";

import { LogoPlaque } from "./LogoBoard";
import { useMemo, useRef, useState, type ReactNode } from "react";
import { useFrame } from "@react-three/fiber";
import { CanvasTexture, Color, SRGBColorSpace, type Group, type Mesh, type MeshStandardMaterial } from "three";
import { whereIs, type PlaceDef } from "@/lib/places";
import type { Character, HouseholdView } from "@/lib/types";
import { Anchor } from "./anchors";
import { Character3D, Halo, type Pose } from "./Character3D";

const W = 10;
const D = 8;
const WALL_H = 3;

function Glow({ p, s, c, i = 2 }: { p: [number, number, number]; s: [number, number, number]; c: string; i?: number }) {
  return (
    <mesh position={p}>
      <boxGeometry args={s} />
      <meshStandardMaterial color={c} emissive={c} emissiveIntensity={i} toneMapped={false} />
    </mesh>
  );
}

function Box({ p, s, c, r }: { p: [number, number, number]; s: [number, number, number]; c: string; r?: [number, number, number] }) {
  return (
    <mesh position={p} rotation={r} castShadow receiveShadow>
      <boxGeometry args={s} />
      <meshStandardMaterial color={c} roughness={0.7} />
    </mesh>
  );
}

function Cyl({ p, r, h, c, e }: { p: [number, number, number]; r: number; h: number; c: string; e?: string }) {
  return (
    <mesh position={p} castShadow>
      <cylinderGeometry args={[r, r, h, 20]} />
      <meshStandardMaterial color={c} emissive={e ?? "#000"} emissiveIntensity={e ? 1 : 0} />
    </mesh>
  );
}

/** Station spots on the floor (x, z), assigned to the place's activities in order. */
const SPOTS: Array<[number, number]> = [
  [-2.6, -1.6],
  [1.6, -1.6],
  [-2.6, 2],
  [2.4, 2],
  [0, 0.4],
];

/** The club lays its stations out around the dance floor. */
const CLUB_SPOTS: Record<string, [number, number]> = {
  dance: [0, 0.6],
  drink: [3.1, -1.9],
  dj: [-2.9, -2.0],
  hang: [-3.1, 2.5],
};

export function stationSpot(place: PlaceDef, actionId: string): [number, number] {
  if (place.style === "club" && CLUB_SPOTS[actionId]) return CLUB_SPOTS[actionId];
  const i = Math.max(0, place.actions.findIndex((a) => a.id === actionId));
  return SPOTS[i % SPOTS.length];
}

/** A prop that hints at what each activity is. */
function StationProp({ actionId, color }: { actionId: string; color: string }) {
  const desk = (
    <>
      <Box p={[0, 0.75, 0]} s={[1.6, 0.08, 0.8]} c="#2b2f42" />
      {[
        [-0.7, -0.32],
        [0.7, -0.32],
        [-0.7, 0.32],
        [0.7, 0.32],
      ].map(([x, z], i) => (
        <Box key={i} p={[x, 0.37, z]} s={[0.06, 0.74, 0.06]} c="#1f2233" />
      ))}
    </>
  );
  const monitor = (x = 0, glow = color) => (
    <group position={[x, 0.79, -0.15]}>
      <Box p={[0, 0.3, 0]} s={[0.7, 0.45, 0.04]} c="#0b0d17" />
      <Glow p={[0, 0.3, 0.025]} s={[0.62, 0.37, 0.01]} c={glow} i={0.9} />
      <Box p={[0, 0.04, 0]} s={[0.08, 0.1, 0.08]} c="#333" />
    </group>
  );
  switch (actionId) {
    case "swap":
    case "xswap":
    case "mm":
    case "perps":
    case "evm_job":
    case "audit":
      return (
        <group>
          {desk}
          {monitor(-0.38)}
          {monitor(0.38, actionId === "perps" ? "#fb7185" : color)}
        </group>
      );
    case "lp":
    case "lend":
    case "stake":
      return (
        <group>
          <Cyl p={[0, 0.45, 0]} r={0.55} h={0.9} c="#1e2433" />
          <Cyl p={[0, 0.92, 0]} r={0.48} h={0.06} c={color} e={color} />
        </group>
      );
    case "borrow":
    case "repay":
      return (
        <group>
          <Box p={[0, 0.55, 0]} s={[2, 1.1, 0.6]} c="#3a3046" />
          <Glow p={[0, 1.12, 0.31]} s={[2, 0.05, 0.02]} c={color} />
          <Box p={[0.6, 1.2, 0]} s={[0.3, 0.2, 0.3]} c="#fbbf24" />
        </group>
      );
    case "vote":
      return (
        <group>
          <Box p={[0, 0.5, 0]} s={[0.7, 1, 0.7]} c="#e2e0ea" />
          <Box p={[0, 1.01, 0]} s={[0.3, 0.02, 0.06]} c="#111" />
          <Glow p={[0, 0.7, 0.36]} s={[0.5, 0.18, 0.01]} c={color} />
        </group>
      );
    case "agent_task":
      return (
        <group>
          {[-0.5, 0, 0.5].map((x) => (
            <group key={x} position={[x, 0, 0]}>
              <Box p={[0, 0.9, 0]} s={[0.4, 1.8, 0.6]} c="#151a27" />
              {[0.4, 0.8, 1.2, 1.6].map((y) => (
                <Glow key={y} p={[0, y, 0.31]} s={[0.3, 0.04, 0.01]} c={y > 1 ? "#00ec97" : color} i={1.2} />
              ))}
            </group>
          ))}
        </group>
      );
    case "vrf":
      return (
        <group>
          <Cyl p={[0, 0.45, 0]} r={0.35} h={0.9} c="#1e2433" />
          <mesh position={[0, 1.15, 0]} rotation={[0.6, 0.6, 0]}>
            <boxGeometry args={[0.35, 0.35, 0.35]} />
            <meshStandardMaterial color="#f8fafc" emissive={color} emissiveIntensity={0.4} />
          </mesh>
        </group>
      );
    case "launch":
      return (
        <group>
          <Cyl p={[0, 0.15, 0]} r={0.9} h={0.3} c="#3f3a5a" />
          <Cyl p={[0, 1.1, 0]} r={0.25} h={1.6} c="#f8fafc" />
          <mesh position={[0, 2.1, 0]}>
            <coneGeometry args={[0.25, 0.5, 16]} />
            <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.8} />
          </mesh>
        </group>
      );
    case "post":
    case "school":
    case "office_hours":
      return (
        <group>
          <Box p={[0, 1.5, -0.4]} s={[1.8, 1, 0.05]} c="#0b0d17" />
          <Glow p={[0, 1.5, -0.37]} s={[1.6, 0.85, 0.01]} c={color} i={0.6} />
          <Box p={[0, 0.25, 0.3]} s={[1.6, 0.5, 0.6]} c="#3b3355" />
          <Box p={[0, 0.6, 0.55]} s={[1.6, 0.4, 0.12]} c="#3b3355" />
        </group>
      );
    case "merch":
      return (
        <group>
          <Box p={[0, 0.9, -0.2]} s={[1.6, 1.8, 0.4]} c="#2b2f42" />
          {[0.5, 1.0, 1.5].map((y) =>
            [-0.5, 0, 0.5].map((x) => <Box key={`${x}${y}`} p={[x, y, 0]} s={[0.3, 0.25, 0.25]} c={(x + y) % 1 ? color : "#f472b6"} />),
          )}
        </group>
      );
    case "pitch":
      return (
        <group>
          <Box p={[0, 0.55, 0]} s={[0.6, 1.1, 0.5]} c="#3a3046" />
          <Glow p={[0, 1.12, 0.26]} s={[0.6, 0.05, 0.02]} c={color} />
          <Cyl p={[0.15, 1.3, 0]} r={0.02} h={0.4} c="#888" />
        </group>
      );
    case "swim":
      // The pool itself (in the room decor) is the station.
      return (
        <group position={[0, 0, 1.4]}>
          {[-0.3, 0.3].map((x) => (
            <Cyl key={x} p={[x, 0.5, 0]} r={0.03} h={1} c="#e5e7eb" />
          ))}
        </group>
      );
    case "research":
      return (
        <group>
          {desk}
          <Box p={[0.9, 0.9, -0.3]} s={[0.4, 1.8, 0.4]} c="#7c4a1e" />
          <Box p={[-0.3, 0.82, 0]} s={[0.5, 0.06, 0.35]} c="#f8fafc" />
        </group>
      );
    case "hackathon":
      return (
        <group>
          <Box p={[0, 0.75, 0]} s={[2.4, 0.08, 0.9]} c="#2b2f42" />
          {[-0.8, 0, 0.8].map((x) => (
            <group key={x} position={[x, 0.79, 0]}>
              <Box p={[0, 0.02, 0.1]} s={[0.4, 0.03, 0.28]} c="#94a3b8" />
              <Box p={[0, 0.16, -0.04]} s={[0.4, 0.26, 0.02]} c="#0b0d17" r={[-0.2, 0, 0]} />
            </group>
          ))}
          {[-1, 1].map((x) => (
            <Box key={x} p={[x, 0.37, 0]} s={[0.08, 0.74, 0.8]} c="#1f2233" />
          ))}
        </group>
      );
    case "dance":
      // The dance floor itself (in the club decor) is the station.
      return null;
    case "drink":
      return (
        <group rotation={[0, -Math.PI / 2, 0]}>
          <Box p={[0, 0.55, 0]} s={[2.4, 1.1, 0.7]} c="#ff4fd8" />
          <Box p={[0, 1.13, 0]} s={[2.6, 0.08, 0.9]} c="#fde68a" />
          <Glow p={[0, 0.3, 0.36]} s={[2.4, 0.06, 0.02]} c="#5fd3ff" />
          {[-0.8, -0.3, 0.2, 0.7].map((x, i) => (
            <Cyl key={x} p={[x, 1.32, -0.1]} r={0.06} h={0.3} c={["#3ddc84", "#ffd23f", "#5fd3ff", "#ff7aa8"][i]} e={["#3ddc84", "#ffd23f", "#5fd3ff", "#ff7aa8"][i]} />
          ))}
          {[-0.8, 0, 0.8].map((x) => (
            <group key={x} position={[x, 0, 0.85]}>
              <Cyl p={[0, 0.35, 0]} r={0.04} h={0.7} c="#e5e7eb" />
              <Cyl p={[0, 0.72, 0]} r={0.2} h={0.07} c="#ffd23f" />
            </group>
          ))}
        </group>
      );
    case "dj":
      return (
        <group rotation={[0, Math.PI / 5, 0]}>
          <Box p={[0, 0.5, 0]} s={[2, 1, 0.8]} c="#2a4ed0" />
          <Glow p={[0, 0.5, 0.41]} s={[1.8, 0.12, 0.02]} c="#ff4fd8" i={1.6} />
          <Box p={[0, 1.02, 0]} s={[2, 0.05, 0.8]} c="#e5e7eb" />
          {[-0.5, 0.5].map((x) => (
            <Cyl key={x} p={[x, 1.07, 0]} r={0.26} h={0.04} c="#111827" e="#5fd3ff" />
          ))}
          {[-1.35, 1.35].map((x) => (
            <group key={x} position={[x, 0, -0.1]}>
              <Box p={[0, 0.7, 0]} s={[0.6, 1.4, 0.6]} c="#1e293b" />
              <Cyl p={[0, 0.5, 0.31]} r={0.2} h={0.02} c="#64748b" />
              <Cyl p={[0, 1.05, 0.31]} r={0.12} h={0.02} c="#64748b" />
            </group>
          ))}
        </group>
      );
    case "hang":
    default:
      return (
        <group>
          <Box p={[0, 0.55, 0]} s={[1.8, 1.1, 0.6]} c="#2a2440" />
          <Glow p={[0, 1.12, 0.31]} s={[1.8, 0.04, 0.02]} c="#f472b6" />
          {[-0.6, 0, 0.6].map((x) => (
            <group key={x} position={[x, 0, 0.75]}>
              <Cyl p={[0, 0.35, 0]} r={0.04} h={0.7} c="#555" />
              <Cyl p={[0, 0.72, 0]} r={0.18} h={0.06} c={color} />
            </group>
          ))}
        </group>
      );
  }
}

/** Big neon name sign drawn into a canvas texture. */
function NameSign({ place }: { place: PlaceDef }) {
  const tex = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 1024;
    canvas.height = 160;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#0b0d17";
    ctx.fillRect(0, 0, 1024, 160);
    ctx.shadowColor = place.color;
    ctx.shadowBlur = 24;
    ctx.fillStyle = place.color;
    ctx.font = "900 72px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(place.name.toUpperCase(), 512, 82, 980);
    const t = new CanvasTexture(canvas);
    t.colorSpace = SRGBColorSpace;
    return t;
  }, [place]);
  return (
    <mesh position={[0.5, 2.35, -D / 2 + 0.02]}>
      <planeGeometry args={[6.4, 1]} />
      <meshBasicMaterial map={tex} toneMapped={false} />
    </mesh>
  );
}

const DANCE_COLORS = ["#ff4fd8", "#5fd3ff", "#ffd23f", "#3ddc84", "#b28cff"].map((c) => new Color(c));

/** Light-up dance floor, a spinning disco ball and sweeping light beams. */
function ClubDecor() {
  const tiles = useRef<Array<Mesh | null>>([]);
  const ball = useRef<Group>(null);
  const beams = useRef<Group>(null);
  const cells = useMemo(() => {
    const out: Array<[number, number]> = [];
    for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) out.push([-1.35 + i * 0.9, -0.75 + j * 0.9]);
    return out;
  }, []);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const beat = Math.floor(t * 2.2);
    tiles.current.forEach((m, i) => {
      if (!m) return;
      const mat = m.material as MeshStandardMaterial;
      const col = DANCE_COLORS[(beat + i * 3 + ((i >> 2) % 2)) % DANCE_COLORS.length];
      mat.color.copy(col);
      mat.emissive.copy(col);
    });
    if (ball.current) ball.current.rotation.y = t * 0.8;
    if (beams.current) beams.current.children.forEach((b, i) => (b.rotation.z = Math.sin(t * 1.2 + i * 1.7) * 0.5));
  });
  return (
    <group>
      {cells.map(([x, z], i) => (
        <mesh key={i} ref={(m) => void (tiles.current[i] = m)} position={[x, 0.02, z + 0.6]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.84, 0.84]} />
          <meshStandardMaterial color="#ff4fd8" emissive="#ff4fd8" emissiveIntensity={0.9} toneMapped={false} />
        </mesh>
      ))}
      <group ref={ball} position={[0, 2.55, 0.6]}>
        <mesh>
          <sphereGeometry args={[0.32, 16, 12]} />
          <meshStandardMaterial color="#f8fafc" metalness={0.9} roughness={0.15} flatShading emissive="#c7d2fe" emissiveIntensity={0.3} />
        </mesh>
        <Cyl p={[0, 0.4, 0]} r={0.01} h={0.5} c="#94a3b8" />
      </group>
      <group ref={beams}>
        {(
          [
            [-4.6, "#ff4fd8"],
            [-1.5, "#5fd3ff"],
            [1.5, "#ffd23f"],
            [4.6, "#3ddc84"],
          ] as Array<[number, string]>
        ).map(([x, col]) => (
          <group key={x} position={[x, WALL_H, -D / 2 + 0.4]}>
            <mesh position={[0, -1.3, 0.6]} rotation={[0.45, 0, 0]}>
              <coneGeometry args={[0.55, 2.6, 16, 1, true]} />
              <meshBasicMaterial color={col} transparent opacity={0.22} depthWrite={false} toneMapped={false} />
            </mesh>
          </group>
        ))}
      </group>
      {/* lounge sofa (the hang-out spot) */}
      <group position={[-3.1, 0, 3.3]}>
        <Box p={[0, 0.25, 0]} s={[2.2, 0.5, 0.8]} c="#b28cff" />
        <Box p={[0, 0.65, 0.32]} s={[2.2, 0.5, 0.16]} c="#9b72f5" />
      </group>
      {/* speakers on the back wall */}
      {[-4.5, 4.5].map((x) => (
        <group key={x} position={[x, 0, -D / 2 + 0.5]}>
          <Box p={[0, 1, 0]} s={[0.7, 2, 0.6]} c="#1e293b" />
          <Cyl p={[0, 0.6, 0.31]} r={0.24} h={0.02} c="#64748b" />
          <Cyl p={[0, 1.4, 0.31]} r={0.15} h={0.02} c="#64748b" />
        </group>
      ))}
    </group>
  );
}

/** Style-specific decor along the walls. */
function Decor({ place }: { place: PlaceDef }) {
  const c = place.color;
  const items: Record<string, ReactNode> = {
    exchange: (
      <group position={[-W / 2 + 0.05, 1.4, 0]} rotation={[0, Math.PI / 2, 0]}>
        <Box p={[0, 0, 0]} s={[5, 1.6, 0.05]} c="#05140e" />
        {Array.from({ length: 14 }).map((_, i) => {
          const h = 0.2 + ((i * 47) % 10) / 10;
          return <Glow key={i} p={[-2.2 + i * 0.34, -0.5 + h / 2, 0.04]} s={[0.12, h, 0.01]} c={i % 3 ? "#00ec97" : "#fb7185"} i={1} />;
        })}
      </group>
    ),
    tower: (
      <mesh position={[-W / 2 + 0.06, 1.6, 0]} rotation={[0, Math.PI / 2, 0]}>
        <torusGeometry args={[0.8, 0.08, 12, 40]} />
        <meshStandardMaterial color={c} emissive={c} emissiveIntensity={2.4} toneMapped={false} />
      </mesh>
    ),
    datacenter: (
      <group>
        {[-1.5, 0, 1.5].map((z) => (
          <group key={z} position={[-W / 2 + 0.5, 0, z]}>
            <Box p={[0, 1, 0]} s={[0.6, 2, 1]} c="#151a27" />
            {[0.4, 0.8, 1.2, 1.6].map((y) => (
              <Glow key={y} p={[0.31, y, 0]} s={[0.01, 0.04, 0.8]} c={y > 1 ? "#00ec97" : "#22d3ee"} />
            ))}
          </group>
        ))}
      </group>
    ),
    lab: (
      <group>
        {[-1.6, 0, 1.6].map((z) => (
          <group key={z} position={[-W / 2 + 0.6, 0, z]}>
            <Cyl p={[0, 1, 0]} r={0.35} h={2} c="#1e2433" e={c} />
          </group>
        ))}
      </group>
    ),
    hall: (
      <group>
        {[-1.2, 0.2, 1.6].map((z) =>
          [-0.6, 0.6].map((x) => <Box key={`${z}${x}`} p={[x + 1, 0.25, z + 0.2]} s={[1, 0.15, 0.4]} c="#7c4a1e" />),
        )}
        {[-2, 2].map((x) => (
          <Box key={x} p={[x + 0.5, 1.6, -D / 2 + 0.05]} s={[0.6, 1.4, 0.02]} c={c} />
        ))}
      </group>
    ),
    pool: (
      <group>
        <mesh position={[-2.4, 0.03, -1.0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[4.4, 3.6]} />
          <meshStandardMaterial color="#0284c7" emissive="#22d3ee" emissiveIntensity={0.4} />
        </mesh>
        {[-1.8, -1.0, -0.2].map((z) => (
          <Glow key={z} p={[-2.4, 0.05, z]} s={[4.4, 0.02, 0.04]} c="#e0f2fe" i={0.6} />
        ))}
        {[1.4, 2.4, 3.4].map((x) => (
          <Box key={x} p={[x, 0.2, 2.9]} s={[0.6, 0.1, 1.6]} c="#f472b6" r={[0.15, 0, 0]} />
        ))}
      </group>
    ),
    launchpad: <Glow p={[0, 0.02, 0]} s={[3, 0.02, 3]} c={c} i={0.4} />,
    club: <ClubDecor />,
    office: (
      <group>
        {[-3.8, 3.8].map((x) => (
          <group key={x} position={[x, 0, -D / 2 + 0.6]}>
            <Cyl p={[0, 0.25, 0]} r={0.25} h={0.5} c="#b45309" />
            <mesh position={[0, 0.85, 0]}>
              <icosahedronGeometry args={[0.45, 0]} />
              <meshStandardMaterial color="#16a34a" flatShading />
            </mesh>
          </group>
        ))}
      </group>
    ),
  };
  return <>{items[place.style] ?? items.office}</>;
}

interface InsideSim {
  c: Character;
  h: HouseholdView;
  target: [number, number];
  pose: Pose;
  station?: string;
}

function PlaceSim({ sim, selected, onTap }: { sim: InsideSim; selected: boolean; onTap?: () => void }) {
  const ref = useRef<Group>(null);
  const [pose, setPose] = useState<Pose>("stand");
  useFrame((_, dt) => {
    const g = ref.current;
    if (!g) return;
    const [tx, tz] = sim.target;
    const dx = tx - g.position.x;
    const dz = tz - g.position.z;
    const dist = Math.hypot(dx, dz);
    if (dist > 0.06) {
      const step = Math.min(dist, dt * 2.2);
      g.position.x += (dx / dist) * step;
      g.position.z += (dz / dist) * step;
      g.position.y = 0;
      g.rotation.y = Math.atan2(dx, dz);
      if (pose !== "walk") setPose("walk");
    } else {
      g.rotation.y = sim.pose === "dance" ? 0.4 : Math.PI;
      g.position.y = sim.pose === "lie" ? 0.05 : 0;
      if (pose !== sim.pose) setPose(sim.pose);
    }
  });
  return (
    <group
      ref={ref}
      position={[W / 2 - 1, 0, D / 2 - 0.6]}
      onClick={(e) => {
        if (e.delta > 6) return;
        e.stopPropagation();
        onTap?.();
      }}
    >
      <Character3D look={sim.c.look} pose={pose} />
      {selected && <Halo color="#00ec97" />}
      <Anchor id={`pc:${sim.c.id}`} offsetY={selected ? 1.95 : 1.6} />
    </group>
  );
}

/** Who is inside a place right now, and where they stand. */
export function simsInside(place: PlaceDef, households: HouseholdView[], now: number, waving?: Set<string>): InsideSim[] {
  const out: InsideSim[] = [];
  let idle = 0;
  for (const h of households) {
    for (const c of h.characters) {
      const w = whereIs(c, now);
      if (w.placeId !== place.id || w.arriving) continue;
      const b = c.busy && c.busy.until > now && c.busy.place === place.id && !c.busy.action.startsWith("travel:") ? c.busy : null;
      if (b) {
        const actionId = b.action.split(":")[2];
        const [sx, sz] = stationSpot(place, actionId);
        const n = out.filter((o) => o.station === actionId).length;
        const swim = actionId === "swim";
        const dance = actionId === "dance";
        // Dancers spread around the floor; everyone else queues beside their station.
        const target: [number, number] = dance
          ? [sx + ((n % 3) - 1) * 0.85, sz + (Math.floor(n / 3) - 0.5) * 0.85]
          : [sx + (n % 2 ? 0.6 : -0.6) * Math.ceil(n / 2), sz + (swim ? 0.3 : 0.9)];
        out.push({ c, h, target, pose: swim ? "lie" : dance ? "dance" : waving?.has(c.id) ? "wave" : "stand", station: actionId });
      } else {
        const i = idle++;
        // Sims just hanging around stand together at the front, where the camera can see them.
        out.push({ c, h, target: [-0.6 + (i % 5) * 0.8, 3.3 - Math.floor(i / 5) * 0.7], pose: waving?.has(c.id) ? "wave" : "stand" });
      }
    }
  }
  return out;
}

export function PlaceInterior({
  place,
  households,
  now,
  selectedCharId,
  onStation,
  onSimTap,
  waving,
}: {
  place: PlaceDef;
  households: HouseholdView[];
  now: number;
  selectedCharId?: string | null;
  onStation: (actionId: string) => void;
  onSimTap?: (c: Character, h: HouseholdView) => void;
  waving?: Set<string>;
}) {
  const sims = simsInside(place, households, now, waving);
  const club = place.style === "club";
  const wall = club ? "#7c4ddb" : "#4b63d6";
  return (
    <group>
      {/* street outside */}
      <mesh position={[0, -0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[18, 40]} />
        <meshStandardMaterial color="#5fae62" />
      </mesh>
      {/* floor */}
      <mesh position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[W, D]} />
        <meshStandardMaterial color={place.style === "pool" ? "#e2e8f0" : club ? "#a58cf0" : "#9fb3ee"} />
      </mesh>
      {Array.from({ length: W - 1 }).map((_, i) => (
        <mesh key={`gx${i}`} position={[-W / 2 + 1 + i, 0.002, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.02, D]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.25} />
        </mesh>
      ))}
      {/* walls */}
      <mesh position={[0, WALL_H / 2, -D / 2 - 0.075]} receiveShadow>
        <boxGeometry args={[W + 0.3, WALL_H, 0.15]} />
        <meshStandardMaterial color={wall} />
      </mesh>
      <mesh position={[-W / 2 - 0.075, WALL_H / 2, 0]} receiveShadow>
        <boxGeometry args={[0.15, WALL_H, D]} />
        <meshStandardMaterial color={wall} />
      </mesh>
      <Glow p={[0, WALL_H - 0.06, -D / 2 + 0.01]} s={[W, 0.05, 0.03]} c={place.color} />
      <Glow p={[-W / 2 + 0.01, WALL_H - 0.06, 0]} s={[0.03, 0.05, D]} c={place.color} />
      <Glow p={[0, 0.03, D / 2]} s={[W, 0.03, 0.05]} c={place.color} i={1} />
      <Glow p={[W / 2, 0.03, 0]} s={[0.05, 0.03, D]} c={place.color} i={1} />
      <NameSign place={place} />
      <LogoPlaque id={place.id} size={1.2} position={[-3.9, 2.35, -D / 2 + 0.06]} />
      <Decor place={place} />

      {/* activity stations */}
      {place.actions.map((a) => {
        const [x, z] = stationSpot(place, a.id);
        return (
          <group
            key={a.id}
            position={[x, 0, z]}
            onClick={(e) => {
              if (e.delta > 6) return;
              e.stopPropagation();
              onStation(a.id);
            }}
          >
            <mesh position={[0, 0.015, 0.2]} rotation={[-Math.PI / 2, 0, 0]}>
              <ringGeometry args={[1.05, 1.2, 40]} />
              <meshStandardMaterial color={place.color} emissive={place.color} emissiveIntensity={1.4} toneMapped={false} transparent opacity={0.8} />
            </mesh>
            <StationProp actionId={a.id} color={place.color} />
            <Anchor id={`st:${a.id}`} offsetY={2.4} />
          </group>
        );
      })}

      {sims.map((s) => (
        <PlaceSim key={s.c.id} sim={s} selected={s.c.id === selectedCharId} onTap={() => onSimTap?.(s.c, s.h)} />
      ))}
    </group>
  );
}
