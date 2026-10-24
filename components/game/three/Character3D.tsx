"use client";

import { useRef, type ReactNode } from "react";
import { useFrame } from "@react-three/fiber";
import type { Group } from "three";
import type { CharacterLook } from "@/lib/types";

export type Pose = "stand" | "walk" | "sit" | "lie" | "dance" | "wave";

const DEFAULT_LOOK: CharacterLook = { skin: "#c68a62", hair: "#1c1917", hairStyle: "short", top: "#3b82f6", bottom: "#1f2937" };

function Mat({ c, r = 0.65 }: { c: string; r?: number }) {
  return <meshStandardMaterial color={c} roughness={r} />;
}

/** A capsule hanging down from its top end (so its group can be used as a joint). */
function Limb({ r, len, c }: { r: number; len: number; c: string }) {
  return (
    <mesh position={[0, -len / 2, 0]} castShadow>
      <capsuleGeometry args={[r, Math.max(0.001, len - r * 2), 6, 12]} />
      <Mat c={c} />
    </mesh>
  );
}

function Hair({ look }: { look: CharacterLook }) {
  const c = look.hair;
  // Head sphere radius is ~0.115 (scaled y 1.12). A cap is a partial sphere slightly larger.
  const cap = (extra: ReactNode = null, thetaLength = Math.PI * 0.55) => (
    <>
      <mesh position={[0, 0.012, -0.006]} scale={[1, 1.12, 1]} castShadow>
        <sphereGeometry args={[0.124, 24, 16, 0, Math.PI * 2, 0, thetaLength]} />
        <Mat c={c} r={0.85} />
      </mesh>
      {extra}
    </>
  );
  switch (look.hairStyle) {
    case "bald":
      return null;
    case "afro":
      return (
        <mesh position={[0, 0.075, -0.045]} scale={[1, 0.9, 0.95]} castShadow>
          <icosahedronGeometry args={[0.15, 3]} />
          <Mat c={c} r={1} />
        </mesh>
      );
    case "long":
      return cap(
        <mesh position={[0, -0.09, -0.06]} castShadow>
          <capsuleGeometry args={[0.1, 0.16, 6, 12]} />
          <Mat c={c} r={0.85} />
        </mesh>,
        Math.PI * 0.6,
      );
    case "bun":
      return cap(
        <mesh position={[0, 0.13, -0.07]} castShadow>
          <sphereGeometry args={[0.06, 16, 12]} />
          <Mat c={c} r={0.85} />
        </mesh>,
      );
    default:
      return cap(null, Math.PI * 0.48);
  }
}

/**
 * A stylised human, ~1.25 units tall, facing +z. Legs and arms have hip/knee and
 * shoulder/elbow joints so walking, sitting and lying read naturally.
 */
