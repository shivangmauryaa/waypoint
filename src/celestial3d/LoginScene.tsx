import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Line } from "@react-three/drei";
import { Suspense, useEffect, useMemo, useRef } from "react";
import * as THREE from "three";

import { ProceduralAircraft } from "./ProceduralAircraft";
import { Environment } from "./Environment";
import type { LoginRefs } from "./sceneConfig";
import { BREAK_T, MUMBAI, DELHI, routeCurve, samplePoints, travelParam } from "./sceneConfig";

interface Props {
  login: LoginRefs;
  reducedMotion: boolean;
  compact: boolean;
}

/**
 * Aircraft for the login view. It taxis forward along the route as the
 * traveller completes the form (progress 0..1 maps up to the break point),
 * holds with a gentle idle bob, then climbs away during takeoff.
 */
function LoginAircraft({ progressRef, takeoffRef, detailed }: LoginRefs & { detailed: boolean }) {
  const group = useRef<THREE.Group>(null);
  const inner = useRef<THREE.Group>(null);

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

    const t = travelParam(progressRef.current);
    routeCurve.getPoint(t, scratch.point);
    routeCurve.getTangent(t, scratch.tangent);

    // Takeoff: accelerate down the runway and climb out of frame.
    if (takeoffRef.current.active) {
      const elapsed = state.clock.elapsedTime - takeoffRef.current.start;
      const speed = elapsed * 0.11;
      const t2 = Math.min(1, t + speed);
      routeCurve.getPoint(t2, scratch.point);
      routeCurve.getTangent(t2, scratch.tangent);
      scratch.point.y += speed * speed * 5.2;
    }

    if (!takeoffRef.current.active) {
      scratch.point.y += Math.sin(state.clock.elapsedTime * 1.2) * 0.04;
    }

    outer.position.copy(scratch.point);
    scratch.look.copy(scratch.point).add(scratch.tangent);
    outer.lookAt(scratch.look);

    if (inner.current) {
      const targetRoll = takeoffRef.current.active
        ? -0.18
        : Math.sin(state.clock.elapsedTime * 0.7) * 0.035;
      inner.current.rotation.z = THREE.MathUtils.damp(
        inner.current.rotation.z,
        targetRoll,
        3,
        delta
      );
    }
  });

  return (
    <group ref={group}>
      <group ref={inner} scale={0.95}>
        <ProceduralAircraft detailed={detailed} />
      </group>
    </group>
  );
}

/** Camera that slowly orbits the parked aircraft and pulls back on takeoff. */
function LoginCamera({
  takeoffRef,
  compact,
  reducedMotion,
}: {
  takeoffRef: LoginRefs["takeoffRef"];
  compact: boolean;
  reducedMotion: boolean;
}) {
  const { camera } = useThree();
  const pointer = useRef({ x: 0, y: 0 });

  const scratch = useMemo(
    () => ({ position: new THREE.Vector3(), look: new THREE.Vector3() }),
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

  useFrame(({ clock }, delta) => {
    const time = clock.elapsedTime;
    const takeoff = takeoffRef.current.active
      ? THREE.MathUtils.clamp((performance.now() - takeoffRef.current.start) / 1500, 0, 1)
      : 0;

    const orbit = (compact ? 17.5 : 13.6) - takeoff * 3.4;
    const angle = 0.32 + Math.sin(time * 0.1) * 0.045 + pointer.current.x * 0.06;

    scratch.position.set(
      Math.sin(angle) * orbit + pointer.current.x * 0.7,
      4.4 - pointer.current.y * 0.5 + takeoff * 2.4,
      Math.cos(angle) * orbit
    );
    scratch.look.set(0, 2.1 + takeoff * 1.4, 0);

    const damping = 1 - Math.exp(-2.6 * delta);
    camera.position.lerp(scratch.position, damping);
    camera.lookAt(scratch.look);
  });

  return null;
}

/** Route glow that fills up to the aircraft as form progress advances. */
function ProgressGlow({ progressRef }: { progressRef: LoginRefs["progressRef"] }) {
  const geometry = useMemo(
    () => new THREE.TubeGeometry(routeCurve, 220, 0.02, 8, false),
    []
  );

  useFrame(() => {
    const t = Math.min(1, travelParam(progressRef.current));
    if (geometry.index) {
      geometry.setDrawRange(0, Math.floor(geometry.index.count * t));
    }
  });

  return (
    <mesh geometry={geometry}>
      <meshBasicMaterial color="#2563eb" toneMapped={false} />
    </mesh>
  );
}

/** Small pulsing ring marker for a route endpoint. */
function Endpoint({ position }: { position: THREE.Vector3 }) {
  const ring = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (!ring.current) return;
    ring.current.scale.setScalar(0.85 + Math.sin(clock.elapsedTime * 1.6) * 0.15);
  });

  return (
    <group position={position}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <ringGeometry args={[0.26, 0.3, 44]} />
        <meshBasicMaterial color="#2563eb" transparent opacity={0.9} toneMapped={false} />
      </mesh>
      <mesh ref={ring} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <ringGeometry args={[0.12, 0.15, 40]} />
        <meshBasicMaterial color="#0ea5e9" transparent opacity={0.7} toneMapped={false} />
      </mesh>
    </group>
  );
}

export function LoginScene({ login, reducedMotion, compact }: Props) {
  const routePoints = useMemo(() => samplePoints(routeCurve, 110), []);

  return (
    <div className="canvas-layer canvas-layer--login" aria-hidden="true">
      <Canvas
        dpr={[1, compact ? 1.3 : 1.75]}
        frameloop="always"
        camera={{ position: [4.2, 4.4, 12.8], fov: 42, near: 0.1, far: 160 }}
        gl={{ antialias: true, powerPreference: "high-performance" }}
        onCreated={({ gl }) => {
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = 1.12;
        }}
      >
        <Suspense fallback={null}>
          <Environment compact={compact} reducedMotion={reducedMotion} />

          {/* full route preview — the journey the traveller is boarding */}
          <Line
            points={routePoints}
            color="#2563eb"
            lineWidth={1.2}
            dashed
            dashSize={0.18}
            gapSize={0.14}
            transparent
            opacity={0.4}
            toneMapped={false}
          />
          <ProgressGlow progressRef={login.progressRef} />

          {/* break marker sits ahead as a subtle waypoint */}
          <mesh
            position={routeCurve.getPoint(BREAK_T)}
            rotation={[-Math.PI / 2, 0, 0]}
          >
            <ringGeometry args={[0.2, 0.24, 40]} />
            <meshBasicMaterial color="#dc2626" transparent opacity={0.5} toneMapped={false} />
          </mesh>

          <Endpoint position={MUMBAI} />
          <Endpoint position={DELHI} />

          <LoginAircraft
            progressRef={login.progressRef}
            takeoffRef={login.takeoffRef}
            detailed={!compact}
          />
          <LoginCamera
            takeoffRef={login.takeoffRef}
            compact={compact}
            reducedMotion={reducedMotion}
          />
        </Suspense>
      </Canvas>
    </div>
  );
}
