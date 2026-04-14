import { useRef, useMemo } from "react";
import { useFrame, useLoader } from "@react-three/fiber";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import * as THREE from "three";
import { useGameStore } from "../stores/gameStore";
import { extractSubmeshes } from "../systems/modelUtils";
import { createVaporwaveMaterial, updateVaporwaveTime } from "../systems/vaporwaveMaterial";

const DUMMY = new THREE.Object3D();
const MAX_PER_TYPE = 30;
const MAX_CHARGE = 10;
const WHITE = new THREE.Color("#ffffff");
const tempColor = new THREE.Color();

// Target sizes (normalized, in world units)
const DRONE_SIZE = 1.2;
const FIGHTER_SIZE = 1.6;
const TANK_SIZE = 2.4;

// Type tints — applied as instanceColor multiplier. Kept light so per-submesh
// material colors still read through. Flash overrides to pure white.
const DRONE_TINT = new THREE.Color("#aaffcc");
const FIGHTER_TINT = new THREE.Color("#ffaacc");
const TANK_TINT = new THREE.Color("#ffccaa");

// 2-entry palettes per enemy type — kept small so enemies stay cheap to render.
// First entry is the dominant identity; second is an accent for contrast.
const DRONE_PALETTE = [
  { baseColor: "#88cc99", topTint: "#44ff88", bottomTint: "#00ffcc" },
  { baseColor: "#aadd77", topTint: "#ccff44", bottomTint: "#88ffaa" },
];
const FIGHTER_PALETTE = [
  { baseColor: "#cc5577", topTint: "#ff4488", bottomTint: "#ff0055" },
  { baseColor: "#aa4488", topTint: "#cc44ff", bottomTint: "#ff66cc" },
];
const TANK_PALETTE = [
  { baseColor: "#cc8855", topTint: "#ffaa33", bottomTint: "#ff5500" },
  { baseColor: "#aa6644", topTint: "#ffcc66", bottomTint: "#cc8844" },
];

type EnemyLike = { position: [number, number, number]; flashTimer: number };

// Writes matrices + instance colors across every part-ref of one enemy type.
// Each part shares the same transform but has its own material, giving the
// enemy visible color blocks without extra per-entity logic.
function updateTypeRefs(
  refs: (THREE.InstancedMesh | null)[],
  entities: EnemyLike[],
  tint: THREE.Color,
) {
  for (const ref of refs) {
    if (!ref) continue;
    for (let i = 0; i < MAX_PER_TYPE; i++) {
      if (i < entities.length) {
        const e = entities[i];
        DUMMY.position.set(e.position[0], e.position[1], e.position[2]);
        DUMMY.rotation.set(0, Math.PI, 0);
        DUMMY.scale.set(1, 1, 1);
        DUMMY.updateMatrix();
        ref.setMatrixAt(i, DUMMY.matrix);
        tempColor.copy(e.flashTimer > 0 ? WHITE : tint);
        ref.setColorAt(i, tempColor);
      } else {
        DUMMY.scale.set(0, 0, 0);
        DUMMY.updateMatrix();
        ref.setMatrixAt(i, DUMMY.matrix);
      }
    }
    ref.instanceMatrix.needsUpdate = true;
    if (ref.instanceColor) ref.instanceColor.needsUpdate = true;
  }
}

type Part = { geometry: THREE.BufferGeometry; material: THREE.Material };

function buildParts(
  geos: THREE.BufferGeometry[],
  palette: { baseColor: string; topTint: string; bottomTint: string }[],
  emissiveIntensity: number,
  fallback: THREE.BufferGeometry,
): Part[] {
  const source = geos.length ? geos : [fallback];
  return source.map((geometry, i) => ({
    geometry,
    material: createVaporwaveMaterial({
      ...palette[i % palette.length],
      emissiveIntensity,
    }),
  }));
}

