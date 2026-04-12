import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { InstancedMesh, Object3D } from "three";
import { useGameStore } from "../stores/gameStore";
import { checkCollision } from "../systems/collisions";

const DUMMY = new Object3D();
const MAX_PLAYER_PROJ = 100;
const MAX_ENEMY_PROJ = 60;
const PLAYER_RADIUS = 0.6;

export const ProjectileManager = () => {
  const playerMeshRef = useRef<InstancedMesh>(null);
  const enemyMeshRef = useRef<InstancedMesh>(null);
  const chargedMeshRef = useRef<InstancedMesh>(null);
  const tick = useGameStore((s) => s.tick);
  const phase = useGameStore((s) => s.phase);

  useFrame((_state, delta) => {
    if (phase !== "playing") return;

    // Advance game time and update all projectile positions
    tick(delta);

    const state = useGameStore.getState();
    const playerProj = state.playerProjectiles;
    const enemyProj = state.enemyProjectiles;

    // --- Check enemy projectiles vs player ---
    const [px, py] = state.playerPosition;
    const playerPos: [number, number, number] = [px, py, 0];

    for (const proj of enemyProj) {
      if (checkCollision(proj.position, 0.3, playerPos, PLAYER_RADIUS)) {
        state.damagePlayer();
        // Remove this projectile
        useGameStore.setState({
          enemyProjectiles: state.enemyProjectiles.filter((p) => p.id !== proj.id),
        });
        break; // Only take one hit per frame
      }
    }

    // --- Render player projectiles ---
    if (playerMeshRef.current) {
      const normal = playerProj.filter((p) => !p.isCharged);
      for (let i = 0; i < MAX_PLAYER_PROJ; i++) {
        if (i < normal.length) {
          DUMMY.position.set(normal[i].position[0], normal[i].position[1], normal[i].position[2]);
          DUMMY.scale.set(1, 1, 1);
        } else {
          DUMMY.scale.set(0, 0, 0);
        }
        DUMMY.updateMatrix();
        playerMeshRef.current.setMatrixAt(i, DUMMY.matrix);
      }
      playerMeshRef.current.instanceMatrix.needsUpdate = true;
    }

    // --- Render charged shots ---
    if (chargedMeshRef.current) {
      const charged = playerProj.filter((p) => p.isCharged);
      for (let i = 0; i < 5; i++) {
        if (i < charged.length) {
          DUMMY.position.set(charged[i].position[0], charged[i].position[1], charged[i].position[2]);
          DUMMY.scale.set(1, 1, 1);
        } else {
          DUMMY.scale.set(0, 0, 0);
        }
        DUMMY.updateMatrix();
        chargedMeshRef.current.setMatrixAt(i, DUMMY.matrix);
      }
      chargedMeshRef.current.instanceMatrix.needsUpdate = true;
    }

    // --- Render enemy projectiles ---
    if (enemyMeshRef.current) {
      const eProj = useGameStore.getState().enemyProjectiles;
      for (let i = 0; i < MAX_ENEMY_PROJ; i++) {
        if (i < eProj.length) {
          DUMMY.position.set(eProj[i].position[0], eProj[i].position[1], eProj[i].position[2]);
          DUMMY.scale.set(1, 1, 1);
        } else {
          DUMMY.scale.set(0, 0, 0);
        }
        DUMMY.updateMatrix();
        enemyMeshRef.current.setMatrixAt(i, DUMMY.matrix);
      }
      enemyMeshRef.current.instanceMatrix.needsUpdate = true;
    }
  });

  return (
    <>
      {/* Player normal projectiles — cyan */}
      <instancedMesh ref={playerMeshRef} args={[undefined, undefined, MAX_PLAYER_PROJ]}>
        <boxGeometry args={[0.08, 0.08, 0.6]} />
        <meshStandardMaterial
          color="#00ddff"
          emissive="#00ddff"
          emissiveIntensity={3}
          toneMapped={false}
        />
      </instancedMesh>

      {/* Charged shots — larger, bright white-cyan */}
      <instancedMesh ref={chargedMeshRef} args={[undefined, undefined, 5]}>
        <sphereGeometry args={[0.5, 12, 12]} />
        <meshStandardMaterial
          color="#aaffff"
          emissive="#00ffff"
          emissiveIntensity={5}
          toneMapped={false}
        />
      </instancedMesh>

      {/* Enemy projectiles — red/orange */}
      <instancedMesh ref={enemyMeshRef} args={[undefined, undefined, MAX_ENEMY_PROJ]}>
        <sphereGeometry args={[0.12, 6, 6]} />
        <meshStandardMaterial
          color="#ff4400"
          emissive="#ff2200"
          emissiveIntensity={3}
          toneMapped={false}
        />
      </instancedMesh>
    </>
  );
};
