import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { Mesh } from "three";
import type { PickupData } from "../types";
import { useGameStore } from "../stores/gameStore";

interface PickupProps {
  data: PickupData;
}

const DRIFT_SPEED = 20; // Always drifts toward player
const MAGNET_RADIUS = 8;
const MAGNET_RADIUS_UPGRADED = 20;
const MAGNET_SPEED = 25;
const COLLECT_RADIUS = 1.5;
const BOB_SPEED = 3;
const BOB_AMOUNT = 0.15;

export const Pickup = ({ data }: PickupProps) => {
  const meshRef = useRef<Mesh>(null);
  const bobPhase = useRef(Math.random() * Math.PI * 2);

  useFrame((_state, rawDelta) => {
    if (!meshRef.current) return;
    const delta = Math.min(rawDelta, 0.1);
    const gameState = useGameStore.getState();
    const [px, py] = gameState.playerPosition;

    bobPhase.current += BOB_SPEED * delta;
    const bobY = Math.sin(bobPhase.current) * BOB_AMOUNT;

    const dx = px - data.position[0];
    const dy = py - data.position[1];
    const dz = 0 - data.position[2];
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

    const magnetR = gameState.upgrades.includes("magnet")
      ? MAGNET_RADIUS_UPGRADED
      : MAGNET_RADIUS;

    if (dist < magnetR && dist > COLLECT_RADIUS) {
      // Strong magnet pull when in range
      const pullStrength = MAGNET_SPEED * delta;
      data.position[0] += (dx / dist) * pullStrength;
      data.position[1] += (dy / dist) * pullStrength;
      data.position[2] += (dz / dist) * pullStrength;
    } else if (dist > COLLECT_RADIUS) {
      // Always drift toward player (slower, gets them in magnet range)
      data.position[0] += (dx / dist) * DRIFT_SPEED * delta * 0.3;
      data.position[1] += (dy / dist) * DRIFT_SPEED * delta * 0.3;
      data.position[2] += (dz / dist) * DRIFT_SPEED * delta;
    }

    if (dist < COLLECT_RADIUS) {
      gameState.collectPickup(data.id);
      return;
    }

    meshRef.current.position.set(
      data.position[0],
      data.position[1] + bobY,
      data.position[2],
    );
    meshRef.current.rotation.y += delta * 2;
  });

  return (
    <mesh ref={meshRef}>
      <octahedronGeometry args={[0.25, 0]} />
      <meshStandardMaterial
        color="#44ff88"
        emissive="#22ff66"
        emissiveIntensity={2}
        toneMapped={false}
      />
    </mesh>
  );
};
