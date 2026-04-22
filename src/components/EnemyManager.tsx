import { useCallback, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { useGameStore } from "../stores/gameStore";
import { checkCollision } from "../systems/collisions";
import { ENEMY_STATS } from "../data/enemies";
import { LEVEL_WAVES } from "../data/waves";
import { spawnWave, resetTimelineIds } from "../systems/timeline";
import { playSfx } from "../systems/audio";
import { EnemyRenderer } from "./EnemyRenderer";
import { PickupRenderer } from "./PickupRenderer";
import { Explosion } from "./Explosion";
import { ScorePopup } from "./ScorePopup";
import type { EnemyData } from "../types";

const FIGHTER_STOP_Z = -15;
const FIGHTER_FIRE_INTERVAL = 1.5;
const TANK_CHARGE_TIME = 1.5;
const TANK_STOP_Z = -20;
const PICKUP_DROP_CHANCE = 0.4;
const PLAYER_RADIUS = 0.6;
const DRONE_RAM_DAMAGE = 25;

interface ExplosionInstance {
  id: string;
  position: [number, number, number];
}

interface PopupInstance {
  id: string;
  position: [number, number, number];
  amount: number;
}

let nextExplosionId = 0;
let nextPopupId = 0;

export const EnemyManager = () => {
  const [explosions, setExplosions] = useState<ExplosionInstance[]>([]);
  const [popups, setPopups] = useState<PopupInstance[]>([]);
  const lastTime = useRef(0);

  const removeExplosion = useCallback((id: string) => {
    setExplosions((prev) => prev.filter((e) => e.id !== id));
  }, []);

  const removePopup = useCallback((id: string) => {
    setPopups((prev) => prev.filter((p) => p.id !== id));
  }, []);

  useFrame((_state, rawDelta) => {
    const delta = Math.min(rawDelta, 0.1);
    const state = useGameStore.getState();
    if (state.phase !== "playing") return;

    // Reset timeline IDs on new game (detect time going backwards)
    if (state.time < lastTime.current) {
      resetTimelineIds();
    }
    lastTime.current = state.time;

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
    const destroyed: { position: [number, number, number]; score: number }[] = [];
    let scoreGained = 0;
    let nonLethalHits = 0;
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
        const score = Math.floor(ENEMY_STATS[enemy.type].score * scoreMultiplier);
        destroyed.push({
          position: [...enemy.position] as [number, number, number],
          score,
        });
        scoreGained += score;
        continue;
      }

      if (damage > 0) nonLethalHits++;

      // --- Enemy AI ---
      let newState = enemy.state;
      let newTimer = enemy.stateTimer + delta;
      let newX = enemy.position[0];
      let newY = enemy.position[1];
      let newZ = enemy.position[2];

      // Swoop-in entrance: ease position from entry origin to formation
      // target, then flip to "approaching" so normal forward motion resumes.
      if (newState === "entering") {
        const ENTRY_DURATION = 1.1;
        const t = Math.min(newTimer / ENTRY_DURATION, 1);
        const ease = 1 - Math.pow(1 - t, 3);
        const ox = enemy.entryOriginX ?? newX;
        const oy = enemy.entryOriginY ?? newY;
        const oz = enemy.entryOriginZ ?? newZ;
        const fx = enemy.formationTargetX ?? newX;
        const fy = enemy.formationTargetY ?? newY;
        const fz = enemy.formationTargetZ ?? newZ;
        newX = ox + (fx - ox) * ease;
        newY = oy + (fy - oy) * ease;
        newZ = oz + (fz - oz) * ease;
        if (t >= 1) {
          newState = "approaching";
          newTimer = 0;
        }
      } else {
        newZ = enemy.position[2] + enemy.velocity[2] * delta;
      }

      if (enemy.type === "fighter") {
        const offX = enemy.strafeOffsetX ?? 0;
        const offY = enemy.strafeOffsetY ?? 0;
        const phase = enemy.strafePhase ?? 0;

        if (newState === "approaching" && newZ >= FIGHTER_STOP_Z) {
          newState = "attacking";
          newTimer = 0;
        }
        if (newState === "attacking") {
          newZ = enemy.position[2];

          // Absolute-offset targeting: each fighter holds its own lane
          // relative to the player, so two fighters never converge.
          const targetX = playerX + offX;
          // Y combines soft player-chase with a per-fighter sine so the
          // swarm moves diagonally without feeling mechanical.
          const targetY = playerY * 0.35 + offY + Math.sin(newTimer * 1.5 + phase) * 1.6;

          const dx = targetX - newX;
          const dy = targetY - newY;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const strafeSpeed = 4;
          if (dist > 0.01) {
            const step = Math.min(strafeSpeed * delta, dist);
            newX += (dx / dist) * step;
            newY += (dy / dist) * step;
          }
          newX = Math.max(-7, Math.min(7, newX));
          newY = Math.max(-4, Math.min(4, newY));

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
              state.fireEnemyProjectile([newX + i * 1.5, newY, newZ], [i * 3, 0, 40]);
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

      // Drone firing — 20% of drones shoot once their cooldown elapses.
      // Set to Infinity after firing so they don't reload (one-shot fodder).
      let newShootCooldown = enemy.shootCooldown;
      if (enemy.type === "drone" && enemy.canShoot && newState === "approaching") {
        newShootCooldown = (newShootCooldown ?? 0) - delta;
        if (newShootCooldown <= 0) {
          const dirX = (playerX - newX) * 0.5;
          const dirY = (playerY - newY) * 0.5;
          const bulletSpeed = 25;
          state.fireEnemyProjectile(
            [newX, newY, newZ],
            [dirX * bulletSpeed * 0.1, dirY * bulletSpeed * 0.1, bulletSpeed],
          );
          newShootCooldown = Infinity;
        }
      }

      // Drone ram damage — drones that collide with the player deal HP
      // damage (shield-aware via damagePlayer) and explode on contact.
      if (
        enemy.type === "drone" &&
        checkCollision([newX, newY, newZ], enemy.radius, [playerX, playerY, 0], PLAYER_RADIUS)
      ) {
        state.damagePlayer(DRONE_RAM_DAMAGE);
        destroyed.push({ position: [newX, newY, newZ], score: 0 });
        continue;
      }

      if (newZ > 15) continue;

      updatedEnemies.push({
        ...enemy,
        hp: newHp,
        position: [newX, newY, newZ],
        state: newState,
        stateTimer: newTimer,
        flashTimer: damage > 0 ? 0.08 : Math.max(0, enemy.flashTimer - delta),
        shootCooldown: newShootCooldown,
      });
    }

    const filteredProjectiles =
      hitProjectileIds.size > 0
        ? projectiles.filter((p) => !hitProjectileIds.has(p.id))
        : projectiles;

    useGameStore.setState({
      enemies: updatedEnemies,
      playerProjectiles: filteredProjectiles,
      score: state.score + scoreGained,
      waveIndex,
    });

    if (nonLethalHits > 0) {
      playSfx("hit");
    }

    // Spawn explosions + popups + pickups
    if (destroyed.length > 0) {
      playSfx("explode");
      state.requestShake(0.05, 0.1);
      setExplosions((prev) => [
        ...prev,
        ...destroyed.map((d) => ({
          id: `exp-${nextExplosionId++}`,
          position: d.position,
        })),
      ]);
      setPopups((prev) => [
        ...prev,
        ...destroyed.map((d) => ({
          id: `pop-${nextPopupId++}`,
          position: d.position,
          amount: d.score,
        })),
      ]);

      // Drop pickups
      for (const d of destroyed) {
        if (Math.random() < PICKUP_DROP_CHANCE) {
          state.spawnPickup(d.position);
        }
      }
    }
  });

  return (
    <>
      <EnemyRenderer />
      <PickupRenderer />
      {explosions.map((e) => (
        <Explosion key={e.id} position={e.position} onComplete={() => removeExplosion(e.id)} />
      ))}
      {popups.map((p) => (
        <ScorePopup
          key={p.id}
          position={p.position}
          amount={p.amount}
          onComplete={() => removePopup(p.id)}
        />
      ))}
    </>
  );
};
