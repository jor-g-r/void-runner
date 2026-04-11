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

    // Hit flash — spike emissive intensity when flashTimer > 0
    const mat = meshRef.current.material as THREE.MeshStandardMaterial;
    if (data.flashTimer > 0) {
      mat.emissiveIntensity = 4;
    } else {
      mat.emissiveIntensity = 0.5;
    }
  });

  const { color, emissive } = TYPE_COLORS[data.type];

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
      <mesh ref={meshRef}>
        <coneGeometry args={[0.5, 1.2, 5]} />
        <meshStandardMaterial color={color} emissive={emissive} emissiveIntensity={0.5} />
      </mesh>
    );
  }

  // tank
  return (
    <mesh ref={meshRef}>
      <boxGeometry args={[1.2, 1.2, 0.8]} />
      <meshStandardMaterial color={color} emissive={emissive} emissiveIntensity={0.5} />
    </mesh>
  );
};

import type * as THREE from "three";
