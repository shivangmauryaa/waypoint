import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { COLORS } from "./sceneConfig";

interface LayerProps {
  compact?: boolean;
}

/**
 * Far Background: Distant Mountain Silhouettes
 */
export function MountainRange() {
  const mesh = useMemo(() => {
    const geo = new THREE.PlaneGeometry(160, 24, 64, 1);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      if (y > -10) {
        // Displace top edge to form mountain peaks
        const n = Math.sin(x * 0.12) * 3.5 + Math.cos(x * 0.28) * 2.2 + Math.sin(x * 0.05) * 6.0;
        pos.setY(i, y + n);
      }
    }
    geo.computeVertexNormals();
    return geo;
  }, []);

  return (
    <group position={[0, 4, -65]}>
      <mesh geometry={mesh}>
        <meshStandardMaterial
          color="#b4cae4"
          roughness={0.95}
          metalness={0.05}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}

/**
 * Far Background: Distant City Skyline
 */
export function CitySkyline({ compact }: LayerProps) {
  const count = compact ? 18 : 36;
  const buildings = useMemo(() => {
    const list = [];
    for (let i = 0; i < count; i++) {
      const x = (i - count / 2) * 2.8 + (Math.random() - 0.5) * 1.5;
      const z = -45 + (Math.random() - 0.5) * 8;
      const h = 4 + Math.random() * 9;
      const w = 1.2 + Math.random() * 1.6;
      const d = 1.2 + Math.random() * 1.6;
      list.push({ position: [x, h / 2 - 0.5, z] as [number, number, number], scale: [w, h, d] as [number, number, number] });
    }
    return list;
  }, [count]);

  return (
    <group>
      {buildings.map((b, idx) => (
        <mesh key={idx} position={b.position}>
          <boxGeometry args={b.scale} />
          <meshStandardMaterial
            color="#cbd8ea"
            roughness={0.7}
            metalness={0.2}
          />
        </mesh>
      ))}
    </group>
  );
}

/**
 * Midground: Detailed Airport Runway & Infrastructure
 */
export function DetailedAirport({ compact }: LayerProps) {
  const concreteMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: "#dbe3ed", roughness: 0.8, metalness: 0.1 }),
    []
  );
  const asphaltMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: "#2d3748", roughness: 0.9, metalness: 0.1 }),
    []
  );
  const whiteMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: 0.4 }),
    []
  );
  const glassMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: "#90cdf4", roughness: 0.1, metalness: 0.8, transparent: true, opacity: 0.85 }),
    []
  );

  return (
    <group position={[-6, 0, 0]}>
      {/* Main Runway Strip */}
      <mesh rotation={[-Math.PI / 2, 0, 0.45]} position={[-2, 0.01, 2]}>
        <planeGeometry args={[4.5, 32]} />
        <primitive object={asphaltMat} attach="material" />
      </mesh>

      {/* Runway Threshold Lines */}
      <group position={[-2, 0.02, 2]} rotation={[0, -0.45, 0]}>
        {[-1.5, -1.0, -0.5, 0.5, 1.0, 1.5].map((x, i) => (
          <mesh key={i} position={[x, 0, -14]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[0.22, 2.2]} />
            <primitive object={whiteMat} attach="material" />
          </mesh>
        ))}
      </group>

      {/* Airport Terminal Building */}
      <group position={[-8, 0, -2]} rotation={[0, 0.45, 0]}>
        <mesh position={[0, 1.2, 0]}>
          <boxGeometry args={[7, 2.4, 3]} />
          <primitive object={concreteMat} attach="material" />
        </mesh>
        {/* Terminal Glass Facade */}
        <mesh position={[0, 1.2, 1.51]}>
          <planeGeometry args={[6.4, 1.8]} />
          <primitive object={glassMat} attach="material" />
        </mesh>

        {/* Jet Bridges */}
        {[-2.2, 0, 2.2].map((x, i) => (
          <group key={i} position={[x, 0.8, 2.1]} rotation={[0, 0.2, 0]}>
            <mesh position={[0, 0, 0.6]}>
              <boxGeometry args={[0.6, 0.6, 1.8]} />
              <meshStandardMaterial color="#cbd5e0" roughness={0.6} />
            </mesh>
            <mesh position={[0, -0.2, 1.4]}>
              <cylinderGeometry args={[0.4, 0.4, 0.8, 16]} />
              <meshStandardMaterial color="#a0aec0" roughness={0.7} />
            </mesh>
          </group>
        ))}
      </group>

      {/* Control Tower */}
      <group position={[-12, 0, -6]}>
        <mesh position={[0, 3.5, 0]}>
          <cylinderGeometry args={[0.4, 0.7, 7, 16]} />
          <primitive object={concreteMat} attach="material" />
        </mesh>
        <mesh position={[0, 7.2, 0]}>
          <cylinderGeometry args={[1.1, 0.8, 1.2, 16]} />
          <primitive object={glassMat} attach="material" />
        </mesh>
        <mesh position={[0, 7.9, 0]}>
          <coneGeometry args={[1.2, 0.4, 16]} />
          <meshStandardMaterial color="#e2e8f0" roughness={0.5} />
        </mesh>
      </group>
    </group>
  );
}

