import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { AdditiveBlending, InstancedMesh, Object3D, Vector3 } from "three";
import { useGameStore } from "../stores/gameStore";
import { checkCollision } from "../systems/collisions";
import { createChargeMaterial, updateChargeMaterial } from "../systems/chargeMaterial";

const DUMMY = new Object3D();
const ENEMY_BEAM_AXIS = new Vector3(0, 1, 0);
const ENEMY_BEAM_DIRECTION = new Vector3();
const MAX_PLAYER_PROJ = 100;
const MAX_ENEMY_PROJ = 60;
const PLAYER_RADIUS = 0.6;

export const ProjectileManager = () => {
  const playerMeshRef = useRef<InstancedMesh>(null);
  const enemyGlowRef = useRef<InstancedMesh>(null);
  const enemyCoreRef = useRef<InstancedMesh>(null);
  const chargedMeshRef = useRef<InstancedMesh>(null);
  const chargedShotMaterial = useMemo(() => createChargeMaterial(), []);
  const tick = useGameStore((s) => s.tick);
  const phase = useGameStore((s) => s.phase);

  useFrame((_state, delta) => {
    if (phase !== "playing") return;
    updateChargeMaterial(chargedShotMaterial, _state.clock.elapsedTime, 1);

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
        state.damagePlayer(30);
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
          DUMMY.quaternion.identity();
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
          DUMMY.position.set(
            charged[i].position[0],
            charged[i].position[1],
            charged[i].position[2],
          );
          DUMMY.quaternion.identity();
          const pulse = 1 + Math.sin(_state.clock.elapsedTime * 18) * 0.06;
          DUMMY.scale.setScalar(pulse);
        } else {
          DUMMY.scale.set(0, 0, 0);
        }
        DUMMY.updateMatrix();
        chargedMeshRef.current.setMatrixAt(i, DUMMY.matrix);
      }
      chargedMeshRef.current.instanceMatrix.needsUpdate = true;
    }

    // --- Render enemy projectiles ---
    if (enemyGlowRef.current && enemyCoreRef.current) {
      const eProj = useGameStore.getState().enemyProjectiles;
      for (let i = 0; i < MAX_ENEMY_PROJ; i++) {
        let beamLength = 0;
        if (i < eProj.length) {
          const projectile = eProj[i];
          DUMMY.position.set(
            projectile.position[0],
            projectile.position[1],
            projectile.position[2],
          );
          ENEMY_BEAM_DIRECTION.set(
            projectile.velocity[0],
            projectile.velocity[1],
            projectile.velocity[2],
          );
          const speed = ENEMY_BEAM_DIRECTION.length();
          if (speed > 0) ENEMY_BEAM_DIRECTION.multiplyScalar(1 / speed);
          else ENEMY_BEAM_DIRECTION.set(0, 0, 1);
          DUMMY.quaternion.setFromUnitVectors(ENEMY_BEAM_AXIS, ENEMY_BEAM_DIRECTION);

          beamLength = 0.9 + Math.min(speed / 40, 1) * 0.5;
          const pulse = 1 + Math.sin(_state.clock.elapsedTime * 14 + i) * 0.06;
          DUMMY.scale.set(pulse, beamLength * 1.25, pulse);
        } else {
          DUMMY.scale.set(0, 0, 0);
        }
        DUMMY.updateMatrix();
        enemyGlowRef.current.setMatrixAt(i, DUMMY.matrix);

        if (i < eProj.length) {
          DUMMY.scale.set(0.42, beamLength * 0.9, 0.42);
        } else {
          DUMMY.scale.set(0, 0, 0);
        }
        DUMMY.updateMatrix();
        enemyCoreRef.current.setMatrixAt(i, DUMMY.matrix);
      }
      enemyGlowRef.current.instanceMatrix.needsUpdate = true;
      enemyCoreRef.current.instanceMatrix.needsUpdate = true;
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
        <sphereGeometry args={[0.65, 20, 20]} />
        <primitive object={chargedShotMaterial} attach="material" />
      </instancedMesh>

      {/* Enemy laser glow */}
      <instancedMesh ref={enemyGlowRef} args={[undefined, undefined, MAX_ENEMY_PROJ]}>
        <cylinderGeometry args={[0.12, 0.12, 1, 8]} />
        <meshBasicMaterial
          color="#ff101a"
          transparent
          opacity={0.38}
          blending={AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </instancedMesh>

      {/* Enemy laser hot core */}
      <instancedMesh ref={enemyCoreRef} args={[undefined, undefined, MAX_ENEMY_PROJ]}>
        <cylinderGeometry args={[0.055, 0.055, 1, 6]} />
        <meshBasicMaterial color="#ff7b68" toneMapped={false} />
      </instancedMesh>
    </>
  );
};
