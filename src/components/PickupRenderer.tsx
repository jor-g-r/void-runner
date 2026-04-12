import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { InstancedMesh, Object3D } from "three";
import { useGameStore } from "../stores/gameStore";

const DUMMY = new Object3D();
const MAX_PICKUPS = 30;
const DRIFT_SPEED = 20;
const MAGNET_RADIUS = 8;
const MAGNET_RADIUS_UPGRADED = 20;
const MAGNET_SPEED = 25;
const COLLECT_RADIUS = 1.5;

export const PickupRenderer = () => {
  const meshRef = useRef<InstancedMesh>(null);
  const bobPhases = useRef<number[]>(
    Array.from({ length: MAX_PICKUPS }, () => Math.random() * Math.PI * 2),
  );

  useFrame((_state, rawDelta) => {
    const delta = Math.min(rawDelta, 0.1);
    const gameState = useGameStore.getState();
    if (!meshRef.current) return;

    const pickups = gameState.pickups;
    const [px, py] = gameState.playerPosition;
    const magnetR = gameState.upgrades.includes("magnet")
      ? MAGNET_RADIUS_UPGRADED
      : MAGNET_RADIUS;

    const toCollect: string[] = [];

    for (let i = 0; i < MAX_PICKUPS; i++) {
      if (i < pickups.length) {
        const p = pickups[i];
        bobPhases.current[i] += 3 * delta;

        const dx = px - p.position[0];
        const dy = py - p.position[1];
        const dz = 0 - p.position[2];
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

        if (dist < COLLECT_RADIUS) {
          toCollect.push(p.id);
          DUMMY.scale.set(0, 0, 0);
        } else if (dist < magnetR) {
          const pull = MAGNET_SPEED * delta;
          p.position[0] += (dx / dist) * pull;
          p.position[1] += (dy / dist) * pull;
          p.position[2] += (dz / dist) * pull;
          DUMMY.scale.set(1, 1, 1);
        } else {
          p.position[0] += (dx / dist) * DRIFT_SPEED * delta * 0.3;
          p.position[1] += (dy / dist) * DRIFT_SPEED * delta * 0.3;
          p.position[2] += (dz / dist) * DRIFT_SPEED * delta;
          DUMMY.scale.set(1, 1, 1);
        }

        const bobY = Math.sin(bobPhases.current[i]) * 0.15;
        DUMMY.position.set(p.position[0], p.position[1] + bobY, p.position[2]);
        DUMMY.rotation.y += delta * 2;
      } else {
        DUMMY.scale.set(0, 0, 0);
      }
      DUMMY.updateMatrix();
      meshRef.current.setMatrixAt(i, DUMMY.matrix);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;

    // Collect pickups
    for (const id of toCollect) {
      gameState.collectPickup(id);
    }
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, MAX_PICKUPS]}>
      <octahedronGeometry args={[0.25, 0]} />
      <meshStandardMaterial
        color="#44ff88"
        emissive="#22ff66"
        emissiveIntensity={2}
        toneMapped={false}
      />
    </instancedMesh>
  );
};
