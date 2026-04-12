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
const FIGHTER_STOP_Z = -15;
const FIGHTER_FIRE_INTERVAL = 1.5;
const TANK_CHARGE_TIME = 1.5;
const TANK_STOP_Z = -20;

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

    let enemies = [...state.enemies];
    const [playerX, playerY] = state.playerPosition;

    // --- Spawn test enemies ---
    spawnTimer.current += delta;
    if (spawnTimer.current >= TEST_SPAWN_INTERVAL) {
      spawnTimer.current = 0;
      const types: EnemyType[] = ["drone", "drone", "drone", "fighter", "tank"];
      const type = types[Math.floor(Math.random() * types.length)];
      const stats = ENEMY_STATS[type];

      // Fighters get a random strafe factor:
      // 1 = chase player directly, -1 = full mirror, values between = offset
      const strafeFactor = type === "fighter"
        ? (Math.random() < 0.5 ? 1 : -(0.6 + Math.random() * 0.4))
        : undefined;

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
        strafeFactor,
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
        const projRadius = proj.isCharged ? (proj.radius ?? 1.5) : 0.2;
        // Charged shots deal 5 damage
        if (checkCollision(proj.position, projRadius, enemy.position, enemy.radius)) {
          damage += proj.isCharged ? 5 : 1;
          if (!proj.isCharged) hitProjectileIds.add(proj.id);
        }
      }

      const newHp = enemy.hp - damage;

      if (newHp <= 0) {
        destroyedPositions.push([...enemy.position] as [number, number, number]);
        scoreGained += ENEMY_STATS[enemy.type].score;
        continue;
      }

      // --- Enemy AI by type ---
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
          // Stop forward movement
          newZ = enemy.position[2];

          // Strafe: chase (sf=1) goes toward player, mirror (sf=-1) goes opposite
          const targetX = playerX * sf;
          const dx = targetX - newX;
          newX += Math.sign(dx) * 4 * delta;

          // Clamp to playfield
          newX = Math.max(-7, Math.min(7, newX));

          // Fire at intervals — always aims at player regardless of strafe mode
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
          // Stop forward movement
          newZ = enemy.position[2];

          if (newTimer >= TANK_CHARGE_TIME) {
            newState = "attacking";
            newTimer = 0;
            // Fire wide beam — 5 projectiles in a horizontal spread
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
          // Reset to charging after cooldown
          if (newTimer >= 2) {
            newState = "charging";
            newTimer = 0;
          }
        }
      }

      // Despawn if past camera
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

    // Apply all state at once
    const filteredProjectiles = hitProjectileIds.size > 0
      ? projectiles.filter((p) => !hitProjectileIds.has(p.id))
      : projectiles;

    useGameStore.setState({
      enemies: updatedEnemies,
      playerProjectiles: filteredProjectiles,
      score: state.score + scoreGained,
    });

    // Spawn explosions + screen shake
    if (destroyedPositions.length > 0) {
      state.requestShake(0.05, 0.1);
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
