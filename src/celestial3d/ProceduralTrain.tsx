import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";

import { COLORS } from "./sceneConfig";

interface Props {
  detailed?: boolean;
}

export function ProceduralTrain({ detailed = true }: Props) {
  const headlightRef = useRef<THREE.Mesh>(null);
  const glowStripeRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (headlightRef.current) {
      const mat = headlightRef.current.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = 2.5 + Math.sin(t * 8) * 0.5;
    }
    if (glowStripeRef.current) {
      const mat = glowStripeRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.8 + Math.sin(t * 4) * 0.2;
    }
  });

  const metallicBody = (
    <meshStandardMaterial
      color="#f1f5f9"
      metalness={0.7}
      roughness={0.15}
    />
  );

  return (
    <group>
      {/* Aerodynamic high-speed power car nose */}
      <mesh position={[0, 0.38, 2.4]} rotation={[Math.PI / 2, 0, 0]} scale={[1, 1, 1.4]}>
        <sphereGeometry args={[0.28, 24, 20, 0, Math.PI * 2, 0, Math.PI / 2]} />
        {metallicBody}
      </mesh>
      <mesh position={[0, 0.38, 2.0]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.28, 0.28, 1.2, 24]} />
        {metallicBody}
      </mesh>

      {/* Aerodynamic windshield glass */}
      <mesh position={[0, 0.5, 2.8]} rotation={[0.42, 0, 0]}>
        <boxGeometry args={[0.4, 0.18, 0.05]} />
        <meshStandardMaterial color="#0f172a" metalness={0.9} roughness={0.05} />
      </mesh>

      {/* High-intensity LED headlights */}
      {[-0.14, 0.14].map((x) => (
        <mesh key={x} ref={headlightRef} position={[x, 0.3, 3.12]}>
          <sphereGeometry args={[0.05, 14, 14]} />
          <meshStandardMaterial
            color="#38bdf8"
            emissive="#0ea5e9"
            emissiveIntensity={3}
          />
        </mesh>
      ))}

      {/* Glowing Neon Cyber Stripe along train body */}
      <mesh ref={glowStripeRef} position={[0, 0.32, 0]}>
        <boxGeometry args={[0.58, 0.04, 6.2]} />
        <meshBasicMaterial color="#38bdf8" transparent opacity={0.9} toneMapped={false} />
      </mesh>

      {/* Passenger Coaches 01, 02, 03 */}
      {[0.8, -0.75, -2.3].map((z, index) => (
        <group key={index} position={[0, 0.38, z]}>
          {/* Main streamlined coach capsule */}
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <capsuleGeometry args={[0.26, 1.25, 10, 20]} />
            {metallicBody}
          </mesh>

          {/* Continuous dark tinted glass window bar */}
          <mesh position={[0, 0.1, 0]}>
            <boxGeometry args={[0.54, 0.12, 1.15]} />
            <meshStandardMaterial color="#1e293b" metalness={0.8} roughness={0.1} />
          </mesh>

          {/* Interior glowing passenger window dots */}
          {[-0.4, -0.2, 0, 0.2, 0.4].map((wz) => (
            <group key={wz}>
              <mesh position={[0.275, 0.1, wz]}>
                <boxGeometry args={[0.01, 0.06, 0.08]} />
                <meshStandardMaterial color="#fef08a" emissive="#eab308" emissiveIntensity={1.2} />
              </mesh>
              <mesh position={[-0.275, 0.1, wz]}>
                <boxGeometry args={[0.01, 0.06, 0.08]} />
                <meshStandardMaterial color="#fef08a" emissive="#eab308" emissiveIntensity={1.2} />
              </mesh>
            </group>
          ))}

          {/* Electric blue livery stripe */}
          <mesh position={[0, -0.07, 0]}>
            <boxGeometry args={[0.54, 0.04, 1.25]} />
            <meshStandardMaterial
              color={COLORS.blue}
              metalness={0.5}
              roughness={0.2}
              emissive={COLORS.blue}
              emissiveIntensity={0.3}
            />
          </mesh>
        </group>
      ))}

      {/* Futuristic Maglev track levitation energy ring under train */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.04, 0]}>
        <planeGeometry args={[0.7, 6.8]} />
        <meshBasicMaterial color="#0ea5e9" transparent opacity={0.25} toneMapped={false} />
      </mesh>
    </group>
  );
}

