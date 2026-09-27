import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { BREAK_POINT, COLORS, routeCurve } from "./sceneConfig";

interface Props {
  progressRef: React.MutableRefObject<number>;
  reducedMotion?: boolean;
}

/**
 * SpatialCorridor
 *
 * Implements the 3D Transportation Corridor transition inside the Three.js scene.
 * As the user scrolls from Section 1 (Hero) into Section 2 (How It Works),
 * the blue flight path expands into a 3D spatial corridor with illuminated waypoint rings,
 * particle streams, and glowing navigation lines through which the camera flies.
 */
export function SpatialCorridor({ progressRef, reducedMotion = false }: Props) {
  const groupRef = useRef<THREE.Group>(null);
  const ringsGroupRef = useRef<THREE.Group>(null);
  const particlesRef = useRef<THREE.Points>(null);

  // Generate 8 3D spatial waypoint arches along the flight-to-rail transition path
  const { rings, particlesGeometry } = useMemo(() => {
    const ringList: Array<{ position: THREE.Vector3; scale: number; rotation: [number, number, number] }> = [];
    const count = 10;

    for (let i = 0; i < count; i++) {
      const t = 0.35 + (i / count) * 0.55;
      const point = routeCurve.getPoint(t);
      const tangent = routeCurve.getTangent(t);
      
      // Calculate rotation to face along the tangent
      const euler = new THREE.Euler();
      const matrix = new THREE.Matrix4();
      const up = new THREE.Vector3(0, 1, 0);
      matrix.lookAt(point, point.clone().add(tangent), up);
      euler.setFromRotationMatrix(matrix);

      ringList.push({
        position: point,
        scale: 0.6 + Math.sin(i * 0.8) * 0.2,
        rotation: [euler.x, euler.y, euler.z],
      });
    }

    // High performance particle geometry for flying corridor particles
    const particleCount = 140;
    const pArray = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      const t = Math.random();
      const pt = routeCurve.getPoint(t);
      pArray[i * 3] = pt.x + (Math.random() - 0.5) * 1.8;
      pArray[i * 3 + 1] = pt.y + (Math.random() - 0.5) * 1.8;
      pArray[i * 3 + 2] = pt.z + (Math.random() - 0.5) * 1.8;
    }
    const pGeom = new THREE.BufferGeometry();
    pGeom.setAttribute("position", new THREE.BufferAttribute(pArray, 3));

    return { rings: ringList, particlesGeometry: pGeom };
  }, []);

  useFrame(({ clock }) => {
    const progress = progressRef.current;

    // The spatial corridor activates during camera transition (scroll progress 0.35 - 0.90)
    const corridorIntensity = THREE.MathUtils.clamp(
      (progress - 0.30) / 0.45,
      0,
      1
    ) * (1 - THREE.MathUtils.clamp((progress - 0.88) / 0.12, 0, 1));

    if (groupRef.current) {
      groupRef.current.visible = corridorIntensity > 0.01;
    }

    if (ringsGroupRef.current) {
      ringsGroupRef.current.children.forEach((child, idx) => {
        const ringMesh = child as THREE.Mesh;
        const mat = ringMesh.material as THREE.MeshBasicMaterial;
        if (mat) {
          const pulse = 0.6 + Math.sin(clock.elapsedTime * 2.4 + idx * 0.5) * 0.4;
          mat.opacity = corridorIntensity * 0.85 * pulse;
        }
      });
    }

    if (particlesRef.current && !reducedMotion) {
      const mat = particlesRef.current.material as THREE.PointsMaterial;
      if (mat) {
        mat.opacity = corridorIntensity * 0.75;
      }
      // Fly particles along camera trajectory
      particlesRef.current.rotation.y = clock.elapsedTime * 0.05;
    }
  });

  return (
    <group ref={groupRef}>
      {/* Waypoint Arch Rings along the 3D Corridor */}
      <group ref={ringsGroupRef}>
        {rings.map((ring, i) => (
          <mesh
            key={i}
            position={ring.position}
            rotation={ring.rotation}
            scale={[ring.scale, ring.scale, ring.scale]}
          >
            <torusGeometry args={[0.7, 0.02, 16, 48]} />
            <meshBasicMaterial
              color={i % 2 === 0 ? COLORS.blue : COLORS.cyan}
              transparent
              opacity={0}
              toneMapped={false}
            />
          </mesh>
        ))}
      </group>

      {/* Atmospheric Spatial Speed Particles */}
      <points ref={particlesRef} geometry={particlesGeometry}>
        <pointsMaterial
          color={COLORS.cyan}
          size={0.09}
          transparent
          opacity={0}
          toneMapped={false}
          depthWrite={false}
        />
      </points>

      {/* Corridor Guidance Node Marker at Disruption Break Point */}
      <group position={BREAK_POINT}>
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.8, 0.84, 48]} />
          <meshBasicMaterial
            color={COLORS.cyan}
            transparent
            opacity={0.35}
            toneMapped={false}
          />
        </mesh>
      </group>
    </group>
  );
}

export default SpatialCorridor;
