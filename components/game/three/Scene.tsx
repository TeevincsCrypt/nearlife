"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { Color, MOUSE, TOUCH } from "three";

function daylight(hour: number, minute: number) {
  const t = hour + minute / 60;
  // 0 at night, 1 at noon, smooth dawn (5-8) and dusk (17-20)
  if (t < 5 || t > 20) return 0;
  if (t < 8) return (t - 5) / 3;
  if (t > 17) return (20 - t) / 3;
  return 1;
}

function Lights({ day, powerCut }: { day: number; powerCut: boolean }) {
  const { scene } = useThree();
  useEffect(() => {
    const night = new Color("#22355e");
    const sky = new Color("#bfe0f2");
    scene.background = night.lerp(sky, day);
  }, [day, scene]);
  return (
    <>
      <hemisphereLight args={["#ffffff", "#8aa37a", 0.75 + day * 0.35]} />
      <ambientLight intensity={(powerCut ? 0.3 : 0.45) + day * 0.2} color={day > 0.5 ? "#ffffff" : "#dbe4ff"} />
      <directionalLight
        position={[10, 18, 8]}
        intensity={0.6 + day * 1.0}
        color={day > 0.3 ? "#fff6e5" : "#a5b4fc"}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-14}
        shadow-camera-right={14}
        shadow-camera-top={14}
        shadow-camera-bottom={-14}
      />
    </>
  );
}

function usePortrait() {
  const [portrait, setPortrait] = useState(() => typeof window !== "undefined" && window.innerWidth / window.innerHeight < 0.8);
  useEffect(() => {
    const on = () => setPortrait(window.innerWidth / window.innerHeight < 0.8);
    window.addEventListener("resize", on);
    return () => window.removeEventListener("resize", on);
  }, []);
  return portrait;
}

/** Where the camera looks. On tall screens we aim in front of the room so it sits higher, above the HUD. */
function targetFor(kind: "room" | "city", portrait: boolean): [number, number, number] {
  if (kind === "room") return portrait ? [0.9, 0, 0.9] : [0, 0.6, 0];
  return [0, 0, 2];
}

function CameraRig({ kind, portrait }: { kind: "room" | "city"; portrait: boolean }) {
  const { camera } = useThree();
  useEffect(() => {
    // Pull back further on tall phone screens so the whole room / more of the map fits.
    const dist = kind === "room" ? (portrait ? 24 : 17) : portrait ? 64 : 48;
    const dir = kind === "room" ? [1, 1.05, 1] : [0.55, 1, 0.75];
    const len = Math.hypot(dir[0], dir[1], dir[2]);
    const t = targetFor(kind, portrait);
    camera.position.set(t[0] + (dir[0] / len) * dist, t[1] + (dir[1] / len) * dist, t[2] + (dir[2] / len) * dist);
    camera.lookAt(...t);
  }, [kind, camera, portrait]);
  return null;
}

export function Scene({
  kind,
  hour,
  minute,
  powerCut,
  children,
}: {
  kind: "room" | "city";
  hour: number;
  minute: number;
  powerCut: boolean;
  children: ReactNode;
}) {
  const day = daylight(hour, minute);
  const portrait = usePortrait();
  const target = targetFor(kind, portrait);
  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      camera={{ fov: kind === "room" ? 38 : 42, position: [9.5, 10.5, 9.5], near: 0.1, far: 300 }}
      gl={{ antialias: true }}
      style={{ touchAction: "none" }}
    >
      <Lights day={day} powerCut={powerCut} />
      <CameraRig kind={kind} portrait={portrait} />
      {kind === "room" ? (
        <OrbitControls
          key={`room${portrait}`}
          makeDefault
          target={target}
          enablePan={false}
          minDistance={7}
          maxDistance={32}
          minPolarAngle={0.45}
          maxPolarAngle={1.15}
          minAzimuthAngle={-0.2}
          maxAzimuthAngle={Math.PI / 2 + 0.2}
          enableDamping
        />
      ) : (
        <OrbitControls
          key={`city${portrait}`}
          makeDefault
          target={target}
          screenSpacePanning={false}
          minDistance={12}
          maxDistance={95}
          minPolarAngle={0.35}
          maxPolarAngle={1.05}
          mouseButtons={{ LEFT: MOUSE.PAN, MIDDLE: MOUSE.DOLLY, RIGHT: MOUSE.ROTATE }}
          touches={{ ONE: TOUCH.PAN, TWO: TOUCH.DOLLY_ROTATE }}
          enableDamping
        />
      )}
      {children}
    </Canvas>
  );
}
