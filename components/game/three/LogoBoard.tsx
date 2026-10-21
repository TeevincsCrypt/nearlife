"use client";

import { useEffect, useState } from "react";
import { SRGBColorSpace, TextureLoader, type Texture } from "three";
import { LOGOS } from "../ui/BrandIcon";

/** Loads a project's logo as a texture (null until loaded, or when there is no logo). */
export function useLogoTexture(id: string) {
  const [tex, setTex] = useState<Texture | null>(null);
  useEffect(() => {
    const src = LOGOS[id];
    if (!src) return;
    let alive = true;
    let loaded: Texture | null = null;
    new TextureLoader().load(src, (t) => {
      t.colorSpace = SRGBColorSpace;
      loaded = t;
      if (alive) setTex(t);
      else t.dispose();
    });
    return () => {
      alive = false;
      loaded?.dispose();
    };
  }, [id]);
  return tex;
}

/** A white plaque showing the logo. */
export function LogoPlaque({ id, size = 1, position, rotation }: { id: string; size?: number; position: [number, number, number]; rotation?: [number, number, number] }) {
  const tex = useLogoTexture(id);
  if (!tex) return null;
  return (
    <group position={position} rotation={rotation}>
      <mesh position={[0, 0, -0.03]}>
        <boxGeometry args={[size + 0.16, size + 0.16, 0.05]} />
        <meshStandardMaterial color="#0d1b5e" />
      </mesh>
      <mesh>
        <planeGeometry args={[size, size]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>
      <mesh position={[0, 0, 0.005]}>
        <planeGeometry args={[size * 0.92, size * 0.92]} />
        <meshBasicMaterial map={tex} transparent toneMapped={false} />
      </mesh>
    </group>
  );
}

/** Street sign on a post in front of a city building, angled toward the map camera. */
export function LogoSignpost({ id, position }: { id: string; position: [number, number, number] }) {
  return (
    <group position={position} rotation={[0, 0.63, 0]}>
      <mesh position={[0, 0.7, -0.05]} castShadow>
        <cylinderGeometry args={[0.07, 0.07, 1.4, 8]} />
        <meshStandardMaterial color="#0d1b5e" />
      </mesh>
      <LogoPlaque id={id} size={1.3} position={[0, 1.9, 0]} />
    </group>
  );
}
