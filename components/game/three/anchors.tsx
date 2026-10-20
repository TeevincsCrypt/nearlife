"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { useFrame } from "@react-three/fiber";
import { Vector3, type Object3D } from "three";

/**
 * Screen-space labels for 3D objects without drei <Html> (which creates a React root per label
 * and races when labels mount/unmount quickly). 3D side: <Anchor id> marks a point in the scene.
 * DOM side: <AnchoredLabel id> is a normal element in the overlay. <Projector> moves each label
 * to its anchor every frame by writing style.transform directly.
 */
const anchors = new Map<string, { obj: Object3D; offsetY: number; scaleRef?: number }>();
const labels = new Map<string, HTMLElement>();

export function Anchor({ id, offsetY = 0, scaleRef }: { id: string; offsetY?: number; scaleRef?: number }) {
  const ref = useRef<Object3D>(null);
  useEffect(() => {
    const obj = ref.current;
    if (!obj) return;
    anchors.set(id, { obj, offsetY, scaleRef });
    return () => {
      if (anchors.get(id)?.obj === obj) anchors.delete(id);
      const el = labels.get(id);
      if (el) el.style.visibility = "hidden";
    };
  }, [id, offsetY, scaleRef]);
  return <object3D ref={ref} />;
}

function visibleInScene(o: Object3D | null) {
  for (let cur = o; cur; cur = cur.parent) if (!cur.visible) return false;
  return true;
}

const v = new Vector3();
const camPos = new Vector3();

export function Projector() {
  useFrame(({ camera, size }) => {
    camera.getWorldPosition(camPos);
    for (const [id, el] of labels) {
      const a = anchors.get(id);
      if (!a || !visibleInScene(a.obj)) {
        el.style.visibility = "hidden";
        continue;
      }
      a.obj.getWorldPosition(v);
      v.y += a.offsetY;
      const dist = v.distanceTo(camPos);
      v.project(camera);
      if (v.z > 1 || v.x < -1.3 || v.x > 1.3 || v.y < -1.3 || v.y > 1.3) {
        el.style.visibility = "hidden";
        continue;
      }
      const x = ((v.x + 1) / 2) * size.width;
      const y = ((1 - v.y) / 2) * size.height;
      const scale = a.scaleRef ? Math.max(0.5, Math.min(1.1, a.scaleRef / dist)) : 1;
      el.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -100%) scale(${scale})`;
      el.style.zIndex = String(Math.round(1000 - dist * 5));
      el.style.visibility = "visible";
    }
  });
  return null;
}

export function AnchoredLabel({ id, children, className }: { id: string; children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    labels.set(id, el);
    return () => {
      if (labels.get(id) === el) labels.delete(id);
    };
  }, [id]);
  return (
    <div ref={ref} className={className} style={{ position: "absolute", left: 0, top: 0, visibility: "hidden", transformOrigin: "50% 100%", willChange: "transform" }}>
      {children}
    </div>
  );
}
