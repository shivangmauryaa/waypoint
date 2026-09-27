import { useGLTF, Trail } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { Suspense, useMemo, useRef } from "react";
import * as THREE from "three";

import { ProceduralAircraft } from "./ProceduralAircraft";
import { COLORS, PHASE_START, routeCurve, travelParam } from "./sceneConfig";
import { useAssetAvailable } from "./useAssetAvailable";

/** Optional high-fidelity model. Faces +Z in its own local space. */
export const AIRCRAFT_MODEL_URL = "/models/aircraft.glb";

function GltfAircraft({ url }: { url: string }) {
  const { scene } = useGLTF(url);

  const prepared = useMemo(() => {
    const cloned = scene.clone(true);
    const box = new THREE.Box3().setFromObject(cloned);
    const size = new THREE.Vector3();
    box.getSize(size);
    const maxDim = Math.max(size.x, size.y, size.z) || 1;
    const scale = 2.4 / maxDim;
    const center = box.getCenter(new THREE.Vector3());
    cloned.scale.setScalar(scale);
    cloned.position.copy(center.multiplyScalar(-scale));
    cloned.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        child.castShadow = false;
        child.receiveShadow = false;
      }
    });
    return cloned;
  }, [scene]);

  return <primitive object={prepared} />;
}

interface Props {
  progressRef: React.MutableRefObject<number>;
  detailed?: boolean;
  reducedMotion?: boolean;
}

export function Aircraft({ progressRef, detailed = true, reducedMotion = false }: Props) {
  const group = useRef<THREE.Group>(null);
  const inner = useRef<THREE.Group>(null);
  const status = useAssetAvailable(AIRCRAFT_MODEL_URL);

  const scratch = useMemo(
    () => ({
      point: new THREE.Vector3(),
      tangent: new THREE.Vector3(),
      look: new THREE.Vector3(),
      ahead: new THREE.Vector3(),
      behind: new THREE.Vector3(),
    }),
    []
  );

  useFrame((state, delta) => {
    const outer = group.current;
    if (!outer) return;

    const progress = progressRef.current;
    const t = travelParam(progress);

    routeCurve.getPoint(t, scratch.point);
    routeCurve.getTangent(t, scratch.tangent);

    if (!reducedMotion) {
      scratch.point.y += Math.sin(state.clock.elapsedTime * 1.5) * 0.05;
    }

    // Hold pattern: while the disruption stalls the flight, the aircraft
    // orbits its hold point and banks gently — continuous motion, no dead air.
    if (
      !reducedMotion &&
      progress > PHASE_START.disruption &&
      progress < PHASE_START.recovery
    ) {
      const decay = Math.max(
        0,
        1 - (progress - PHASE_START.disruption) / 0.24
      );
      // Turbulence shake decays as the engine takes over.
      scratch.point.x += Math.sin(state.clock.elapsedTime * 21) * 0.05 * decay;
      scratch.point.y += Math.cos(state.clock.elapsedTime * 17) * 0.03 * decay;

      // Slow orbit around the break point, strongest mid-hold.
      const hold = Math.min(
        1,
        (progress - PHASE_START.disruption) / 0.08
      ) * Math.min(
        1,
        (PHASE_START.recovery - progress) / 0.06
      );
      const orbit = Math.sin(state.clock.elapsedTime * 0.55) * 0.85 * hold;
      const lift = Math.cos(state.clock.elapsedTime * 0.55) * 0.3 * hold;
      scratch.point.x += orbit;
      scratch.point.z += lift * 0.4;
      scratch.point.y += Math.abs(lift) * 0.25;
    }

    outer.position.copy(scratch.point);
    scratch.look.copy(scratch.point).add(scratch.tangent);
    outer.lookAt(scratch.look);

    // Bank into turns.
    if (inner.current && !reducedMotion) {
      routeCurve.getTangent(Math.min(1, t + 0.03), scratch.ahead);
      routeCurve.getTangent(Math.max(0, t - 0.03), scratch.behind);
      const targetRoll = -(scratch.ahead.x - scratch.behind.x) * 2.4;
      inner.current.rotation.z = THREE.MathUtils.damp(
        inner.current.rotation.z,
        targetRoll,
        4,
        delta
      );
    }
  });

  return (
    <Trail
      width={1.5}
      length={6.5}
      decay={1.3}
      color={COLORS.cyan}
      attenuation={(width) => width * width}
    >
      <group ref={group}>
        <group ref={inner} scale={0.95}>
          {status === "available" ? (
            <Suspense fallback={<ProceduralAircraft detailed={detailed} />}>
              <GltfAircraft url={AIRCRAFT_MODEL_URL} />
            </Suspense>
          ) : (
            <ProceduralAircraft detailed={detailed} />
          )}
        </group>
      </group>
    </Trail>
  );
}