export const EnemyRenderer = () => {
  const droneRefs = useRef<(THREE.InstancedMesh | null)[]>([]);
  const fighterRefs = useRef<(THREE.InstancedMesh | null)[]>([]);
  const tankRefs = useRef<(THREE.InstancedMesh | null)[]>([]);
  const tankChargeRef = useRef<THREE.InstancedMesh>(null);

  const enemyGltf = useLoader(GLTFLoader, "/models/enemies/scene.gltf");
  const tankGltf = useLoader(GLTFLoader, "/models/player/scene.gltf");
  const droneGltf = useLoader(GLTFLoader, "/models/drone/scene.gltf");

  const droneParts = useMemo(
    () =>
      buildParts(
        extractSubmeshes(droneGltf.scene, DRONE_SIZE, 2),
        DRONE_PALETTE,
        0.85,
        new THREE.OctahedronGeometry(DRONE_SIZE / 2, 0),
      ),
    [droneGltf],
  );

  const fighterParts = useMemo(
    () =>
      buildParts(
        extractSubmeshes(enemyGltf.scene, FIGHTER_SIZE, 2, "Hotrod"),
        FIGHTER_PALETTE,
        0.95,
        new THREE.ConeGeometry(FIGHTER_SIZE / 2, FIGHTER_SIZE, 5),
      ),
    [enemyGltf],
  );

  const tankParts = useMemo(
    () =>
      buildParts(
        extractSubmeshes(tankGltf.scene, TANK_SIZE, 2),
        TANK_PALETTE,
        0.9,
        new THREE.BoxGeometry(TANK_SIZE, TANK_SIZE, TANK_SIZE * 0.7),
      ),
    [tankGltf],
  );

  useFrame((state) => {
    updateVaporwaveTime(state.clock.elapsedTime);
    const enemies = useGameStore.getState().enemies;

    const drones = enemies.filter((e) => e.type === "drone");
    const fighters = enemies.filter((e) => e.type === "fighter");
    const tanks = enemies.filter((e) => e.type === "tank");

    updateTypeRefs(droneRefs.current, drones, DRONE_TINT);
    updateTypeRefs(fighterRefs.current, fighters, FIGHTER_TINT);
    updateTypeRefs(tankRefs.current, tanks, TANK_TINT);

    // Tank charge overlay — rendered as a separate pulsing sphere instance.
    if (tankChargeRef.current) {
      let chargeIdx = 0;
      for (const e of tanks) {
        if (e.state === "charging" && chargeIdx < MAX_CHARGE) {
          const s = 0.3 + e.stateTimer * 0.5;
          DUMMY.position.set(e.position[0], e.position[1], e.position[2] + 0.5);
          DUMMY.rotation.set(0, 0, 0);
          DUMMY.scale.set(s, s, s);
          DUMMY.updateMatrix();
          tankChargeRef.current.setMatrixAt(chargeIdx, DUMMY.matrix);
          chargeIdx++;
        }
      }
      for (let i = chargeIdx; i < MAX_CHARGE; i++) {
        DUMMY.scale.set(0, 0, 0);
        DUMMY.updateMatrix();
        tankChargeRef.current.setMatrixAt(i, DUMMY.matrix);
      }
      tankChargeRef.current.instanceMatrix.needsUpdate = true;
    }
  });

  return (
    <>
      {droneParts.map((part, i) => (
        <instancedMesh
          key={`drone-${i}`}
          ref={(el) => {
            droneRefs.current[i] = el;
          }}
          args={[part.geometry, part.material, MAX_PER_TYPE]}
        />
      ))}
      {fighterParts.map((part, i) => (
        <instancedMesh
          key={`fighter-${i}`}
          ref={(el) => {
            fighterRefs.current[i] = el;
          }}
          args={[part.geometry, part.material, MAX_PER_TYPE]}
        />
      ))}
      {tankParts.map((part, i) => (
        <instancedMesh
          key={`tank-${i}`}
          ref={(el) => {
            tankRefs.current[i] = el;
          }}
          args={[part.geometry, part.material, MAX_PER_TYPE]}
        />
      ))}

      <instancedMesh ref={tankChargeRef} args={[undefined, undefined, MAX_CHARGE]}>
        <sphereGeometry args={[1, 8, 8]} />
        <meshStandardMaterial
          color="#ff0000"
          emissive="#ff0000"
          emissiveIntensity={3}
          transparent
          opacity={0.5}
          toneMapped={false}
        />
      </instancedMesh>
    </>
  );
};
