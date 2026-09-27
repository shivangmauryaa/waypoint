import { Grid } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";

import {
  CitySkyline,
  DetailedAirport,
  HighwaySystem,
  MountainRange,
  RailInfrastructure,
} from "./EnvironmentLayers";
import { COLORS } from "./sceneConfig";

interface Props {
  /** Reduced detail for phones / low-power devices. */
  compact?: boolean;
  reducedMotion?: boolean;
  /** Shared 0..1 narrative progress, used for scroll parallax & dynamic dissolve. */
  parallaxRef?: React.MutableRefObject<number>;
}

interface Puff {
  position: [number, number, number];
  scale: number;
}

function buildClusters(count: number, height: [number, number]): Puff[][] {
  const list: Puff[][] = [];
  for (let i = 0; i < count; i += 1) {
    const angle = (i / count) * Math.PI * 2 + Math.random() * 0.5;
    const radius = 18 + Math.random() * 20;
    const baseX = Math.cos(angle) * radius;
    const baseZ = Math.sin(angle) * radius;
    const baseY = height[0] + Math.random() * (height[1] - height[0]);
    const blobs = 3 + Math.floor(Math.random() * 3);
    const puffs: Puff[] = [];
    for (let b = 0; b < blobs; b += 1) {
      puffs.push({
        position: [
          baseX + (Math.random() - 0.5) * 4.2,
          baseY + (Math.random() - 0.5) * 1.2,
          baseZ + (Math.random() - 0.5) * 4.2,
        ],
        scale: 1.5 + Math.random() * 2.2,
      });
    }
    list.push(puffs);
  }
  return list;
}

/**
 * Soft white clouds in two parallax layers. The far ring slowly rotates; the
 * near layer drifts continuously and follows narrative progress.
 */
function Clouds({
  compact,
  reducedMotion,
  parallaxRef,
}: {
  compact: boolean;
  reducedMotion: boolean;
  parallaxRef?: React.MutableRefObject<number>;
}) {
  const far = useRef<THREE.Group>(null);
  const near = useRef<THREE.Group>(null);

  const farClusters = useMemo(
    () => buildClusters(compact ? 4 : 8, [11, 16]),
    [compact]
  );
  const nearClusters = useMemo(
    () => buildClusters(compact ? 3 : 6, [7.5, 11]),
    [compact]
  );

  useFrame(({ clock }, delta) => {
    if (far.current && !reducedMotion) {
      far.current.rotation.y += delta * 0.006;
    }
    if (near.current && !reducedMotion) {
      near.current.position.x = Math.sin(clock.elapsedTime * 0.04) * 2.2;
      if (parallaxRef) {
        near.current.position.z = parallaxRef.current * 5.5;
        near.current.position.y = 0.5 + parallaxRef.current * 2.0;
      }
    }
  });

  const renderClusters = (clusters: Puff[][]) =>
    clusters.map((puffs, index) => (
      <group key={index}>
        {puffs.map((puff, i) => (
          <mesh key={i} position={puff.position} scale={puff.scale}>
            <sphereGeometry args={[1, 14, 12]} />
            <meshBasicMaterial
              color={COLORS.cloud}
              transparent
              opacity={0.55}
              depthWrite={false}
              toneMapped={false}
            />
          </mesh>
        ))}
      </group>
    ));

  return (
    <>
      <group ref={far}>{renderClusters(farClusters)}</group>
      <group ref={near}>{renderClusters(nearClusters)}</group>
    </>
  );
}

export function Environment({ compact = false, reducedMotion = false, parallaxRef }: Props) {
  const dust = useRef<THREE.Points>(null);
  const grid = useRef<THREE.Group>(null);
  const bgRef = useRef<THREE.Color>(new THREE.Color(COLORS.background));
  const fogRef = useRef<THREE.Fog>(new THREE.Fog(COLORS.fog, 28, 85));

  const lightBgColor = useMemo(() => new THREE.Color(COLORS.background), []);
  const darkBgColor = useMemo(() => new THREE.Color("#0F172A"), []);

  const dustGeometry = useMemo(() => {
    const count = compact ? 220 : 640;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i += 1) {
      positions[i * 3] = (Math.random() - 0.5) * 36;
      positions[i * 3 + 1] = Math.random() * 12 + 0.4;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 36;
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    return geometry;
  }, [compact]);

  useFrame(({ clock }, delta) => {
    const progress = parallaxRef?.current ?? 0;

    // Dissolve background color & fog density as scroll moves from Hero into Section 2
    const transitionLocal = THREE.MathUtils.clamp((progress - 0.15) / 0.45, 0, 1);
    bgRef.current.lerpColors(lightBgColor, darkBgColor, transitionLocal * 0.35);
    
    if (fogRef.current) {
      fogRef.current.color.copy(bgRef.current);
      fogRef.current.near = THREE.MathUtils.lerp(28, 20, transitionLocal);
      fogRef.current.far = THREE.MathUtils.lerp(85, 65, transitionLocal);
    }

    if (dust.current && !reducedMotion) {
      dust.current.rotation.y += delta * 0.01;
      dust.current.position.z = Math.sin(clock.elapsedTime * 0.04) * 1.0 + progress * 3.0;
    }
  });

  return (
    <>
      {/* Dissolving background & fog */}
      <color attach="background" ref={bgRef} args={[COLORS.background]} />
      <fog attach="fog" ref={fogRef} args={[COLORS.fog, 28, 85]} />

      {/* Cinematic lighting setup */}
      <hemisphereLight args={["#ffffff", "#c9d7e6", 1.1]} />
      <ambientLight intensity={0.6} />
      <directionalLight position={[12, 22, 12]} intensity={1.75} color="#fffaf0" castShadow />
      <directionalLight position={[-14, 12, -9]} intensity={0.55} color="#cfe3f7" />

      {/* Layer 1: Sky & Far Background Mountains & Skyline */}
      <Clouds
        compact={compact}
        reducedMotion={reducedMotion}
        parallaxRef={parallaxRef}
      />
      <MountainRange />
      <CitySkyline compact={compact} />

      {/* Layer 2: Midground Airport, Railway & Highway Infrastructure */}
      <DetailedAirport compact={compact} />
      <RailInfrastructure />
      <HighwaySystem compact={compact} />

      {/* Layer 3: Ground Plane & Technical Grid */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.03, 0]}>
        <planeGeometry args={[220, 220]} />
        <meshStandardMaterial color={COLORS.ground} roughness={0.9} metalness={0.05} />
      </mesh>

      {!compact && (
        <group ref={grid}>
          <Grid
            position={[0, 0, 0]}
            args={[180, 180]}
            cellSize={1.5}
            cellThickness={0.5}
            cellColor="#c9d6e4"
            sectionSize={7.5}
            sectionThickness={0.85}
            sectionColor="#a9bcd2"
            fadeDistance={75}
            fadeStrength={1.4}
            infiniteGrid
          />
        </group>
      )}

      {/* Layer 4: Ambient Dust Particles */}
      <points ref={dust} geometry={dustGeometry}>
        <pointsMaterial
          size={compact ? 0.05 : 0.045}
          color="#9cc4e8"
          transparent
          opacity={0.45}
          sizeAttenuation
          depthWrite={false}
          toneMapped={false}
        />
      </points>
    </>
  );
}
