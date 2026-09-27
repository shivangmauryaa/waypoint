import { useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { Suspense, useMemo, useRef } from "react";
import * as THREE from "three";

import { ProceduralTrain } from "./ProceduralTrain";
import { PHASE_START, trainCurve } from "./sceneConfig";
import { useAssetAvailable } from "./useAssetAvailable";

export const TRAIN_MODEL_URL = "/models/train.glb";

function GltfTrain({ url }: { url: string }) {
  const { scene } = useGLTF(url);

  const prepared = useMemo(() => {
    const cloned = scene.clone(true);
    const box = new THREE.Box3().setFromObject(cloned);
    const size = new THREE.Vector3();
    box.getSize(size);
    const maxDim = Math.max(size.x, size.y, size.z) || 1;
    const scale = 4.2 / maxDim;
    const center = box.getCenter(new THREE.Vector3());
    cloned.scale.setScalar(scale);
    cloned.position.copy(center.multiplyScalar(-scale));
    return cloned;
  }, [scene]);

  return <primitive object={prepared} />;
}

interface Props {
  progressRef: React.MutableRefObject<number>;
  detailed?: boolean;
}

/** Reveal window for the rail recovery option. */
const REVEAL_START = PHASE_START.recovery - 0.05;

export function Train({ progressRef, detailed = true }: Props) {
  const group = useRef<THREE.Group>(null);
  const spin = useRef(0);
  const status = useAssetAvailable(TRAIN_MODEL_URL);

  const scratch = useMemo(
    () => ({
      point: new THREE.Vector3(),
      tangent: new THREE.Vector3(),
      look: new THREE.Vector3(),
    }),
    []
  );

  useFrame((state, delta) => {
    const outer = group.current;
    if (!outer) return;

    const progress = progressRef.current;
    const reveal = THREE.MathUtils.clamp(
      (progress - REVEAL_START) / 0.08,
      0,
      1
    );

    // Outside the reveal window the train is hidden outright.
    if (reveal <= 0) {
      spin.current = 0;
      outer.visible = false;
      return;
    }

    spin.current = THREE.MathUtils.damp(spin.current, reveal, 6, delta);
    outer.scale.setScalar(0.001 + spin.current * 0.85);

    if (spin.current <= 0.01) {
      outer.visible = false;
      return;
    }
    outer.visible = true;

    const local = THREE.MathUtils.clamp(
      (progress - REVEAL_START) / (1 - REVEAL_START),
      0,
      1
    );
    const t = THREE.MathUtils.lerp(0.08, 0.86, local);

    trainCurve.getPoint(t, scratch.point);
    trainCurve.getTangent(t, scratch.tangent);
    outer.position.copy(scratch.point);
    scratch.look.copy(scratch.point).add(scratch.tangent);
    outer.lookAt(scratch.look);

    // Subtle wheel chatter.
    outer.position.y += Math.sin(state.clock.elapsedTime * 12) * 0.006;
  });

  return (
    <group ref={group}>
      {status === "available" ? (
        <Suspense fallback={<ProceduralTrain detailed={detailed} />}>
          <GltfTrain url={TRAIN_MODEL_URL} />
        </Suspense>
      ) : (
        <ProceduralTrain detailed={detailed} />
      )}
    </group>
  );
}
