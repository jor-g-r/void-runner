import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { InstancedMesh, Object3D, OctahedronGeometry } from "three";
import { useGameStore } from "../stores/gameStore";
import { createVaporwaveMaterial, updateVaporwaveTime } from "../systems/vaporwaveMaterial";

const DUMMY = new Object3D();
const MAX_PICKUPS = 30;
const DRIFT_SPEED = 20;
const MAGNET_RADIUS = 8;
const MAGNET_RADIUS_UPGRADED = 20;
const MAGNET_SPEED = 25;
const COLLECT_RADIUS = 1.5;

export const PickupRenderer = () => {
  const meshRef = useRef<InstancedMesh>(null);
  const material = useMemo(
    () =>
      createVaporwaveMaterial({
        baseColor: "#6a4008",
        facetTintX: "#ffb300",
        facetTintY: "#fff45f",
        facetTintZ: "#e36b00",
        emissiveIntensity: 2.0,
        scanSpeed: 0.55,
        fresnelPower: 1.6,
      }),
    [],
  );
  const geometry = useMemo(() => {
    const octahedron = new OctahedronGeometry(0.5, 0).toNonIndexed();
    octahedron.computeVertexNormals();
    return octahedron;
  }, []);
  const bobPhases = useRef<number[]>(
    Array.from({ length: MAX_PICKUPS }, (_, index) => (index / MAX_PICKUPS) * Math.PI * 2),
  );

  useFrame((_state, rawDelta) => {
    const delta = Math.min(rawDelta, 0.1);
    updateVaporwaveTime(_state.clock.elapsedTime);
    const gameState = useGameStore.getState();
    if (!meshRef.current) return;

    const pickups = gameState.pickups;
    const [px, py] = gameState.playerPosition;
    const magnetR = gameState.upgrades.includes("magnet") ? MAGNET_RADIUS_UPGRADED : MAGNET_RADIUS;

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
        DUMMY.rotation.set(0, bobPhases.current[i], 0);
        DUMMY.scale.multiplyScalar(
          1 + Math.sin(_state.clock.elapsedTime * 4 + bobPhases.current[i]) * 0.08,
        );
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
      <primitive object={geometry} attach="geometry" />
      <primitive object={material} attach="material" />
    </instancedMesh>
  );
};
