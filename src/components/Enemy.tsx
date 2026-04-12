import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { Mesh } from "three";
import type { EnemyData } from "../types";

interface EnemyProps {
  data: EnemyData;
}

const TYPE_COLORS = {
  drone: { color: "#44ff88", emissive: "#22aa44" },
  fighter: { color: "#ff4466", emissive: "#aa2233" },
  tank: { color: "#ff8844", emissive: "#aa4422" },
} as const;

export const Enemy = ({ data }: EnemyProps) => {
  const meshRef = useRef<Mesh>(null);

  useFrame(() => {
    if (!meshRef.current) return;
    meshRef.current.position.set(
      data.position[0],
      data.position[1],
      data.position[2],
    );

    const mat = meshRef.current.material as THREE.MeshStandardMaterial;
    if (data.flashTimer > 0) {
      mat.emissiveIntensity = 4;
      mat.emissive.setHex(0xffffff);
    } else {
      mat.emissiveIntensity = 0.5;
      const colors = TYPE_COLORS[data.type];
      mat.emissive.set(colors.emissive);
    }
  });

  const { color, emissive } = TYPE_COLORS[data.type];
  const isCharging = data.type === "tank" && data.state === "charging";

  if (data.type === "drone") {
    return (
      <mesh ref={meshRef}>
        <octahedronGeometry args={[0.5, 0]} />
        <meshStandardMaterial color={color} emissive={emissive} emissiveIntensity={0.5} />
      </mesh>
    );
  }

  if (data.type === "fighter") {
    return (
      <mesh ref={meshRef} rotation={[Math.PI, 0, 0]}>
        <coneGeometry args={[0.5, 1.2, 5]} />
        <meshStandardMaterial color={color} emissive={emissive} emissiveIntensity={0.5} />
      </mesh>
    );
  }

  // Tank — with charge telegraph
  return (
    <group>
      <mesh ref={meshRef}>
        <boxGeometry args={[1.2, 1.2, 0.8]} />
        <meshStandardMaterial color={color} emissive={emissive} emissiveIntensity={0.5} />
      </mesh>
      {/* Charge telegraph — red glow that grows */}
      {isCharging && (
        <mesh
          position={[data.position[0], data.position[1], data.position[2] + 0.5]}
        >
          <sphereGeometry args={[0.3 + data.stateTimer * 0.5, 8, 8]} />
          <meshStandardMaterial
            color="#ff0000"
            emissive="#ff0000"
            emissiveIntensity={2 + data.stateTimer * 3}
            transparent
            opacity={0.4 + data.stateTimer * 0.3}
            toneMapped={false}
          />
        </mesh>
      )}
    </group>
  );
};

import type * as THREE from "three";
