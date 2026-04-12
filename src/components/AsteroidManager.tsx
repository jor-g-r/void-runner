import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { InstancedMesh, Object3D } from "three";
import { useGameStore } from "../stores/gameStore";
import { checkCollision } from "../systems/collisions";
import type { AsteroidData } from "../types";

const DUMMY = new Object3D();
const MAX_ASTEROIDS = 10;
const PLAYER_RADIUS = 0.6;

let nextAsteroidId = 0;

// Spawn times during the level (seconds)
const ASTEROID_SPAWNS = [
  { time: 12, count: 2 },
  { time: 35, count: 3 },
  { time: 60, count: 2 },
  { time: 85, count: 4 },
  { time: 108, count: 3 },
];

export const AsteroidManager = () => {
  const meshRef = useRef<InstancedMesh>(null);
  const spawnIndex = useRef(0);
  const lastResetTime = useRef(-1);

  useFrame((_state, rawDelta) => {
    const delta = Math.min(rawDelta, 0.1);
    const state = useGameStore.getState();
    if (state.phase !== "playing") return;

    // Reset on new game
    if (state.time < 1 && lastResetTime.current !== 0) {
      spawnIndex.current = 0;
      nextAsteroidId = 0;
      lastResetTime.current = 0;
    }

    let asteroids = [...state.asteroids];
    const [px, py] = state.playerPosition;
    const playerPos: [number, number, number] = [px, py, 0];

    // --- Spawn asteroids by timeline ---
    while (
      spawnIndex.current < ASTEROID_SPAWNS.length &&
      ASTEROID_SPAWNS[spawnIndex.current].time <= state.time
    ) {
      const spawn = ASTEROID_SPAWNS[spawnIndex.current];
      for (let i = 0; i < spawn.count; i++) {
        const size = 0.8 + Math.random() * 1.2; // radius 0.8–2.0
        asteroids.push({
          id: `ast-${nextAsteroidId++}`,
          position: [
            (Math.random() - 0.5) * 16,
            (Math.random() - 0.5) * 8,
            -50 - Math.random() * 20,
          ],
          velocity: [
            (Math.random() - 0.5) * 3,
            (Math.random() - 0.5) * 2,
            12 + Math.random() * 6,
          ],
          radius: size,
          rotation: [
            Math.random() * Math.PI * 2,
            Math.random() * Math.PI * 2,
            Math.random() * Math.PI * 2,
          ],
          rotationSpeed: [
            (Math.random() - 0.5) * 2,
            (Math.random() - 0.5) * 2,
            (Math.random() - 0.5) * 2,
          ],
        });
      }
      spawnIndex.current++;
    }

    // --- Update asteroids ---
    const updated: AsteroidData[] = [];
    for (const a of asteroids) {
      const newPos: [number, number, number] = [
        a.position[0] + a.velocity[0] * delta,
        a.position[1] + a.velocity[1] * delta,
        a.position[2] + a.velocity[2] * delta,
      ];
      const newRot: [number, number, number] = [
        a.rotation[0] + a.rotationSpeed[0] * delta,
        a.rotation[1] + a.rotationSpeed[1] * delta,
        a.rotation[2] + a.rotationSpeed[2] * delta,
      ];

      // Despawn if past camera
      if (newPos[2] > 15) continue;

      // Collision with player
      if (checkCollision(newPos, a.radius, playerPos, PLAYER_RADIUS)) {
        state.damagePlayer();
        continue; // Remove asteroid on hit
      }

      updated.push({
        ...a,
        position: newPos,
        rotation: newRot,
      });
    }

    useGameStore.setState({ asteroids: updated });

    // --- Render ---
    if (!meshRef.current) return;
    for (let i = 0; i < MAX_ASTEROIDS; i++) {
      if (i < updated.length) {
        const a = updated[i];
        DUMMY.position.set(a.position[0], a.position[1], a.position[2]);
        DUMMY.rotation.set(a.rotation[0], a.rotation[1], a.rotation[2]);
        const s = a.radius;
        DUMMY.scale.set(s, s * 0.7, s * 0.85); // Slightly squished for irregular look
      } else {
        DUMMY.scale.set(0, 0, 0);
      }
      DUMMY.updateMatrix();
      meshRef.current.setMatrixAt(i, DUMMY.matrix);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, MAX_ASTEROIDS]}>
      <icosahedronGeometry args={[1, 0]} />
      <meshStandardMaterial
        color="#665544"
        emissive="#332211"
        emissiveIntensity={0.2}
        roughness={0.9}
      />
    </instancedMesh>
  );
};
