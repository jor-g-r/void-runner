import { useRef, useMemo } from "react";
import { useFrame, useLoader } from "@react-three/fiber";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import * as THREE from "three";
import type { Group } from "three";
import { useGameStore } from "../stores/gameStore";
import { checkCollision } from "../systems/collisions";
import { spawnWave as spawnWaveFunc } from "../systems/timeline";
import { LEVEL_WAVES } from "../data/waves";
import { extractGroupByName } from "../systems/modelUtils";
import { createVaporwaveMaterial } from "../systems/vaporwaveMaterial";

// Darker, menacing vaporwave palette — deep violet, hot magenta, abyssal blue.
// Cycled per submesh to give the boss silhouette color variation.
const BOSS_PALETTE = [
  { baseColor: "#280033", topTint: "#ff33cc", bottomTint: "#6600ff" }, // deep violet
  { baseColor: "#330022", topTint: "#cc33ff", bottomTint: "#ff0066" }, // hot magenta
  { baseColor: "#0a1144", topTint: "#3366ff", bottomTint: "#6633cc" }, // abyssal blue
  { baseColor: "#1a0033", topTint: "#ff66cc", bottomTint: "#9933ff" }, // orchid
];

const BOSS_HP = 50;
const WEAK_POINT_RADIUS = 1.2;
const BOSS_Z = -30;
const ENTRY_SPEED = 5;

// Phase 1: spreads + drone spawns
const P1_FIRE_INTERVAL = 2;
const P1_SPAWN_INTERVAL = 5;

// Phase 2: tracking missiles + laser sweep
const P2_FIRE_INTERVAL = 1.5;

interface BossState {
  active: boolean;
  hp: number;
  phase: 1 | 2;
  position: [number, number, number];
  entering: boolean;
  fireTimer: number;
  spawnTimer: number;
  weakPointPulse: number;
  flashTimer: number;
}

const INITIAL_BOSS: BossState = {
  active: false,
  hp: BOSS_HP,
  phase: 1,
  position: [0, 0, -60],
  entering: true,
  fireTimer: 0,
  spawnTimer: 0,
  weakPointPulse: 0,
  flashTimer: 0,
};

