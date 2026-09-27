import { Line } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";

import {
  BREAK_POINT,
  BREAK_T,
  COLORS,
  DELHI,
  MUMBAI,
  PHASE_START,
  altAirCurves,
  routeCurve,
  samplePoints,
  trainCurve,
  travelParam,
} from "./sceneConfig";

interface RouteProps {
  progressRef: React.MutableRefObject<number>;
  reducedMotion?: boolean;
}

function Endpoint({ position, ping = false }: { position: THREE.Vector3; ping?: boolean }) {
  const ring = useRef<THREE.Mesh>(null);
  const pingRing = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (ring.current) {
      const pulse = 0.85 + Math.sin(clock.elapsedTime * 1.6) * 0.15;
      ring.current.scale.setScalar(pulse);
    }
    if (pingRing.current) {
      // Radar ping: an expanding ring that fades out and repeats.
      const cycle = (clock.elapsedTime % 2.6) / 2.6;
      const scale = 1 + cycle * 3.2;
      pingRing.current.scale.setScalar(scale);
      pingRing.current.visible = cycle < 0.85;
      const material = pingRing.current.material as THREE.MeshBasicMaterial;
      material.opacity = 0.55 * (1 - cycle);
    }
  });

  return (
    <group position={position}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <circleGeometry args={[0.55, 40]} />
        <meshBasicMaterial
          color={COLORS.cyan}
          transparent
          opacity={0.16}
          toneMapped={false}
        />
      </mesh>
      <mesh ref={ring} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <ringGeometry args={[0.26, 0.3, 44]} />
        <meshBasicMaterial
          color={COLORS.blue}
          transparent
          opacity={0.9}
          toneMapped={false}
        />
      </mesh>
      {ping && (
        <mesh ref={pingRing} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
          <ringGeometry args={[0.3, 0.34, 48]} />
          <meshBasicMaterial
            color={COLORS.cyan}
            transparent
            opacity={0.4}
            toneMapped={false}
            depthWrite={false}
          />
        </mesh>
      )}
      <mesh position={[0, 0.32, 0]}>
        <cylinderGeometry args={[0.022, 0.022, 0.64, 10]} />
        <meshBasicMaterial
          color={COLORS.blue}
          transparent
          opacity={0.4}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}

export function Route({ progressRef, reducedMotion = false }: RouteProps) {
  const glowTube = useRef<THREE.Mesh>(null);
  const breakMarker = useRef<THREE.Group>(null);
  const branchRefs = useRef<Array<THREE.Mesh | null>>([null, null]);
  const railRef = useRef<THREE.Mesh>(null);

  const mainPoints = useMemo(() => samplePoints(routeCurve, 110), []);
  const railPoints = useMemo(() => samplePoints(trainCurve, 90), []);

  const mainGeometry = useMemo(
    () => new THREE.TubeGeometry(routeCurve, 260, 0.021, 8, false),
    []
  );
  const railGeometry = useMemo(
    () => new THREE.TubeGeometry(trainCurve, 200, 0.016, 6, false),
    []
  );
  const branchGeometry = useMemo(
    () =>
      altAirCurves.map(
        (curve) => new THREE.TubeGeometry(curve, 160, 0.011, 6, false)
      ),
    []
  );

  useFrame(({ clock }) => {
    const progress = progressRef.current;
    const t = travelParam(progress);

    // Travelled portion of the main route glows up to the aircraft.
    const main = glowTube.current?.geometry;
    if (main?.index) {
      main.setDrawRange(0, Math.floor(main.index.count * t));
    }

    // Recovery branches draw themselves in.
    const recoveryLocal = THREE.MathUtils.clamp(
      (progress - PHASE_START.recovery) / 0.22,
      0,
      1
    );
    branchRefs.current.forEach((mesh, index) => {
      const geometry = mesh?.geometry;
      if (!geometry?.index) return;
      const local = THREE.MathUtils.clamp(
        recoveryLocal * (1.25 - index * 0.25),
        0,
        1
      );
      geometry.setDrawRange(0, Math.floor(geometry.index.count * local));
    });

    // Rail route reveals as the train arrives.
    const railLocal = THREE.MathUtils.clamp(
      (progress - (PHASE_START.recovery - 0.04)) / 0.3,
      0,
      1
    );
    const rail = railRef.current?.geometry;
    if (rail?.index) {
      rail.setDrawRange(0, Math.floor(rail.index.count * railLocal));
    }

    // Disruption marker pulse.
    const marker = breakMarker.current;
    if (marker) {
      const show =
        progress > PHASE_START.disruption - 0.04 &&
        progress < PHASE_START.recovery - 0.02;
      marker.visible = show;
      if (show && !reducedMotion) {
        marker.scale.setScalar(1 + Math.sin(clock.elapsedTime * 3.4) * 0.12);
      }
      marker.children.forEach((child) => {
        const mesh = child as THREE.Mesh;
        const material = mesh.material as THREE.Material & { opacity?: number };
        if (material && "opacity" in material) {
          material.transparent = true;
          material.opacity = show ? 0.9 : 0;
        }
      });
    }
  });

  return (
    <group>
      {/* faint guide line for the whole flight path */}
      <Line
        points={mainPoints}
        color={COLORS.cyan}
        lineWidth={1}
        dashed
        dashSize={0.16}
        gapSize={0.12}
        transparent
        opacity={0.3}
        toneMapped={false}
      />

      {/* rail guide */}
      <Line
        points={railPoints}
        color={COLORS.amber}
        lineWidth={1}
        dashed
        dashSize={0.14}
        gapSize={0.14}
        transparent
        opacity={0.22}
        toneMapped={false}
      />

      {/* travelled glow on the main route */}
      <mesh ref={glowTube} geometry={mainGeometry}>
        <meshBasicMaterial color={COLORS.cyan} toneMapped={false} />
      </mesh>

      {/* rail route that lights up during recovery */}
      <mesh ref={railRef} geometry={railGeometry}>
        <meshBasicMaterial
          color={COLORS.amber}
          transparent
          opacity={0.8}
          toneMapped={false}
        />
      </mesh>

      {/* alternative air arcs shown during recovery */}
      {branchGeometry.map((geometry, index) => (
        <mesh
          key={index}
          geometry={geometry}
          ref={(node) => {
            branchRefs.current[index] = node;
          }}
        >
          <meshBasicMaterial
            color={COLORS.blue}
            transparent
            opacity={0.75}
            toneMapped={false}
          />
        </mesh>
      ))}

      {/* disruption marker at the break point */}
      <group ref={breakMarker} position={BREAK_POINT}>
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.3, 0.36, 40]} />
          <meshBasicMaterial
            color={COLORS.red}
            transparent
            opacity={0.9}
            toneMapped={false}
            side={THREE.DoubleSide}
          />
        </mesh>
        <mesh>
          <sphereGeometry args={[0.055, 14, 14]} />
          <meshBasicMaterial color={COLORS.red} toneMapped={false} />
        </mesh>
      </group>

      <Endpoint position={MUMBAI} />
      <Endpoint position={DELHI} ping />
    </group>
  );
}

export const BREAK_PROGRESS = BREAK_T;
