"use client";

import { useMemo, useRef, useState } from "react";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import { Color, type Group } from "three";
import { ITEMS, ROOM_SIZE } from "@/lib/catalog";
import { canPlace, footprint } from "@/lib/layout";
import type { Character, HouseholdView, PlacedFurniture } from "@/lib/types";
import { NEED_KEYS } from "@/lib/types";
import { FurnitureModel } from "./FurnitureModel";
import { Character3D, Halo, type Pose } from "./Character3D";
import { Anchor } from "./anchors";

const HALF = ROOM_SIZE / 2;
const WALL_H = 2.6;
const DOOR: [number, number] = [-HALF + 0.4, 2.5];

export interface Placement {
  itemId: string;
  x: number;
  z: number;
  rot: number;
  /** When moving an existing piece. */
  uid?: string;
}

export function moodColor(mood: number) {
  if (mood >= 65) return "#3ddc84";
  if (mood >= 35) return "#ffd23f";
  return "#ff5a6e";
}

const NEON = "#00ec97";
const NEON_2 = "#a78bfa";

function Strip({ p, s, c }: { p: [number, number, number]; s: [number, number, number]; c: string }) {
  return (
    <mesh position={p}>
      <boxGeometry args={s} />
      <meshStandardMaterial color={c} emissive={c} emissiveIntensity={2.2} toneMapped={false} />
    </mesh>
  );
}

export function charMood(c: Character) {
  return Math.round(NEED_KEYS.reduce((s, k) => s + c.needs[k], 0) / NEED_KEYS.length);
}

/** World-space center of a footprint. */
function center(p: { itemId: string; x: number; z: number; rot: number }): [number, number] {
  const [w, d] = footprint(p.itemId, p.rot);
  return [p.x + w / 2 - HALF, p.z + d / 2 - HALF];
}

const LIE_HEIGHT: Record<string, number> = { mattress: 0.22, bed: 0.47, bathtub: 0.3, spa: 0.62 };

interface Spot {
  pos: [number, number, number];
  rotY: number;
  pose: Pose;
  hidden?: boolean;
}

/** Where a character stands/sits/lies to use a piece of furniture. */
function spotFor(f: PlacedFurniture, slot: number): Spot {
  const item = ITEMS[f.itemId];
  const spec = item?.furniture;
  const [cx, cz] = center(f);
  const rotY = (-f.rot * Math.PI) / 2;
  const fwd: [number, number] = [Math.sin(rotY), Math.cos(rotY)];
  const pose = spec?.pose ?? "stand";
  const side = (slot % 2 === 0 ? 1 : -1) * Math.ceil(slot / 2) * 0.45;
  const right: [number, number] = [fwd[1], -fwd[0]];
  if (pose === "lie") {
    return { pos: [cx + right[0] * side, LIE_HEIGHT[spec!.model] ?? 0.3, cz + right[1] * side], rotY, pose };
  }
  if (pose === "sit") {
    return { pos: [cx + fwd[0] * 0.05 + right[0] * side, 0, cz + fwd[1] * 0.05 + right[1] * side], rotY, pose };
  }
  const depth = spec?.size[1] ?? 1;
  const dist = spec?.model === "shower" ? 0 : depth / 2 + 0.35;
  return {
    pos: [cx + fwd[0] * dist + right[0] * side, spec?.model === "shower" ? 0.1 : 0, cz + fwd[1] * dist + right[1] * side],
    rotY: rotY + Math.PI,
    pose: "stand",
  };
}

function randomFreeCell(layout: PlacedFurniture[]): [number, number] {
  const taken = new Set<string>();
  for (const p of layout) {
    const [w, d] = footprint(p.itemId, p.rot);
    for (let i = 0; i < w; i++) for (let j = 0; j < d; j++) taken.add(`${p.x + i},${p.z + j}`);
  }
  for (let tries = 0; tries < 40; tries++) {
    const x = Math.floor(Math.random() * ROOM_SIZE);
    const z = Math.floor(Math.random() * ROOM_SIZE);
    if (!taken.has(`${x},${z}`)) return [x + 0.5 - HALF, z + 0.5 - HALF];
  }
  return [0.5, 0.5];
}