export const Boss = () => {
  const groupRef = useRef<Group>(null);
  const bossState = useRef<BossState>({ ...INITIAL_BOSS });
  const lastResetTime = useRef(-1);

  const gltf = useLoader(GLTFLoader, "/models/boss/scene.gltf");
  const model = useMemo(() => {
    const group = extractGroupByName(gltf.scene, "ROVTex", 8);
    if (!group) return null;
    let meshIdx = 0;
    group.traverse((child) => {
      const mesh = child as THREE.Mesh;
      if (!mesh.isMesh) return;
      const palette = BOSS_PALETTE[meshIdx % BOSS_PALETTE.length];
      mesh.material = createVaporwaveMaterial({
        ...palette,
        emissiveIntensity: 1.1,
        scanSpeed: 0.8,
        fresnelPower: 2,
      });
      meshIdx++;
    });
    return group;
  }, [gltf]);

  useFrame((_state, rawDelta) => {
    const delta = Math.min(rawDelta, 0.1);
    const state = useGameStore.getState();
    if (state.phase !== "playing" || !groupRef.current) return;

    const bs = bossState.current;

    // Reset on new game
    if (state.time < 1 && lastResetTime.current !== 0) {
      Object.assign(bs, { ...INITIAL_BOSS });
      lastResetTime.current = 0;
      groupRef.current.visible = false;
      return;
    }

    // Activate boss after all waves are done
    const allWavesSpawned = state.waveIndex >= LEVEL_WAVES.length;
    if (!bs.active && allWavesSpawned && state.enemies.length === 0) {
      bs.active = true;
      bs.entering = true;
      bs.position = [0, 0, -60];
      groupRef.current.visible = true;
    }

    if (!bs.active) {
      groupRef.current.visible = false;
      return;
    }

    // --- Entry animation ---
    if (bs.entering) {
      bs.position[2] += ENTRY_SPEED * delta;
      if (bs.position[2] >= BOSS_Z) {
        bs.position[2] = BOSS_Z;
        bs.entering = false;
      }
      groupRef.current.position.set(bs.position[0], bs.position[1], bs.position[2]);
      return;
    }

    // --- Check projectile hits on weak point ---
    const projectiles = state.playerProjectiles;
    const hitIds = new Set<string>();
    let damage = 0;

    for (const proj of projectiles) {
      const projRadius = proj.isCharged ? (proj.radius ?? 1.5) : 0.2;
      if (checkCollision(proj.position, projRadius, bs.position, WEAK_POINT_RADIUS)) {
        damage += proj.isCharged ? 5 : 1;
        if (!proj.isCharged) hitIds.add(proj.id);
      }
    }

    if (damage > 0) {
      bs.hp -= damage;
      bs.flashTimer = 0.1;
      state.requestShake(0.03, 0.08);
      state.addScore(damage * 50);

      if (hitIds.size > 0) {
        useGameStore.setState({
          playerProjectiles: projectiles.filter((p) => !hitIds.has(p.id)),
        });
      }
    }

    // Phase transition
    if (bs.phase === 1 && bs.hp <= BOSS_HP / 2) {
      bs.phase = 2;
      bs.fireTimer = 0;
      bs.spawnTimer = 0;
      state.requestShake(0.1, 0.3);
    }

    // Boss defeated
    if (bs.hp <= 0) {
      bs.active = false;
      groupRef.current.visible = false;
      state.requestShake(0.2, 0.5);
      state.addScore(5000);
      useGameStore.setState({ phase: "victory" });
      return;
    }

    // --- Boss AI ---
    bs.fireTimer += delta;
    bs.spawnTimer += delta;
    bs.weakPointPulse += delta * 3;
    bs.flashTimer = Math.max(0, bs.flashTimer - delta);

    // Gentle sway
    bs.position[0] = Math.sin(state.time * 0.5) * 3;
    bs.position[1] = Math.cos(state.time * 0.7) * 1.5;

    const [px, py] = state.playerPosition;

    if (bs.phase === 1) {
      // Triple spread shots
      if (bs.fireTimer >= P1_FIRE_INTERVAL) {
        bs.fireTimer = 0;
        for (let i = -1; i <= 1; i++) {
          state.fireEnemyProjectile(
            [bs.position[0] + i * 2, bs.position[1], bs.position[2]],
            [(px - bs.position[0]) * 0.3 + i * 5, (py - bs.position[1]) * 0.3, 35],
          );
        }
      }

      // Spawn drones
      if (bs.spawnTimer >= P1_SPAWN_INTERVAL) {
        bs.spawnTimer = 0;
        const drones = spawnWaveFunc(
          ["drone", "drone"],
          "line" as const,
          Math.random() < 0.5 ? "left" as const : "right" as const,
        );
        for (const d of drones) {
          d.position[2] = bs.position[2];
          state.spawnEnemy(d);
        }
      }
    } else {
      // Phase 2: faster fire, tracking projectiles
      if (bs.fireTimer >= P2_FIRE_INTERVAL) {
        bs.fireTimer = 0;
        // Aimed tracking shots
        const dirX = px - bs.position[0];
        const dirY = py - bs.position[1];
        const len = Math.sqrt(dirX * dirX + dirY * dirY + 900);
        const speed = 40;
        state.fireEnemyProjectile(
          [bs.position[0] - 3, bs.position[1], bs.position[2]],
          [(dirX / len) * speed, (dirY / len) * speed, speed],
        );
        state.fireEnemyProjectile(
          [bs.position[0] + 3, bs.position[1], bs.position[2]],
          [(dirX / len) * speed, (dirY / len) * speed, speed],
        );

        // Wide sweep every 3rd shot
        if (Math.floor(bs.fireTimer * 10) % 3 === 0) {
          for (let i = -3; i <= 3; i++) {
            state.fireEnemyProjectile(
              [bs.position[0] + i * 1.5, bs.position[1], bs.position[2]],
              [i * 4, 0, 30],
            );
          }
        }
      }
    }

    // Update visual
    groupRef.current.position.set(bs.position[0], bs.position[1], bs.position[2]);
    groupRef.current.rotation.y += delta * 0.2;
  });

  const bs = bossState.current;

  return (
    <group ref={groupRef} visible={false}>
      {model && <primitive object={model} rotation={[0, Math.PI, 0]} />}

      {/* Weak point — glowing core */}
      <mesh position={[0, 0, 1]}>
        <sphereGeometry args={[0.6, 12, 12]} />
        <meshStandardMaterial
          color={bs.flashTimer > 0 ? "#ffffff" : "#ff00ff"}
          emissive={bs.flashTimer > 0 ? "#ffffff" : "#ff00ff"}
          emissiveIntensity={3 + Math.sin(bs.weakPointPulse) * 1.5}
          toneMapped={false}
        />
      </mesh>

      {/* HP indicator ring */}
      <mesh position={[0, -2.5, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[2, 2.2, 32, 1, 0, (bs.hp / BOSS_HP) * Math.PI * 2]} />
        <meshBasicMaterial color="#ff00ff" transparent opacity={0.5} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
};
