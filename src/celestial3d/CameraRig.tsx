import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";

import { CAMERA_KEYS } from "./sceneConfig";

interface Props {
  progressRef: React.MutableRefObject<number>;
  reducedMotion?: boolean;
  /** Pull the camera back on narrow viewports so the framing still reads. */
  compact?: boolean;
}

function smoothstep(value: number): number {
  return value * value * (3 - 2 * value);
}

export function CameraRig({
  progressRef,
  reducedMotion = false,
  compact = false,
}: Props) {
  const { camera } = useThree();
  const pointer = useRef({ x: 0, y: 0 });

  const scratch = useMemo(
    () => ({
      position: new THREE.Vector3(),
      look: new THREE.Vector3(),
      from: new THREE.Vector3(),
      to: new THREE.Vector3(),
      lookFrom: new THREE.Vector3(),
      lookTo: new THREE.Vector3(),
    }),
    []
  );

  useEffect(() => {
    if (reducedMotion) return;
    const onMove = (event: PointerEvent) => {
      pointer.current.x = (event.clientX / window.innerWidth) * 2 - 1;
      pointer.current.y = (event.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, [reducedMotion]);

  useFrame((_, delta) => {
    const progress = progressRef.current;

    let index = 0;
    while (index < CAMERA_KEYS.length - 1 && progress > CAMERA_KEYS[index + 1].at) {
      index += 1;
    }
    const current = CAMERA_KEYS[index];
    const next = CAMERA_KEYS[Math.min(CAMERA_KEYS.length - 1, index + 1)];
    const span = next.at - current.at || 1;
    const local = smoothstep(THREE.MathUtils.clamp((progress - current.at) / span, 0, 1));

    scratch.from.set(...current.position);
    scratch.to.set(...next.position);
    scratch.position.lerpVectors(scratch.from, scratch.to, local);

    scratch.lookFrom.set(...current.look);
    scratch.lookTo.set(...next.look);
    scratch.look.lerpVectors(scratch.lookFrom, scratch.lookTo, local);

    if (!reducedMotion) {
      scratch.position.x += pointer.current.x * 0.55;
      scratch.position.y += -pointer.current.y * 0.4;
    }

    if (compact) {
      // Narrow viewports crop the horizontal field of view; back off instead.
      scratch.position.sub(scratch.look).multiplyScalar(1.34).add(scratch.look);
    }

    const damping = 1 - Math.exp(-3.4 * delta);
    camera.position.lerp(scratch.position, damping);
    camera.lookAt(scratch.look);
  });

  return null;
}
