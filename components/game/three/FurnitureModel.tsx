"use client";

import type { ReactNode } from "react";

/** Box helper: position is the box center, in the model's local space (y up from the floor). */
function B({ p, s, c, e, o }: { p: [number, number, number]; s: [number, number, number]; c: string; e?: string; o?: number }) {
  return (
    <mesh position={p} castShadow receiveShadow>
      <boxGeometry args={s} />
      <meshStandardMaterial color={c} emissive={e ?? "#000"} emissiveIntensity={e ? 0.8 : 0} transparent={o !== undefined} opacity={o ?? 1} roughness={0.8} />
    </mesh>
  );
}

function Cyl({ p, r, h, c, seg = 16, e }: { p: [number, number, number]; r: number; h: number; c: string; seg?: number; e?: string }) {
  return (
    <mesh position={p} castShadow>
      <cylinderGeometry args={[r, r, h, seg]} />
      <meshStandardMaterial color={c} emissive={e ?? "#000"} emissiveIntensity={e ? 0.7 : 0} roughness={0.7} />
    </mesh>
  );
}

const WOOD = "#c08a55";
const WOOD_DARK = "#8a5a32";

function legs4(w: number, d: number, h: number, c = WOOD_DARK, t = 0.06): ReactNode {
  const x = w / 2 - t;
  const z = d / 2 - t;
  return (
    <>
      <B p={[-x, h / 2, -z]} s={[t, h, t]} c={c} />
      <B p={[x, h / 2, -z]} s={[t, h, t]} c={c} />
      <B p={[-x, h / 2, z]} s={[t, h, t]} c={c} />
      <B p={[x, h / 2, z]} s={[t, h, t]} c={c} />
    </>
  );
}

/**
 * Low-poly furniture built from primitives. Models are authored for rotation 0 with
 * their footprint (w × d cells) centered on the origin; the "front" faces +z.
 */
