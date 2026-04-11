import { useCallback, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { useGameStore } from "../stores/gameStore";
import { checkCollision } from "../systems/collisions";
import { ENEMY_STATS } from "../data/enemies";
import { Enemy } from "./Enemy";
import { Explosion } from "./Explosion";
import type { EnemyData, EnemyType } from "../types";

let nextEnemyId = 0;

const TEST_SPAWN_INTERVAL = 2;

interface ExplosionInstance {
  id: string;
  position: [number, number, number];
}

let nextExplosionId = 0;

export const EnemyManager = () => {
  const spawnTimer = useRef(0);
  const [explosions, setExplosions] = useState<ExplosionInstance[]>([]);

  const removeExplosion = useCallback((id: string) => {
    setExplosions((prev) => prev.filter((e) => e.id !== id));
  }, []);

  useFrame((_state, rawDelta) => {
    const delta = Math.min(rawDelta, 0.1);
    const state = useGameStore.getState();
    if (state.phase !== "playing") return;

    // Start from current enemies
    let enemies = [...state.enemies];

    // --- Spawn test enemies ---
    spawnTimer.current += delta;
    if (spawnTimer.current >= TEST_SPAWN_INTERVAL) {
      spawnTimer.current = 0;
      const types: EnemyType[] = ["drone", "drone", "drone", "fighter", "tank"];
      const type = types[Math.floor(Math.random() * types.length)];
      const stats = ENEMY_STATS[type];

      enemies.push({
        id: `enemy-${nextEnemyId++}`,
        type,
        hp: stats.hp,
        maxHp: stats.hp,
        position: [
          (Math.random() - 0.5) * 12,
          (Math.random() - 0.5) * 5,
          -40 - Math.random() * 15,
        ],
        velocity: [0, 0, stats.speed],
        state: "approaching",
        stateTimer: 0,
        radius: stats.radius,
        flashTimer: 0,
      });
    }

    // --- Collision detection: player projectiles vs enemies ---
    const projectiles = state.playerProjectiles;
    const hitProjectileIds = new Set<string>();
    const updatedEnemies: EnemyData[] = [];
    const destroyedPositions: [number, number, number][] = [];
    let scoreGained = 0;

    for (const enemy of enemies) {
      let damage = 0;

      for (const proj of projectiles) {
        if (hitProjectileIds.has(proj.id)) continue;
        if (checkCollision(proj.position, 0.2, enemy.position, enemy.radius)) {
          damage += 1;
          hitProjectileIds.add(proj.id);
        }
      }

      const newHp = enemy.hp - damage;

      if (newHp <= 0) {
        destroyedPositions.push([...enemy.position] as [number, number, number]);
        scoreGained += ENEMY_STATS[enemy.type].score;
        continue;
      }

      // Move enemy forward (toward camera)
      const newZ = enemy.position[2] + enemy.velocity[2] * delta;

      // Despawn if past camera
      if (newZ > 15) continue;

      updatedEnemies.push({
        ...enemy,
        hp: newHp,
        position: [enemy.position[0], enemy.position[1], newZ],
        flashTimer: damage > 0 ? 0.08 : Math.max(0, enemy.flashTimer - delta),
      });
    }

    // Apply all state at once
    const filteredProjectiles = hitProjectileIds.size > 0
      ? projectiles.filter((p) => !hitProjectileIds.has(p.id))
      : projectiles;

    useGameStore.setState({
      enemies: updatedEnemies,
      playerProjectiles: filteredProjectiles,
      score: state.score + scoreGained,
    });

    // Spawn explosions
    if (destroyedPositions.length > 0) {
      setExplosions((prev) => [
        ...prev,
        ...destroyedPositions.map((pos) => ({
          id: `exp-${nextExplosionId++}`,
          position: pos,
        })),
      ]);
    }
  });

  const enemies = useGameStore((s) => s.enemies);

  return (
    <>
      {enemies.map((e) => (
        <Enemy key={e.id} data={e} />
      ))}
      {explosions.map((e) => (
        <Explosion
          key={e.id}
          position={e.position}
          onComplete={() => removeExplosion(e.id)}
        />
      ))}
    </>
  );
};
