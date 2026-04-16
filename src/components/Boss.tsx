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
import { playSfx } from "../systems/audio";

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

  // Refs for visual feedback that needs to mutate every frame.
  // (Component never re-renders; refs are the only way to animate.)
  const weakPointMatRef = useRef<THREE.MeshStandardMaterial>(null);
  const haloRef = useRef<THREE.Mesh>(null);
  const haloMatRef = useRef<THREE.MeshBasicMaterial>(null);
  const hpBarRef = useRef<THREE.Mesh>(null);

  const lastTime = useRef(0);

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

    // Reset on new game: detect when game time goes backwards (startGame()
    // resets state.time to 0). The Boss component never unmounts, so its
    // bossState ref otherwise persists between runs.
    if (state.time < lastTime.current) {
      Object.assign(bs, { ...INITIAL_BOSS });
      groupRef.current.visible = false;
      lastTime.current = state.time;
      return;
    }
    lastTime.current = state.time;

    // Activate boss after all waves are done
    const allWavesSpawned = state.waveIndex >= LEVEL_WAVES.length;
    if (!bs.active && allWavesSpawned && state.enemies.length === 0) {
      bs.active = true;
      bs.entering = true;
      bs.position = [0, 0, -60];
      groupRef.current.visible = true;
      playSfx("boss");
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
      bs.flashTimer = 0.18;
      state.requestShake(0.08, 0.15);
      state.addScore(damage * 50);
      playSfx("hit");

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
          Math.random() < 0.5 ? ("left" as const) : ("right" as const),
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

    // Update visual transforms
    groupRef.current.position.set(bs.position[0], bs.position[1], bs.position[2]);
    groupRef.current.rotation.y += delta * 0.2;

    // Animate weak point: pulse + white flash on hit
    const flashing = bs.flashTimer > 0;
    const wpMat = weakPointMatRef.current;
    if (wpMat) {
      wpMat.emissiveIntensity = flashing ? 8 : 3 + Math.sin(bs.weakPointPulse) * 1.5;
      const targetHex = flashing ? 0xffffff : 0xff00ff;
      wpMat.color.setHex(targetHex);
      wpMat.emissive.setHex(targetHex);
    }

    // Animate hit halo: expand + fade out across the flash window
    if (haloRef.current && haloMatRef.current) {
      if (flashing) {
        const t = 1 - bs.flashTimer / 0.18;
        const scale = 1 + t * 2.5;
        haloRef.current.scale.setScalar(scale);
        haloMatRef.current.opacity = 0.7 * (1 - t);
        haloRef.current.visible = true;
      } else {
        haloRef.current.visible = false;
      }
    }

    // Animate HP bar: shrink rightward (anchor left edge at x=-2.5)
    if (hpBarRef.current) {
      const s = Math.max(0, bs.hp / BOSS_HP);
      hpBarRef.current.scale.x = s;
      hpBarRef.current.position.x = -2.5 * (1 - s);
    }
  });

  return (
    <group ref={groupRef} visible={false}>
      {model && <primitive object={model} rotation={[0, Math.PI, 0]} />}

      {/* Weak point — glowing core */}
      <mesh position={[0, 0, 1]}>
        <sphereGeometry args={[0.6, 12, 12]} />
        <meshStandardMaterial
          ref={weakPointMatRef}
          color="#ff00ff"
          emissive="#ff00ff"
          emissiveIntensity={3}
          toneMapped={false}
        />
      </mesh>

      {/* Hit halo — expanding white ring on damage */}
      <mesh ref={haloRef} position={[0, 0, 1]} visible={false}>
        <sphereGeometry args={[0.7, 16, 16]} />
        <meshBasicMaterial
          ref={haloMatRef}
          color="#ffffff"
          transparent
          opacity={0.7}
          toneMapped={false}
        />
      </mesh>

      {/* HP bar — fill scales rightward as boss takes damage */}
      <group position={[0, -2.5, 0]}>
        <mesh>
          <planeGeometry args={[5, 0.18]} />
          <meshBasicMaterial color="#330033" transparent opacity={0.6} side={THREE.DoubleSide} />
        </mesh>
        <mesh ref={hpBarRef} position={[0, 0, 0.01]}>
          <planeGeometry args={[5, 0.18]} />
          <meshBasicMaterial color="#ff00ff" transparent opacity={0.85} side={THREE.DoubleSide} />
        </mesh>
      </group>
    </group>
  );
};