export function FurnitureModel({ model, color, lit = true }: { model: string; color: string; lit?: boolean }) {
  switch (model) {
    case "mattress":
      return (
        <group>
          <B p={[0, 0.1, 0]} s={[0.9, 0.2, 1.85]} c={color} />
          <B p={[0, 0.24, -0.7]} s={[0.6, 0.1, 0.3]} c="#f8fafc" />
        </group>
      );
    case "bed":
      return (
        <group>
          <B p={[0, 0.18, 0]} s={[1.85, 0.25, 1.9]} c={WOOD} />
          <B p={[0, 0.38, 0.05]} s={[1.75, 0.18, 1.75]} c="#f1f5f9" />
          <B p={[0, 0.48, 0.3]} s={[1.76, 0.06, 1.2]} c={color} />
          <B p={[-0.42, 0.52, -0.6]} s={[0.6, 0.12, 0.32]} c="#ffffff" />
          <B p={[0.42, 0.52, -0.6]} s={[0.6, 0.12, 0.32]} c="#ffffff" />
          <B p={[0, 0.6, -0.92]} s={[1.85, 0.9, 0.08]} c={WOOD_DARK} />
        </group>
      );
    case "lamp":
      return (
        <group>
          <B p={[0, 0.25, 0]} s={[0.5, 0.5, 0.5]} c={WOOD} />
          <Cyl p={[0, 0.65, 0]} r={0.03} h={0.3} c="#444" />
          <mesh position={[0, 0.88, 0]}>
            <coneGeometry args={[0.2, 0.25, 12, 1, true]} />
            <meshStandardMaterial color={color} emissive={lit ? color : "#000"} emissiveIntensity={lit ? 1.2 : 0} side={2} />
          </mesh>
          {lit && <pointLight position={[0, 0.85, 0]} intensity={1.5} distance={3} color="#ffd27a" />}
        </group>
      );
    case "fridge":
      return (
        <group>
          <B p={[0, 0.85, 0]} s={[0.8, 1.7, 0.75]} c={color} />
          <B p={[0, 1.15, 0.38]} s={[0.78, 0.02, 0.01]} c="#94a3b8" />
          <B p={[0.3, 1.4, 0.39]} s={[0.04, 0.3, 0.04]} c="#64748b" />
          <B p={[0.3, 0.75, 0.39]} s={[0.04, 0.4, 0.04]} c="#64748b" />
        </group>
      );
    case "stove":
      return (
        <group>
          <B p={[0, 0.42, 0]} s={[0.85, 0.84, 0.75]} c="#e5e7eb" />
          <B p={[0, 0.85, 0]} s={[0.85, 0.03, 0.75]} c={color} />
          {[-0.2, 0.2].map((x) => [-0.17, 0.17].map((z) => <Cyl key={`${x}${z}`} p={[x, 0.88, z]} r={0.1} h={0.03} c="#111" />))}
          <B p={[0, 0.45, 0.38]} s={[0.6, 0.4, 0.02]} c="#1f2937" />
        </group>
      );
    case "coffee":
      return (
        <group>
          <B p={[0, 0.42, 0]} s={[0.85, 0.84, 0.7]} c={WOOD} />
          <B p={[0, 1.05, -0.05]} s={[0.4, 0.42, 0.35]} c={color} />
          <B p={[0, 0.95, 0.15]} s={[0.12, 0.1, 0.1]} c="#e5e7eb" e={lit ? "#22d3ee" : undefined} />
        </group>
      );
    case "dining":
      return (
        <group>
          <Cyl p={[0, 0.72, 0]} r={0.75} h={0.06} c={color} seg={24} />
          <Cyl p={[0, 0.36, 0]} r={0.08} h={0.72} c={WOOD_DARK} />
          {[
            [0, 0.85, 0],
            [0, -0.85, Math.PI],
            [0.85, 0, -Math.PI / 2],
            [-0.85, 0, Math.PI / 2],
          ].map(([x, z, r], i) => (
            <group key={i} position={[x, 0, z]} rotation={[0, r, 0]}>
              <B p={[0, 0.42, 0]} s={[0.4, 0.05, 0.4]} c="#7c2d12" />
              <B p={[0, 0.7, 0.18]} s={[0.4, 0.5, 0.05]} c="#7c2d12" />
              {legs4(0.4, 0.4, 0.42, "#5b1f0a", 0.04)}
            </group>
          ))}
        </group>
      );
    case "shower":
      return (
        <group>
          <B p={[0, 0.05, 0]} s={[0.9, 0.1, 0.9]} c="#e2e8f0" />
          <B p={[0, 1.0, 0.44]} s={[0.9, 1.9, 0.02]} c={color} o={0.3} />
          <B p={[0.44, 1.0, 0]} s={[0.02, 1.9, 0.9]} c={color} o={0.3} />
          <Cyl p={[-0.3, 1.9, -0.3]} r={0.1} h={0.04} c="#94a3b8" />
          <Cyl p={[-0.4, 1.4, -0.4]} r={0.02} h={1.0} c="#94a3b8" />
        </group>
      );
    case "bathtub":
      return (
        <group>
          <B p={[0, 0.3, 0]} s={[0.9, 0.6, 1.85]} c={color} />
          <B p={[0, 0.55, 0]} s={[0.7, 0.1, 1.6]} c="#7dd3fc" />
          <Cyl p={[0, 0.75, -0.8]} r={0.03} h={0.3} c="#94a3b8" />
        </group>
      );
    case "toilet":
      return (
        <group>
          <Cyl p={[0, 0.22, 0.05]} r={0.22} h={0.44} c={color} />
          <B p={[0, 0.6, -0.25]} s={[0.45, 0.45, 0.2]} c={color} />
          <Cyl p={[0, 0.45, 0.05]} r={0.24} h={0.04} c="#e2e8f0" />
        </group>
      );
    case "spa":
      return (
        <group>
          <B p={[0, 0.55, 0]} s={[1.8, 0.15, 0.7]} c={color} />
          <B p={[-0.7, 0.66, 0]} s={[0.3, 0.08, 0.5]} c="#ffffff" />
          {legs4(1.7, 0.6, 0.5, "#e5e7eb")}
        </group>
      );
    case "chair":
      return (
        <group>
          <B p={[0, 0.45, 0]} s={[0.45, 0.06, 0.45]} c={color} />
          <B p={[0, 0.8, -0.2]} s={[0.45, 0.65, 0.06]} c={color} />
          <B p={[0, 0.85, -0.2]} s={[0.3, 0.06, 0.07]} c="#ffffff" o={0.4} />
          {legs4(0.45, 0.45, 0.45, color, 0.06)}
        </group>
      );
    case "armchair":
      return (
        <group>
          <B p={[0, 0.25, 0]} s={[0.85, 0.4, 0.8]} c={color} />
          <B p={[0, 0.65, -0.32]} s={[0.85, 0.6, 0.18]} c={color} />
          <B p={[-0.38, 0.55, 0]} s={[0.12, 0.3, 0.8]} c={color} />
          <B p={[0.38, 0.55, 0]} s={[0.12, 0.3, 0.8]} c={color} />
        </group>
      );
    case "sofa":
      return (
        <group>
          <B p={[0, 0.25, 0.02]} s={[1.85, 0.4, 0.8]} c={color} />
          <B p={[0, 0.65, -0.3]} s={[1.85, 0.55, 0.2]} c={color} />
          <B p={[-0.86, 0.52, 0.02]} s={[0.14, 0.3, 0.8]} c={color} />
          <B p={[0.86, 0.52, 0.02]} s={[0.14, 0.3, 0.8]} c={color} />
          <B p={[-0.4, 0.48, 0.05]} s={[0.8, 0.08, 0.65]} c="#d6a77a" />
          <B p={[0.4, 0.48, 0.05]} s={[0.8, 0.08, 0.65]} c="#d6a77a" />
        </group>
      );
    case "fan":
      return (
        <group>
          <Cyl p={[0, 0.03, 0]} r={0.2} h={0.05} c="#111" />
          <Cyl p={[0, 0.6, 0]} r={0.025} h={1.15} c="#444" />
          <mesh position={[0, 1.2, 0.05]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.2, 0.015, 6, 20]} />
            <meshStandardMaterial color="#cbd5e1" />
          </mesh>
          <Cyl p={[0, 1.2, 0.05]} r={0.06} h={0.08} c="#38bdf8" />
        </group>
      );
    case "plant":
      return (
        <group>
          <Cyl p={[0, 0.2, 0]} r={0.2} h={0.4} c="#b45309" />
          <mesh position={[0, 0.7, 0]} castShadow>
            <icosahedronGeometry args={[0.35, 0]} />
            <meshStandardMaterial color={color} flatShading />
          </mesh>
        </group>
      );
    case "tv":
      return (
        <group>
          <B p={[0, 0.25, -0.1]} s={[0.9, 0.5, 0.45]} c={WOOD_DARK} />
          <B p={[0, 0.88, -0.2]} s={[0.95, 0.6, 0.06]} c={color} />
          <B p={[0, 0.88, -0.165]} s={[0.85, 0.5, 0.01]} c={lit ? "#60a5fa" : "#0b1220"} e={lit ? "#3b82f6" : undefined} />
        </group>
      );
    case "arcade":
      return (
        <group>
          <B p={[0, 0.8, -0.05]} s={[0.7, 1.6, 0.7]} c={color} />
          <B p={[0, 1.15, 0.31]} s={[0.55, 0.45, 0.02]} c={lit ? "#f472b6" : "#111"} e={lit ? "#ec4899" : undefined} />
          <B p={[0, 0.85, 0.38]} s={[0.6, 0.08, 0.2]} c="#111" />
          <Cyl p={[-0.12, 0.92, 0.38]} r={0.03} h={0.08} c="#ef4444" />
        </group>
      );
    case "bookshelf":
      return (
        <group>
          <B p={[0, 0.9, -0.2]} s={[0.9, 1.8, 0.4]} c={color} />
          {[0.35, 0.8, 1.25].map((y) =>
            ["#ef4444", "#3b82f6", "#eab308", "#10b981", "#a855f7"].map((c, i) => (
              <B key={`${y}${i}`} p={[-0.3 + i * 0.15, y + 0.17, -0.02]} s={[0.1, 0.3, 0.3]} c={c} />
            )),
          )}
        </group>
      );
    case "speaker":
      return (
        <group>
          <B p={[0, 0.6, 0]} s={[0.6, 1.2, 0.55]} c={color} />
          <Cyl p={[0, 0.85, 0.28]} r={0.17} h={0.03} c={lit ? "#a78bfa" : "#374151"} e={lit ? "#8b5cf6" : undefined} />
          <Cyl p={[0, 0.4, 0.28]} r={0.22} h={0.03} c="#374151" />
        </group>
      );
    case "cardtable":
      return (
        <group>
          <B p={[0, 0.72, 0]} s={[0.85, 0.05, 0.85]} c={color} />
          <B p={[0.1, 0.76, 0.05]} s={[0.12, 0.02, 0.18]} c="#ffffff" />
          <B p={[-0.15, 0.76, -0.1]} s={[0.12, 0.02, 0.18]} c="#fca5a5" />
          {legs4(0.85, 0.85, 0.72)}
        </group>
      );
    case "workbench":
      return (
        <group>
          <B p={[0, 0.8, 0]} s={[1.85, 0.1, 0.8]} c={color} />
          <B p={[0, 0.3, -0.2]} s={[1.7, 0.05, 0.4]} c={WOOD_DARK} />
          {legs4(1.85, 0.8, 0.8, WOOD_DARK, 0.08)}
          <B p={[0.5, 0.9, 0.1]} s={[0.35, 0.08, 0.08]} c="#64748b" />
          <B p={[-0.4, 0.88, -0.1]} s={[0.4, 0.06, 0.25]} c="#fde68a" />
        </group>
      );
    default:
      return <B p={[0, 0.4, 0]} s={[0.8, 0.8, 0.8]} c={color} />;
  }
}