export function Character3D({ look = DEFAULT_LOOK, pose = "stand" }: { look?: CharacterLook; pose?: Pose }) {
  const hipL = useRef<Group>(null);
  const hipR = useRef<Group>(null);
  const kneeL = useRef<Group>(null);
  const kneeR = useRef<Group>(null);
  const shL = useRef<Group>(null);
  const shR = useRef<Group>(null);
  const elL = useRef<Group>(null);
  const elR = useRef<Group>(null);
  const body = useRef<Group>(null);
  const head = useRef<Group>(null);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const walking = pose === "walk";
    const sit = pose === "sit";
    const s = Math.sin(t * 8);
    const swing = walking ? s * 0.55 : 0;
    const set = (g: Group | null, x: number) => g && (g.rotation.x = x);
    set(hipL.current, sit ? -Math.PI / 2 : swing);
    set(hipR.current, sit ? -Math.PI / 2 : -swing);
    // Knees bend on the back-swing when walking, 90° when seated.
    set(kneeL.current, sit ? Math.PI / 2 : walking ? Math.max(0, -s) * 0.7 : 0);
    set(kneeR.current, sit ? Math.PI / 2 : walking ? Math.max(0, s) * 0.7 : 0);
    set(shL.current, sit ? -0.35 : -swing * 0.7);
    set(shR.current, sit ? -0.35 : swing * 0.7);
    set(elL.current, sit ? -0.6 : walking ? -0.35 : -0.12);
    set(elR.current, sit ? -0.6 : walking ? -0.35 : -0.12);
    if (body.current) body.current.position.y = walking ? Math.abs(Math.cos(t * 8)) * 0.025 : 0;
    if (body.current) body.current.rotation.y = 0;
    if (head.current) head.current.rotation.y = pose === "stand" ? Math.sin(t * 0.6) * 0.25 : 0;
    if (head.current) head.current.rotation.x = pose === "stand" ? Math.sin(t * 1.3) * 0.03 : 0;
    if (pose === "dance") {
      // Bounce on the beat with arms up, hips swaying side to side.
      const beat = Math.sin(t * 9);
      const sway = Math.sin(t * 4.5);
      set(hipL.current, sway * 0.25);
      set(hipR.current, -sway * 0.25);
      set(kneeL.current, Math.max(0, beat) * 0.4);
      set(kneeR.current, Math.max(0, -beat) * 0.4);
      set(shL.current, -2.5 + Math.sin(t * 9) * 0.35);
      set(shR.current, -2.5 + Math.sin(t * 9 + Math.PI) * 0.35);
      set(elL.current, -0.55);
      set(elR.current, -0.55);
      if (body.current) {
        body.current.position.y = Math.abs(beat) * 0.06;
        body.current.rotation.y = sway * 0.35;
      }
      if (head.current) head.current.rotation.x = Math.abs(beat) * 0.12;
    } else if (pose === "wave") {
      set(shR.current, -2.75);
      set(elR.current, -0.35 + Math.sin(t * 12) * 0.45);
    }
  });

  const rootRotation: [number, number, number] = pose === "lie" ? [-Math.PI / 2, 0, 0] : [0, 0, 0];
  const rootPosition: [number, number, number] = pose === "sit" ? [0, -0.17, -0.08] : pose === "lie" ? [0, 0.1, 0.5] : [0, 0, 0];

  return (
    <group rotation={rootRotation} position={rootPosition}>
      <group ref={body}>
        {/* hips */}
        <mesh position={[0, 0.66, 0]} scale={[1, 0.7, 0.75]} castShadow>
          <sphereGeometry args={[0.13, 20, 14]} />
          <Mat c={look.bottom} />
        </mesh>
        {/* legs: hip -> knee -> shoe */}
        {[
          [-0.07, hipL, kneeL],
          [0.07, hipR, kneeR],
        ].map(([x, hip, knee], i) => (
          <group key={i} ref={hip as React.RefObject<Group>} position={[x as number, 0.64, 0]}>
            <Limb r={0.058} len={0.32} c={look.bottom} />
            <group ref={knee as React.RefObject<Group>} position={[0, -0.3, 0]}>
              <Limb r={0.048} len={0.3} c={look.bottom} />
              <mesh position={[0, -0.31, 0.035]} scale={[1, 0.6, 1.6]} castShadow>
                <sphereGeometry args={[0.05, 14, 10]} />
                <Mat c="#2b2b33" r={0.4} />
              </mesh>
            </group>
          </group>
        ))}
        {/* torso */}
        <mesh position={[0, 0.9, 0]} scale={[1, 1, 0.68]} castShadow>
          <capsuleGeometry args={[0.145, 0.2, 8, 16]} />
          <Mat c={look.top} r={0.8} />
        </mesh>
        {/* neck */}
        <mesh position={[0, 1.09, 0]}>
          <cylinderGeometry args={[0.04, 0.045, 0.07, 12]} />
          <Mat c={look.skin} />
        </mesh>
        {/* arms: shoulder -> elbow -> hand */}
        {[
          [-0.185, shL, elL, 1],
          [0.185, shR, elR, -1],
        ].map(([x, sh, el, side], i) => (
          <group key={i} ref={sh as React.RefObject<Group>} position={[x as number, 1.02, 0]} rotation={[0, 0, (side as number) * 0.08]}>
            <Limb r={0.045} len={0.25} c={look.top} />
            <group ref={el as React.RefObject<Group>} position={[0, -0.23, 0]}>
              <Limb r={0.038} len={0.22} c={look.skin} />
              <mesh position={[0, -0.24, 0]} scale={[0.85, 1.1, 0.6]}>
                <sphereGeometry args={[0.042, 12, 10]} />
                <Mat c={look.skin} />
              </mesh>
            </group>
          </group>
        ))}
        {/* head */}
        <group ref={head} position={[0, 1.24, 0]}>
          <mesh scale={[0.95, 1.12, 1]} castShadow>
            <sphereGeometry args={[0.115, 28, 20]} />
            <Mat c={look.skin} r={0.55} />
          </mesh>
          {/* ears */}
          {[-1, 1].map((sx) => (
            <mesh key={sx} position={[sx * 0.108, -0.005, -0.005]} scale={[0.5, 1, 0.8]}>
              <sphereGeometry args={[0.028, 10, 8]} />
              <Mat c={look.skin} />
            </mesh>
          ))}
          {/* eyes */}
          {[-1, 1].map((sx) => (
            <group key={sx} position={[sx * 0.04, 0.012, 0.1]}>
              <mesh scale={[1, 1, 0.5]}>
                <sphereGeometry args={[0.019, 12, 10]} />
                <meshStandardMaterial color="#ffffff" roughness={0.3} />
              </mesh>
              <mesh position={[0, 0, 0.009]}>
                <sphereGeometry args={[0.011, 10, 8]} />
                <meshStandardMaterial color="#231a14" roughness={0.2} />
              </mesh>
            </group>
          ))}
          {/* brows */}
          {[-1, 1].map((sx) => (
            <mesh key={sx} position={[sx * 0.042, 0.045, 0.105]} rotation={[0, 0, sx * -0.12]}>
              <boxGeometry args={[0.034, 0.008, 0.008]} />
              <Mat c={look.hair === "#9ca3af" ? "#6b7280" : look.hair} />
            </mesh>
          ))}
          {/* nose + mouth */}
          <mesh position={[0, -0.015, 0.113]} scale={[0.8, 1, 1]}>
            <sphereGeometry args={[0.016, 10, 8]} />
            <Mat c={look.skin} />
          </mesh>
          <mesh position={[0, -0.055, 0.103]} rotation={[0, 0, Math.PI / 2]}>
            <capsuleGeometry args={[0.006, 0.028, 4, 8]} />
            <meshStandardMaterial color="#8a3b3b" roughness={0.5} />
          </mesh>
          <Hair look={look} />
        </group>
      </group>
    </group>
  );
}

/** Neon halo floating above the selected Sim, colored by mood. */
export function Halo({ color }: { color: string }) {
  const ref = useRef<Group>(null);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    ref.current.rotation.y = clock.elapsedTime * 1.2;
    ref.current.position.y = 1.6 + Math.sin(clock.elapsedTime * 2.2) * 0.04;
  });
  return (
    <group ref={ref}>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.13, 0.018, 10, 36]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.6} toneMapped={false} />
      </mesh>
      <mesh position={[0, 0, 0]}>
        <sphereGeometry args={[0.025, 10, 8]} />
        <meshStandardMaterial color="#ffffff" emissive={color} emissiveIntensity={2} toneMapped={false} />
      </mesh>
    </group>
  );
}