function RoomCharacter({
  c,
  layout,
  now,
  selected,
  walkTo,
  slot,
  onTap,
}: {
  c: Character;
  layout: PlacedFurniture[];
  now: number;
  selected: boolean;
  walkTo?: [number, number] | null;
  slot: number;
  onTap?: () => void;
}) {
  const group = useRef<Group>(null);
  const idle = useRef<{ target: [number, number]; until: number }>({ target: randomFreeCell(layout), until: 0 });
  const [pose, setPose] = useState<Pose>("stand");
  const [hidden, setHidden] = useState(false);
  const busy = c.busy && c.busy.until > now ? c.busy : null;

  const spot: Spot | null = useMemo(() => {
    if (!busy) return c.location ? { pos: [DOOR[0], 0, DOOR[1]], rotY: -Math.PI / 2, pose: "stand", hidden: true } : null;
    if (busy.action === "work" || busy.place) return { pos: [DOOR[0], 0, DOOR[1]], rotY: -Math.PI / 2, pose: "stand", hidden: true };
    const f = busy.at ? layout.find((p) => p.uid === busy.at) : undefined;
    return f ? spotFor(f, slot) : null;
  }, [busy, layout, slot, c.location]);

  useFrame((_, dt) => {
    const g = group.current;
    if (!g) return;
    let target: [number, number, number];
    let finalRot: number | null = null;
    let finalPose: Pose = "stand";
    if (spot) {
      target = spot.pos;
      finalRot = spot.rotY;
      finalPose = spot.pose;
    } else {
      if (walkTo) idle.current = { target: walkTo, until: performance.now() + 12000 };
      else if (performance.now() > idle.current.until) {
        idle.current = { target: randomFreeCell(layout), until: performance.now() + 7000 + Math.random() * 8000 };
      }
      target = [idle.current.target[0], 0, idle.current.target[1]];
    }
    const dx = target[0] - g.position.x;
    const dz = target[2] - g.position.z;
    const dist = Math.hypot(dx, dz);
    if (dist > 0.06) {
      const step = Math.min(dist, dt * 2.2);
      g.position.x += (dx / dist) * step;
      g.position.z += (dz / dist) * step;
      g.position.y = 0;
      g.rotation.y = Math.atan2(dx, dz);
      if (pose !== "walk") setPose("walk");
      if (hidden) setHidden(false);
    } else {
      g.position.y = target[1];
      if (finalRot !== null) g.rotation.y = finalRot;
      if (pose !== finalPose) setPose(finalPose);
      const shouldHide = Boolean(spot?.hidden);
      if (hidden !== shouldHide) setHidden(shouldHide);
    }
  });

  const mood = charMood(c);
  return (
    <group
      ref={group}
      position={[0.5 + slot * 0.6 - 1, 0, 1]}
      visible={!hidden}
      onClick={(e) => {
        if (e.delta > 6) return;
        e.stopPropagation();
        onTap?.();
      }}
    >
      <Character3D look={c.look} pose={pose} />
      {selected && !hidden && <Halo color={moodColor(mood)} />}
      <Anchor id={`char:${c.id}`} offsetY={selected ? 1.95 : 1.55} />
    </group>
  );
}

