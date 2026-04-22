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

// Type tints — multiplied with the material color per-instance. Kept near-white
// so the dark material bases drive the look. Flash overrides to pure white.
const DRONE_TINT = new THREE.Color("#eeeeee");
const FIGHTER_TINT = new THREE.Color("#eeeeee");
const TANK_TINT = new THREE.Color("#eeeeee");

// Facet-mode palettes: three tints per submesh driven by the world-space
// normal axes. X = side faces, Y = top/bottom, Z = front/back. Each enemy
// type keeps an identity family (cyan-green for drones, pink-purple for
// fighters, orange-amber for tanks) while letting each facet read distinct.
// Drones get a chrome/silver palette so fighters and tanks keep the
// saturated vaporwave identity. High value-range (dark shadows → bright
// highlights) plus a subtle cool/warm shift per submesh makes them read
// as polished metal instead of a flat color block.
const DRONE_PALETTE = [
  {
    baseColor: "#000000",
    facetTintX: "#7a8598", // steel sides
    facetTintY: "#f0f4f8", // bright platinum top
    facetTintZ: "#2a3340", // deep chrome shadow (front/back)
  },
  {
    baseColor: "#000000",
    facetTintX: "#aab4c2", // light chrome sides
    facetTintY: "#d8e4f0", // cool silver top
    facetTintZ: "#3a4050", // cold steel shadow
  },
];
const FIGHTER_PALETTE = [
  {
    baseColor: "#000000",
    facetTintX: "#ff4488",
    facetTintY: "#cc44ff",
    facetTintZ: "#ff8866",
  },
  {
    baseColor: "#000000",
    facetTintX: "#ff2266",
    facetTintY: "#aa44ff",
    facetTintZ: "#ff66aa",
  },
];
const TANK_PALETTE = [
  {
    baseColor: "#000000",
    facetTintX: "#ffaa33",
    facetTintY: "#ffee66",
    facetTintZ: "#ff6644",
  },
  {
    baseColor: "#000000",
    facetTintX: "#ff8844",
    facetTintY: "#ffcc44",
    facetTintZ: "#ff5566",
  },
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
        // Face the camera (+Z) with a nose-down, tail-up dive pose so the
        // top of the hull reads toward the player — more aggressive and
        // exposes more facet variation than the flat tail view.
        DUMMY.rotation.set(0.22, 0, 0);
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

// Converts a smooth-shaded geometry to flat shading so each triangle has its
// own face normal. The vaporwave facet shader maps normal → color, so flat
// normals make each face read as a distinct tint (gemstone/matcap look)
// instead of the interpolated smooth-shaded wash from the original GLTF.
function toFlatShaded(geo: THREE.BufferGeometry): THREE.BufferGeometry {
  const flat = geo.toNonIndexed();
  flat.computeVertexNormals();
  return flat;
}

function buildParts(
  geos: THREE.BufferGeometry[],
  palette: {
    baseColor: string;
    facetTintX: string;
    facetTintY: string;
    facetTintZ: string;
  }[],
  emissiveIntensity: number,
  fallback: THREE.BufferGeometry,
): Part[] {
  const source = geos.length ? geos : [fallback];
  return source.map((geometry, i) => ({
    geometry: toFlatShaded(geometry),
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
        1.0,
        new THREE.OctahedronGeometry(DRONE_SIZE / 2, 0),
      ),
    [droneGltf],
  );

  const fighterParts = useMemo(
    () =>
      buildParts(
        extractSubmeshes(enemyGltf.scene, FIGHTER_SIZE, 2, "Hotrod"),
        FIGHTER_PALETTE,
        1.0,
        new THREE.ConeGeometry(FIGHTER_SIZE / 2, FIGHTER_SIZE, 5),
      ),
    [enemyGltf],
  );

  const tankParts = useMemo(
    () =>
      buildParts(
        extractSubmeshes(tankGltf.scene, TANK_SIZE, 2),
        TANK_PALETTE,
        1.0,
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
