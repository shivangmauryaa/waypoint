import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";

import { COLORS } from "./sceneConfig";

interface Props {
  /** Fewer parts on small screens. */
  detailed?: boolean;
}

export function ProceduralAircraft({ detailed = true }: Props) {
  const beaconRef = useRef<THREE.Mesh>(null);
  const strobeRef = useRef<THREE.Mesh>(null);
  const engineGlowRef1 = useRef<THREE.Mesh>(null);
  const engineGlowRef2 = useRef<THREE.Mesh>(null);

  /** Fuselage profile: radius per station along body */
  const fuselagePoints = useMemo(
    () =>
      [
        [-1.15, 0.02],
        [-1.02, 0.08],
        [-0.7, 0.135],
        [-0.2, 0.165],
        [0.2, 0.17],
        [0.6, 0.155],
        [0.85, 0.12],
        [1.05, 0.065],
        [1.15, 0.015],
      ].map(([y, r]) => new THREE.Vector2(r, y)),
    []
  );

  const fuselageGeometry = useMemo(
    () => new THREE.LatheGeometry(fuselagePoints, 48),
    [fuselagePoints]
  );

  /** Swept aerodynamic wings with winglets */
  const wingGeometry = useMemo(() => {
    const shape = new THREE.Shape();
    shape.moveTo(0, 0.26);
    shape.lineTo(1.15, -0.18);
    shape.lineTo(1.15, -0.36);
    shape.lineTo(0, -0.22);
    shape.closePath();
    const geometry = new THREE.ExtrudeGeometry(shape, {
      depth: 0.05,
      bevelEnabled: true,
      bevelThickness: 0.015,
      bevelSize: 0.015,
      bevelSegments: 3,
    });
    geometry.rotateX(-Math.PI / 2);
    return geometry;
  }, []);

  /** Horizontal tailplane */
  const stabiliserGeometry = useMemo(() => {
    const shape = new THREE.Shape();
    shape.moveTo(0, 0.14);
    shape.lineTo(0.55, -0.12);
    shape.lineTo(0.55, -0.24);
    shape.lineTo(0, -0.14);
    shape.closePath();
    const geometry = new THREE.ExtrudeGeometry(shape, {
      depth: 0.04,
      bevelEnabled: true,
      bevelThickness: 0.01,
      bevelSize: 0.01,
      bevelSegments: 2,
    });
    geometry.rotateX(-Math.PI / 2);
    return geometry;
  }, []);

  /** Vertical tail fin */
  const finGeometry = useMemo(() => {
    const shape = new THREE.Shape();
    shape.moveTo(0, 0);
    shape.lineTo(0.38, 0);
    shape.lineTo(0.56, 0.52);
    shape.lineTo(0.32, 0.56);
    shape.lineTo(0.04, 0.12);
    shape.closePath();
    return new THREE.ExtrudeGeometry(shape, {
      depth: 0.045,
      bevelEnabled: true,
      bevelThickness: 0.012,
      bevelSize: 0.012,
      bevelSegments: 2,
    });
  }, []);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (beaconRef.current) {
      const mat = beaconRef.current.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = 1.4 + Math.sin(t * 6) * 1.0;
    }
    if (strobeRef.current) {
      const mat = strobeRef.current.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = t % 1.2 < 0.1 ? 4.5 : 0.2;
    }
    if (engineGlowRef1.current && engineGlowRef2.current) {
      const pulse = 1.8 + Math.sin(t * 14) * 0.4;
      (engineGlowRef1.current.material as THREE.MeshBasicMaterial).opacity = 0.75 + pulse * 0.1;
      (engineGlowRef2.current.material as THREE.MeshBasicMaterial).opacity = 0.75 + pulse * 0.1;
    }
  });

  const metallicHullMat = (
    <meshStandardMaterial
      color="#f8fafc"
      metalness={0.7}
      roughness={0.18}
      envMapIntensity={1.2}
    />
  );

  return (
    <group>
      {/* Sleek metallic fuselage */}
      <mesh geometry={fuselageGeometry} rotation={[Math.PI / 2, 0, 0]}>
        {metallicHullMat}
      </mesh>

      {/* Electric blue belly stripe & branding line */}
      <mesh position={[0, -0.14, 0.05]}>
        <boxGeometry args={[0.26, 0.035, 1.8]} />
        <meshStandardMaterial
          color={COLORS.blue}
          metalness={0.6}
          roughness={0.2}
          emissive={COLORS.blue}
          emissiveIntensity={0.25}
        />
      </mesh>

      {/* Glossy cockpit glass */}
      <mesh position={[0, 0.095, 0.78]} rotation={[0.12, 0, 0]}>
        <boxGeometry args={[0.22, 0.08, 0.18]} />
        <meshStandardMaterial
          color="#0f172a"
          metalness={0.9}
          roughness={0.05}
        />
      </mesh>

      {/* Cabin passenger window strip */}
      {[-0.4, -0.2, 0, 0.2, 0.4].map((z, idx) => (
        <group key={idx}>
          <mesh position={[0.155, 0.04, z]}>
            <boxGeometry args={[0.01, 0.035, 0.07]} />
            <meshStandardMaterial color="#38bdf8" emissive="#0ea5e9" emissiveIntensity={0.8} />
          </mesh>
          <mesh position={[-0.155, 0.04, z]}>
            <boxGeometry args={[0.01, 0.035, 0.07]} />
            <meshStandardMaterial color="#38bdf8" emissive="#0ea5e9" emissiveIntensity={0.8} />
          </mesh>
        </group>
      ))}

      {/* Main swept wings */}
      <mesh geometry={wingGeometry} position={[0.13, 0.005, -0.05]} rotation={[0, 0, 0.07]}>
        {metallicHullMat}
      </mesh>
      <mesh
        geometry={wingGeometry}
        position={[-0.13, 0.005, -0.05]}
        rotation={[0, Math.PI, -0.07]}
        scale={[-1, 1, 1]}
      >
        <meshStandardMaterial
          color="#f8fafc"
          metalness={0.7}
          roughness={0.18}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Electric cyan winglet tips */}
      <mesh position={[1.28, 0.12, -0.26]} rotation={[0, 0, 0.22]}>
        <boxGeometry args={[0.03, 0.25, 0.18]} />
        <meshStandardMaterial color={COLORS.cyan} metalness={0.5} roughness={0.2} emissive={COLORS.cyan} emissiveIntensity={0.3} />
      </mesh>
      <mesh position={[-1.28, 0.12, -0.26]} rotation={[0, 0, -0.22]}>
        <boxGeometry args={[0.03, 0.25, 0.18]} />
        <meshStandardMaterial color={COLORS.cyan} metalness={0.5} roughness={0.2} emissive={COLORS.cyan} emissiveIntensity={0.3} />
      </mesh>

      {/* High-power underwing turbofan engines */}
      {[-0.62, 0.62].map((x, idx) => (
        <group key={x} position={[x, -0.18, 0.02]}>
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.12, 0.11, 0.48, 24]} />
            <meshStandardMaterial color="#cbd5e1" metalness={0.8} roughness={0.15} />
          </mesh>
          <mesh position={[0, 0, 0.25]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.11, 0.02, 12, 28]} />
            <meshStandardMaterial color="#334155" metalness={0.9} roughness={0.1} />
          </mesh>
          {/* Glowing Engine Exhaust Core */}
          <mesh
            ref={idx === 0 ? engineGlowRef1 : engineGlowRef2}
            position={[0, 0, -0.26]}
            rotation={[Math.PI / 2, 0, 0]}
          >
            <cylinderGeometry args={[0.08, 0.01, 0.35, 16]} />
            <meshBasicMaterial color="#38bdf8" transparent opacity={0.85} toneMapped={false} />
          </mesh>
        </group>
      ))}

      {/* Horizontal tail stabiliser */}
      <mesh geometry={stabiliserGeometry} position={[0.03, 0.03, -0.92]}>
        {metallicHullMat}
      </mesh>
      <mesh
        geometry={stabiliserGeometry}
        position={[-0.03, 0.03, -0.92]}
        rotation={[0, Math.PI, 0]}
        scale={[-1, 1, 1]}
      >
        <meshStandardMaterial
          color="#f8fafc"
          metalness={0.7}
          roughness={0.18}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Vertical tail fin with electric blue accent */}
      <mesh
        geometry={finGeometry}
        position={[-0.02, 0.15, -1.06]}
        rotation={[0, -Math.PI / 2, 0]}
      >
        <meshStandardMaterial
          color={COLORS.blue}
          metalness={0.5}
          roughness={0.2}
          emissive={COLORS.blue}
          emissiveIntensity={0.2}
        />
      </mesh>

      {detailed && (
        <>
          {/* Navigation green/red lights */}
          <mesh position={[1.26, 0.03, -0.24]}>
            <sphereGeometry args={[0.035, 12, 12]} />
            <meshStandardMaterial color="#10b981" emissive="#10b981" emissiveIntensity={3} />
          </mesh>
          <mesh position={[-1.26, 0.03, -0.24]}>
            <sphereGeometry args={[0.035, 12, 12]} />
            <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={3} />
          </mesh>
          <mesh ref={beaconRef} position={[0, -0.19, 0.06]}>
            <sphereGeometry args={[0.038, 12, 12]} />
            <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={2} />
          </mesh>
          <mesh ref={strobeRef} position={[0, 0.58, -1.14]}>
            <sphereGeometry args={[0.032, 12, 12]} />
            <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={0.4} />
          </mesh>
        </>
      )}
    </group>
  );
}

