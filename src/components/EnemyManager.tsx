import { useCallback, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { useGameStore } from "../stores/gameStore";
import { checkCollision } from "../systems/collisions";
import { ENEMY_STATS } from "../data/enemies";
import { LEVEL_WAVES } from "../data/waves";
import { spawnWave, resetTimelineIds } from "../systems/timeline";
import { EnemyRenderer } from "./EnemyRenderer";
import { PickupRenderer } from "./PickupRenderer";
import { Explosion } from "./Explosion";
import type { EnemyData } from "../types";

const FIGHTER_STOP_Z = -15;
const FIGHTER_FIRE_INTERVAL = 1.5;
const TANK_CHARGE_TIME = 1.5;
const TANK_STOP_Z = -20;
const PICKUP_DROP_CHANCE = 0.4;

interface ExplosionInstance {
  id: string;
  position: [number, number, number];
}

let nextExplosionId = 0;

export const EnemyManager = () => {
  const [explosions, setExplosions] = useState<ExplosionInstance[]>([]);
  const lastResetTime = useRef(-1);

  const removeExplosion = useCallback((id: string) => {
    setExplosions((prev) => prev.filter((e) => e.id !== id));
  }, []);

  useFrame((_state, rawDelta) => {
    const delta = Math.min(rawDelta, 0.1);
    const state = useGameStore.getState();
    if (state.phase !== "playing") return;

    // Reset timeline IDs on new game
    if (state.time < 1 && lastResetTime.current !== 0) {
      resetTimelineIds();
      lastResetTime.current = 0;
    }

    let enemies = [...state.enemies];
    const [playerX, playerY] = state.playerPosition;

    // --- Wave timeline spawning ---
    const currentTime = state.time;
    let waveIndex = state.waveIndex;

    while (waveIndex < LEVEL_WAVES.length && LEVEL_WAVES[waveIndex].time <= currentTime) {
      const wave = LEVEL_WAVES[waveIndex];
      const spawned = spawnWave(wave.enemies, wave.formation, wave.position);
      enemies.push(...spawned);
      waveIndex++;
    }

    // Note: victory is handled by Boss component when defeated

    // --- Collision detection: player projectiles vs enemies ---
    const projectiles = state.playerProjectiles;
    const hitProjectileIds = new Set<string>();
    const updatedEnemies: EnemyData[] = [];
    const destroyedPositions: [number, number, number][] = [];
    let scoreGained = 0;
    const scoreMultiplier = state.upgrades.includes("overdrive") ? 1.25 : 1;

    for (const enemy of enemies) {
      let damage = 0;

      for (const proj of projectiles) {
        if (hitProjectileIds.has(proj.id)) continue;
        const projRadius = proj.isCharged ? (proj.radius ?? 1.5) : 0.2;
        if (checkCollision(proj.position, projRadius, enemy.position, enemy.radius)) {
          damage += proj.isCharged ? 5 : 1;
          if (!proj.isCharged) hitProjectileIds.add(proj.id);
        }
      }

      const newHp = enemy.hp - damage;

      if (newHp <= 0) {
        destroyedPositions.push([...enemy.position] as [number, number, number]);
        scoreGained += Math.floor(ENEMY_STATS[enemy.type].score * scoreMultiplier);
        continue;
      }

      // --- Enemy AI ---
      let newState = enemy.state;
      let newTimer = enemy.stateTimer + delta;
      let newX = enemy.position[0];
      let newY = enemy.position[1];
      let newZ = enemy.position[2] + enemy.velocity[2] * delta;

      if (enemy.type === "fighter") {
        const sf = enemy.strafeFactor ?? 1;

        if (newState === "approaching" && newZ >= FIGHTER_STOP_Z) {
          newState = "attacking";
          newTimer = 0;
        }
        if (newState === "attacking") {
          newZ = enemy.position[2];
          const targetX = playerX * sf;
          const dx = targetX - newX;
          newX += Math.sign(dx) * 4 * delta;
          newX = Math.max(-7, Math.min(7, newX));

          if (newTimer >= FIGHTER_FIRE_INTERVAL) {
            newTimer = 0;
            const dirX = (playerX - newX) * 0.5;
            const dirY = (playerY - newY) * 0.5;
            const speed = 30;
            state.fireEnemyProjectile(
              [newX, newY, newZ],
              [dirX * speed * 0.1, dirY * speed * 0.1, speed],
            );
          }
        }
      } else if (enemy.type === "tank") {
        if (newState === "approaching" && newZ >= TANK_STOP_Z) {
          newState = "charging";
          newTimer = 0;
        }
        if (newState === "charging") {
          newZ = enemy.position[2];
          if (newTimer >= TANK_CHARGE_TIME) {
            newState = "attacking";
            newTimer = 0;
            for (let i = -2; i <= 2; i++) {
              state.fireEnemyProjectile(
                [newX + i * 1.5, newY, newZ],
                [i * 3, 0, 40],
              );
            }
          }
        }
        if (newState === "attacking") {
          newZ = enemy.position[2];
          if (newTimer >= 2) {
            newState = "charging";
            newTimer = 0;
          }
        }
      }

      if (newZ > 15) continue;

      updatedEnemies.push({
        ...enemy,
        hp: newHp,
        position: [newX, newY, newZ],
        state: newState,
        stateTimer: newTimer,
        flashTimer: damage > 0 ? 0.08 : Math.max(0, enemy.flashTimer - delta),
      });
    }

    const filteredProjectiles = hitProjectileIds.size > 0
      ? projectiles.filter((p) => !hitProjectileIds.has(p.id))
      : projectiles;

    useGameStore.setState({
      enemies: updatedEnemies,
      playerProjectiles: filteredProjectiles,
      score: state.score + scoreGained,
      waveIndex,
    });

    // Spawn explosions + pickups
    if (destroyedPositions.length > 0) {
      state.requestShake(0.05, 0.1);
      setExplosions((prev) => [
        ...prev,
        ...destroyedPositions.map((pos) => ({
          id: `exp-${nextExplosionId++}`,
          position: pos,
        })),
      ]);

      // Drop pickups
      for (const pos of destroyedPositions) {
        if (Math.random() < PICKUP_DROP_CHANCE) {
          state.spawnPickup(pos);
        }
      }
    }
  });

  return (
    <>
      <EnemyRenderer />
      <PickupRenderer />
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
