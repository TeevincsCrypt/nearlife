"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { Group } from "three";
import type { CharacterLook } from "@/lib/types";

export type Pose = "stand" | "walk" | "sit" | "lie";

const DEFAULT_LOOK: CharacterLook = { skin: "#c68a62", hair: "#1c1917", hairStyle: "short", top: "#3b82f6", bottom: "#1f2937" };

function Box({ p, s, c }: { p: [number, number, number]; s: [number, number, number]; c: string }) {
  return (
    <mesh position={p} castShadow>
      <boxGeometry args={s} />
      <meshStandardMaterial color={c} roughness={0.85} />
    </mesh>
  );
}

function Hair({ look }: { look: CharacterLook }) {
  const c = look.hair;
  switch (look.hairStyle) {
    case "bald":
      return null;
    case "long":
      return (
        <>
          <Box p={[0, 0.2, -0.01]} s={[0.36, 0.1, 0.36]} c={c} />
          <Box p={[0, 0.02, -0.16]} s={[0.36, 0.38, 0.08]} c={c} />
          <Box p={[-0.17, 0.05, -0.02]} s={[0.05, 0.3, 0.3]} c={c} />
          <Box p={[0.17, 0.05, -0.02]} s={[0.05, 0.3, 0.3]} c={c} />
        </>
      );
    case "afro":
      return (
        <mesh position={[0, 0.17, -0.03]} castShadow>
          <icosahedronGeometry args={[0.27, 1]} />
          <meshStandardMaterial color={c} flatShading />
        </mesh>
      );
    case "bun":
      return (
        <>
          <Box p={[0, 0.18, -0.01]} s={[0.35, 0.08, 0.35]} c={c} />
          <Box p={[0, 0.3, -0.08]} s={[0.16, 0.14, 0.16]} c={c} />
        </>
      );
    default:
      return (
        <>
          <Box p={[0, 0.18, -0.01]} s={[0.35, 0.08, 0.35]} c={c} />
          <Box p={[0, 0.08, -0.16]} s={[0.35, 0.18, 0.05]} c={c} />
        </>
      );
  }
}

/** A blocky low-poly person, ~1.1 units tall, facing +z. */
export function Character3D({ look = DEFAULT_LOOK, pose = "stand" }: { look?: CharacterLook; pose?: Pose }) {
  const legL = useRef<Group>(null);
  const legR = useRef<Group>(null);
  const armL = useRef<Group>(null);
  const armR = useRef<Group>(null);
  const body = useRef<Group>(null);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const walking = pose === "walk";
    const swing = walking ? Math.sin(t * 10) * 0.7 : 0;
    const sitting = pose === "sit" || pose === "lie";
    if (legL.current) legL.current.rotation.x = sitting && pose === "sit" ? -Math.PI / 2 : swing;
    if (legR.current) legR.current.rotation.x = sitting && pose === "sit" ? -Math.PI / 2 : -swing;
    if (armL.current) armL.current.rotation.x = -swing * 0.8 + (pose === "sit" ? -0.4 : 0);
    if (armR.current) armR.current.rotation.x = swing * 0.8 + (pose === "sit" ? -0.4 : 0);
    if (body.current) body.current.position.y = walking ? Math.abs(Math.sin(t * 10)) * 0.04 : pose === "stand" ? Math.sin(t * 2) * 0.008 : 0;
  });

  // Sitting lowers the hips onto a seat (~0.45); lying rotates the whole body flat.
  const rootRotation: [number, number, number] = pose === "lie" ? [-Math.PI / 2, 0, 0] : [0, 0, 0];
  const rootPosition: [number, number, number] = pose === "sit" ? [0, -0.05, 0] : pose === "lie" ? [0, 0.1, 0.45] : [0, 0, 0];

  return (
    <group rotation={rootRotation} position={rootPosition}>
      <group ref={body}>
        {/* legs pivot at the hip (y = 0.5) */}
        <group ref={legL} position={[-0.08, 0.5, 0]}>
          <Box p={[0, -0.24, 0]} s={[0.13, 0.48, 0.14]} c={look.bottom} />
          <Box p={[0, -0.47, 0.03]} s={[0.14, 0.06, 0.2]} c="#7f1d1d" />
        </group>
        <group ref={legR} position={[0.08, 0.5, 0]}>
          <Box p={[0, -0.24, 0]} s={[0.13, 0.48, 0.14]} c={look.bottom} />
          <Box p={[0, -0.47, 0.03]} s={[0.14, 0.06, 0.2]} c="#7f1d1d" />
        </group>
        {/* torso */}
        <Box p={[0, 0.72, 0]} s={[0.32, 0.44, 0.18]} c={look.top} />
        {/* arms pivot at the shoulder */}
        <group ref={armL} position={[-0.21, 0.9, 0]}>
          <Box p={[0, -0.18, 0]} s={[0.09, 0.36, 0.11]} c={look.top} />
          <Box p={[0, -0.39, 0]} s={[0.08, 0.08, 0.09]} c={look.skin} />
        </group>
        <group ref={armR} position={[0.21, 0.9, 0]}>
          <Box p={[0, -0.18, 0]} s={[0.09, 0.36, 0.11]} c={look.top} />
          <Box p={[0, -0.39, 0]} s={[0.08, 0.08, 0.09]} c={look.skin} />
        </group>
        {/* head */}
        <group position={[0, 1.1, 0]}>
          <Box p={[0, 0, 0]} s={[0.32, 0.32, 0.32]} c={look.skin} />
          <Box p={[-0.07, 0.02, 0.165]} s={[0.04, 0.05, 0.01]} c="#111" />
          <Box p={[0.07, 0.02, 0.165]} s={[0.04, 0.05, 0.01]} c="#111" />
          <Box p={[0, -0.08, 0.165]} s={[0.08, 0.02, 0.01]} c="#7f1d1d" />
          <Hair look={look} />
        </group>
      </group>
    </group>
  );
}

/** The Sims-style diamond above the selected character. */
export function Plumbob3D({ color }: { color: string }) {
  const ref = useRef<Group>(null);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    ref.current.rotation.y = clock.elapsedTime * 1.5;
    ref.current.position.y = 1.65 + Math.sin(clock.elapsedTime * 2) * 0.05;
  });
  return (
    <group ref={ref}>
      <mesh scale={[0.09, 0.16, 0.09]}>
        <octahedronGeometry args={[1, 0]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.6} flatShading />
      </mesh>
    </group>
  );
}