function Floor({ color, onTap, onHover }: { color: string; onTap: (x: number, z: number) => void; onHover?: (x: number, z: number) => void }) {
  const lighter = useMemo(() => new Color(color).lerp(new Color("#ffffff"), 0.07).getStyle(), [color]);
  const tiles = useMemo(() => {
    const out: Array<{ x: number; z: number; dark: boolean }> = [];
    for (let x = 0; x < ROOM_SIZE; x++) for (let z = 0; z < ROOM_SIZE; z++) out.push({ x, z, dark: (Math.floor(x / 2) + Math.floor(z / 2)) % 2 === 0 });
    return out;
  }, []);
  const cell = (e: ThreeEvent<PointerEvent | MouseEvent>): [number, number] => [Math.floor(e.point.x + HALF), Math.floor(e.point.z + HALF)];
  return (
    <group>
      <mesh position={[0, -0.005, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[ROOM_SIZE, ROOM_SIZE]} />
        <meshStandardMaterial color="#8b7355" />
      </mesh>
      {tiles.map((t) => (
        <mesh key={`${t.x},${t.z}`} position={[t.x + 0.5 - HALF, 0, t.z + 0.5 - HALF]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[0.98, 0.98]} />
          <meshStandardMaterial color={t.dark ? color : lighter} roughness={0.9} />
        </mesh>
      ))}
      <mesh
        position={[0, 0.001, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        onClick={(e) => {
          if (e.delta > 6) return;
          e.stopPropagation();
          const [x, z] = cell(e);
          if (x >= 0 && z >= 0 && x < ROOM_SIZE && z < ROOM_SIZE) onTap(x, z);
        }}
        onPointerMove={(e) => {
          if (!onHover) return;
          const [x, z] = cell(e);
          if (x >= 0 && z >= 0 && x < ROOM_SIZE && z < ROOM_SIZE) onHover(x, z);
        }}
      >
        <planeGeometry args={[ROOM_SIZE, ROOM_SIZE]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
    </group>
  );
}

function Walls({ color, glow }: { color: string; glow: boolean }) {
  return (
    <group>
      {/* neon LED strips under the wall caps and along the skirting */}
      {glow && (
        <>
          <Strip p={[0, WALL_H - 0.06, -HALF + 0.01]} s={[ROOM_SIZE, 0.04, 0.03]} c={NEON} />
          <Strip p={[-HALF + 0.01, WALL_H - 0.06, 0]} s={[0.03, 0.04, ROOM_SIZE]} c={NEON} />
          <Strip p={[0, 0.04, -HALF + 0.01]} s={[ROOM_SIZE, 0.025, 0.03]} c={NEON_2} />
          <Strip p={[-HALF + 0.01, 0.04, 0]} s={[0.03, 0.025, ROOM_SIZE]} c={NEON_2} />
        </>
      )}
      {/* back-right wall (north, along x) */}
      <mesh position={[0, WALL_H / 2, -HALF - 0.075]} receiveShadow castShadow>
        <boxGeometry args={[ROOM_SIZE + 0.3, WALL_H, 0.15]} />
        <meshStandardMaterial color={color} />
      </mesh>
      {/* back-left wall (west, along z) */}
      <mesh position={[-HALF - 0.075, WALL_H / 2, 0]} receiveShadow castShadow>
        <boxGeometry args={[0.15, WALL_H, ROOM_SIZE]} />
        <meshStandardMaterial color={color} />
      </mesh>
      {/* wall caps */}
      <mesh position={[0, WALL_H + 0.04, -HALF - 0.075]}>
        <boxGeometry args={[ROOM_SIZE + 0.3, 0.08, 0.2]} />
        <meshStandardMaterial color="#2a4ed0" />
      </mesh>
      <mesh position={[-HALF - 0.075, WALL_H + 0.04, 0]}>
        <boxGeometry args={[0.2, 0.08, ROOM_SIZE]} />
        <meshStandardMaterial color="#2a4ed0" />
      </mesh>
      {/* door */}
      <mesh position={[-HALF + 0.005, 1.0, DOOR[1]]}>
        <boxGeometry args={[0.04, 2.0, 0.95]} />
        <meshStandardMaterial color="#3b2416" />
      </mesh>
      <mesh position={[-HALF + 0.03, 1.0, DOOR[1] + 0.32]}>
        <sphereGeometry args={[0.04]} />
        <meshStandardMaterial color="#facc15" metalness={0.6} />
      </mesh>
      {/* wide window onto the night skyline */}
      <group position={[1.6, 1.45, -HALF + 0.01]}>
        <mesh>
          <boxGeometry args={[2.6, 1.2, 0.04]} />
          <meshStandardMaterial color="#111426" />
        </mesh>
        <mesh position={[0, 0, 0.025]}>
          <planeGeometry args={[2.45, 1.05]} />
          <meshStandardMaterial color="#1b2550" emissive="#2a3a8a" emissiveIntensity={0.6} />
        </mesh>
        {[
          [-0.9, 0.25],
          [-0.55, 0.4],
          [-0.2, 0.18],
          [0.15, 0.5],
          [0.5, 0.3],
          [0.85, 0.42],
        ].map(([x, h], i) => (
          <mesh key={i} position={[x, -0.52 + h / 2, 0.03]}>
            <planeGeometry args={[0.3, h]} />
            <meshStandardMaterial color="#0b0f24" emissive={i % 2 ? "#f0abfc" : "#67e8f9"} emissiveIntensity={0.25} />
          </mesh>
        ))}
        <mesh position={[0, 0, 0.04]}>
          <boxGeometry args={[0.04, 1.05, 0.02]} />
          <meshStandardMaterial color="#111426" />
        </mesh>
      </group>
      {/* neon ring sign + wall clock */}
      <mesh position={[-HALF + 0.03, 1.7, 1.0]} rotation={[0, Math.PI / 2, 0]}>
        <torusGeometry args={[0.28, 0.025, 10, 40]} />
        <meshStandardMaterial color={NEON_2} emissive={NEON_2} emissiveIntensity={2} toneMapped={false} />
      </mesh>
      <mesh position={[-HALF + 0.05, 1.9, -1.2]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.18, 0.18, 0.04, 20]} />
        <meshStandardMaterial color="#e5e7eb" />
      </mesh>
      {/* low front ledges so the room reads as a cutaway */}
      <mesh position={[0, 0.08, HALF + 0.05]}>
        <boxGeometry args={[ROOM_SIZE + 0.3, 0.16, 0.1]} />
        <meshStandardMaterial color="#2a4ed0" />
      </mesh>
      <mesh position={[HALF + 0.05, 0.08, 0]}>
        <boxGeometry args={[0.1, 0.16, ROOM_SIZE]} />
        <meshStandardMaterial color="#2a4ed0" />
      </mesh>
    </group>
  );
}

function Yard() {
  return (
    <group>
      <mesh position={[0, -0.02, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[16, 48]} />
        <meshStandardMaterial color="#5fae62" />
      </mesh>
      {/* front path */}
      <mesh position={[2.5, -0.01, HALF + 1.6]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[2.2, 3]} />
        <meshStandardMaterial color="#d8c9a6" />
      </mesh>
      {[
        [-6, -5],
        [6.5, -4],
        [-6.5, 4],
        [7, 5.5],
      ].map(([x, z], i) => (
        <group key={i} position={[x, 0, z]}>
          <mesh position={[0, 0.5, 0]}>
            <cylinderGeometry args={[0.12, 0.15, 1]} />
            <meshStandardMaterial color="#7c4a1e" />
          </mesh>
          <mesh position={[0, 1.4, 0]} castShadow>
            <icosahedronGeometry args={[0.8, 0]} />
            <meshStandardMaterial color="#4d9a4a" flatShading />
          </mesh>
        </group>
      ))}
    </group>
  );
}

export function Room({
  household,
  now,
  mode,
  selectedCharId,
  placement,
  selectedFurnitureUid,
  walkTo,
  lightsOn,
  onFloorTap,
  onFloorHover,
  onFurnitureTap,
  onCharacterTap,
}: {
  household: HouseholdView;
  now: number;
  mode: "live" | "buy" | "visit";
  selectedCharId?: string | null;
  placement?: Placement | null;
  selectedFurnitureUid?: string | null;
  walkTo?: [number, number] | null;
  lightsOn: boolean;
  onFloorTap?: (x: number, z: number) => void;
  onFloorHover?: (x: number, z: number) => void;
  onFurnitureTap?: (f: PlacedFurniture) => void;
  onCharacterTap?: (c: Character) => void;
}) {
  const layout = household.layout ?? [];
  const usage = new Map<string, number>();
  const valid = placement ? canPlace(layout, placement.itemId, placement.x, placement.z, placement.rot, placement.uid) : false;

  return (
    <group>
      <Yard />
      <Floor color={household.floorColor ?? "#d9a066"} onTap={(x, z) => onFloorTap?.(x, z)} onHover={onFloorHover} />
      <Walls color={household.wallColor ?? "#7ec8ff"} glow={lightsOn} />

      {layout.map((f) => {
        const item = ITEMS[f.itemId];
        if (!item?.furniture || f.uid === placement?.uid) return null;
        const [cx, cz] = center(f);
        const selected = selectedFurnitureUid === f.uid;
        const [w, d] = footprint(f.itemId, f.rot);
        return (
          <group
            key={f.uid}
            position={[cx, 0, cz]}
            onClick={(e) => {
              if (e.delta > 6) return;
              e.stopPropagation();
              onFurnitureTap?.(f);
            }}
          >
            <group rotation={[0, (-f.rot * Math.PI) / 2, 0]}>
              <FurnitureModel model={item.furniture.model} color={item.furniture.color} lit={lightsOn} />
            </group>
            {(selected || mode === "buy") && (
              <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <planeGeometry args={[w - 0.06, d - 0.06]} />
                <meshBasicMaterial color={selected ? "#facc15" : "#ffffff"} transparent opacity={selected ? 0.55 : 0.18} />
              </mesh>
            )}
          </group>
        );
      })}

      {placement && ITEMS[placement.itemId]?.furniture && (
        <group position={[center(placement)[0], 0, center(placement)[1]]}>
          <group rotation={[0, (-placement.rot * Math.PI) / 2, 0]}>
            <FurnitureModel model={ITEMS[placement.itemId].furniture!.model} color={ITEMS[placement.itemId].furniture!.color} lit={lightsOn} />
          </group>
          <mesh position={[0, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={footprint(placement.itemId, placement.rot).map((v) => v - 0.04) as [number, number]} />
            <meshBasicMaterial color={valid ? "#22c55e" : "#ef4444"} transparent opacity={0.55} />
          </mesh>
        </group>
      )}

      {household.characters.map((c, i) => {
        const at = c.busy && c.busy.until > now ? c.busy.at : undefined;
        const slot = at ? (usage.get(at) ?? 0) : i;
        if (at) usage.set(at, slot + 1);
        return (
          <RoomCharacter
            key={c.id}
            c={c}
            layout={layout}
            now={now}
            slot={slot}
            selected={mode !== "visit" && c.id === selectedCharId}
            walkTo={c.id === selectedCharId ? walkTo : null}
            onTap={() => onCharacterTap?.(c)}
          />
        );
      })}
    </group>
  );
}