/**
 * Midground: Detailed Railway Infrastructure (Tracks, Sleepers, Station Platform)
 */
export function RailInfrastructure() {
  const steelMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: "#718096", metalness: 0.8, roughness: 0.3 }),
    []
  );
  const sleeperMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: "#4a5568", roughness: 0.9 }),
    []
  );
  const stationMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: "#edf2f7", roughness: 0.7 }),
    []
  );

  return (
    <group position={[0, 0, 0]}>
      {/* Railway Station Platform */}
      <group position={[-1, 0, -1.8]} rotation={[0, -0.4, 0]}>
        <mesh position={[0, 0.25, 0]}>
          <boxGeometry args={[14, 0.5, 1.8]} />
          <primitive object={stationMat} attach="material" />
        </mesh>

        {/* Platform Canopy Roof */}
        <mesh position={[0, 2.2, 0]}>
          <boxGeometry args={[14.2, 0.12, 2.2]} />
          <meshStandardMaterial color="#2b6cb0" roughness={0.3} metalness={0.4} />
        </mesh>

        {/* Canopy Support Pillars */}
        {[-5, -2, 1, 4].map((x, i) => (
          <mesh key={i} position={[x, 1.1, 0]}>
            <cylinderGeometry args={[0.08, 0.08, 1.8, 12]} />
            <meshStandardMaterial color="#4a5568" metalness={0.6} />
          </mesh>
        ))}

        {/* Railway Signals & Signs */}
        <group position={[6, 0.5, 0.8]}>
          <mesh position={[0, 1.2, 0]}>
            <cylinderGeometry args={[0.05, 0.05, 2.4, 12]} />
            <meshStandardMaterial color="#2d3748" metalness={0.8} />
          </mesh>
          <mesh position={[0, 2.2, 0]}>
            <boxGeometry args={[0.3, 0.6, 0.15]} />
            <meshStandardMaterial color="#1a202c" />
          </mesh>
          {/* Signal Light */}
          <mesh position={[0, 2.3, 0.09]}>
            <sphereGeometry args={[0.08, 12, 12]} />
            <meshBasicMaterial color="#38a169" />
          </mesh>
        </group>
      </group>
    </group>
  );
}

/**
 * Midground: Highway Network & Moving Vehicles
 */
export function HighwaySystem({ compact }: LayerProps) {
  const roadMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: "#334155", roughness: 0.9 }),
    []
  );

  const trafficRef = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    if (trafficRef.current) {
      const t = clock.elapsedTime * 2.5;
      trafficRef.current.children.forEach((car, i) => {
        car.position.x = ((i * 4 + t) % 36) - 18;
      });
    }
  });

  return (
    <group position={[0, 0, 4]}>
      {/* Highway Asphalt Strip */}
      <mesh rotation={[-Math.PI / 2, 0, -0.2]} position={[0, 0.01, 2]}>
        <planeGeometry args={[48, 1.8]} />
        <primitive object={roadMat} attach="material" />
      </mesh>

      {/* Moving Traffic Cars */}
      {!compact && (
        <group ref={trafficRef} position={[0, 0.15, 2.1]} rotation={[0, -0.2, 0]}>
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <mesh key={i} position={[i * 6 - 15, 0, 0]}>
              <boxGeometry args={[0.9, 0.35, 0.45]} />
              <meshStandardMaterial color={i % 2 === 0 ? "#e2e8f0" : "#3182ce"} roughness={0.4} />
            </mesh>
          ))}
        </group>
      )}
    </group>
  );
}
