import { useRef, useMemo } from "react";
import { useFrame, useLoader } from "@react-three/fiber";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { useGameStore } from "../stores/gameStore";
import { extractMaterialSubmeshes, extractSubmeshes } from "../systems/modelUtils";
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
const ENEMY_ROTATIONS: Record<EnemyLike["type"], [number, number, number]> = {
  drone: [0.31634705, -0.01430786, 0],
  fighter: [0.34536462, -0.31945801, 0.05423828],
  tank: [0.020625, 1.73614258, -0.03024963],
};

// Type tints — multiplied with the material color per-instance. Kept near-white
// so the dark material bases drive the look. Flash overrides to pure white.
const DRONE_TINT = new THREE.Color("#eeeeee");
const FIGHTER_TINT = new THREE.Color("#eeeeee");
const TANK_TINT = new THREE.Color("#eeeeee");

// Small drones use the GLTF's semantic materials for the hull, canopy, and
// lights. The three larger enemies keep quieter facet palettes so the player
// ship remains the brightest and most colorful craft on screen.
const DRONE_PART_PALETTES: Record<
  string,
  {
    baseColor: string;
    facetTintX: string;
    facetTintY: string;
    facetTintZ: string;
    emissiveIntensity: number;
  }
> = {
  blocker: {
    baseColor: "#080d14",
    facetTintX: "#263443",
    facetTintY: "#394959",
    facetTintZ: "#121923",
    emissiveIntensity: 0.5,
  },
  body: {
    baseColor: "#10151e",
    facetTintX: "#485767",
    facetTintY: "#718190",
    facetTintZ: "#252e3b",
    emissiveIntensity: 0.62,
  },
  glass: {
    baseColor: "#02070e",
    facetTintX: "#07111b",
    facetTintY: "#142635",
    facetTintZ: "#03080d",
    emissiveIntensity: 0.3,
  },
  headlight: {
    baseColor: "#06212b",
    facetTintX: "#105064",
    facetTintY: "#247384",
    facetTintZ: "#0b3544",
    emissiveIntensity: 0.42,
  },
  tailight: {
    baseColor: "#271015",
    facetTintX: "#642c32",
    facetTintY: "#87413e",
    facetTintZ: "#3e1b22",
    emissiveIntensity: 0.4,
  },
};
const FIGHTER_PALETTE = [
  {
    baseColor: "#000000",
    facetTintX: "#533d56",
    facetTintY: "#705d78",
    facetTintZ: "#302638",
  },
  {
    baseColor: "#000000",
    facetTintX: "#604267",
    facetTintY: "#7e6985",
    facetTintZ: "#392b43",
  },
];
const TANK_PALETTE = [
  {
    baseColor: "#000000",
    facetTintX: "#594733",
    facetTintY: "#796340",
    facetTintZ: "#352a28",
  },
  {
    baseColor: "#000000",
    facetTintX: "#66503a",
    facetTintY: "#826b48",
    facetTintZ: "#40332e",
  },
];

type EnemyLike = {
  type: "drone" | "fighter" | "tank";
  position: [number, number, number];
  flashTimer: number;
  state?: string;
  stateTimer?: number;
  rotationX?: number;
  rotationY?: number;
  rotationZ?: number;
};

// Writes matrices + instance colors across every part-ref of one enemy type.
// Each part shares the same transform but has its own material, giving the
// enemy visible color blocks without extra per-entity logic.
function updateTypeRefs(
  refs: (THREE.InstancedMesh | null)[],
  entities: EnemyLike[],
  tint: THREE.Color,
  previewScale: number,
  baseRotation: [number, number, number],
) {
  for (const ref of refs) {
    if (!ref) continue;
    for (let i = 0; i < MAX_PER_TYPE; i++) {
      if (i < entities.length) {
        const e = entities[i];
        DUMMY.position.set(e.position[0], e.position[1], e.position[2]);
        DUMMY.rotation.set(
          e.rotationX ?? baseRotation[0],
          e.rotationY ?? baseRotation[1],
          e.rotationZ ?? baseRotation[2],
        );
        DUMMY.scale.setScalar(previewScale);
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

function buildDroneParts(
  submeshes: ReturnType<typeof extractMaterialSubmeshes>,
  fallback: THREE.BufferGeometry,
): Part[] {
  const grouped = new Map<string, THREE.BufferGeometry[]>();
  for (const { geometry, materialName } of submeshes) {
    const role = materialName in DRONE_PART_PALETTES ? materialName : "body";
    const group = grouped.get(role) ?? [];
    group.push(geometry);
    grouped.set(role, group);
  }

  if (grouped.size === 0) {
    return buildParts([], [DRONE_PART_PALETTES.body], 0.62, fallback);
  }

  return [...grouped].flatMap(([role, geometries]) => {
    const merged = geometries.length === 1 ? geometries[0] : mergeGeometries(geometries, false);
    const sources = merged ? [merged] : geometries;
    const palette = DRONE_PART_PALETTES[role];
    return sources.map((geometry) => ({
      geometry: toFlatShaded(geometry),
      material: createVaporwaveMaterial(palette),
    }));
  });
}

export const EnemyRenderer = ({
  previewEnemies,
  previewScale = {},
}: {
  previewEnemies?: EnemyLike[];
  previewScale?: Partial<Record<EnemyLike["type"], number>>;
}) => {
  const droneRefs = useRef<(THREE.InstancedMesh | null)[]>([]);
  const fighterRefs = useRef<(THREE.InstancedMesh | null)[]>([]);
  const tankRefs = useRef<(THREE.InstancedMesh | null)[]>([]);
  const tankChargeRef = useRef<THREE.InstancedMesh>(null);

  const enemyGltf = useLoader(GLTFLoader, "/models/enemies/scene.gltf");
  const tankGltf = useLoader(GLTFLoader, "/models/player/scene.gltf");
  const droneGltf = useLoader(GLTFLoader, "/models/drone/scene.gltf");

  const droneParts = useMemo(
    () =>
      buildDroneParts(
        extractMaterialSubmeshes(droneGltf.scene, DRONE_SIZE),
        new THREE.OctahedronGeometry(DRONE_SIZE / 2, 0),
      ),
    [droneGltf],
  );

  const fighterParts = useMemo(
    () =>
      buildParts(
        // The GLTF is a modular kit: the Hotrod hull alone leaves out the
        // wings, tail, nose, and body connectors that complete this fighter.
        extractSubmeshes(enemyGltf.scene, FIGHTER_SIZE, 5, [
          "Hotrod",
          "Gauntlet",
          "Stinger",
          "Mandible",
          "Body_Connectors",
        ]),
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
    const enemies = previewEnemies ?? useGameStore.getState().enemies;

    const drones = enemies.filter((e) => e.type === "drone");
    const fighters = enemies.filter((e) => e.type === "fighter");
    const tanks = enemies.filter((e) => e.type === "tank");

    updateTypeRefs(
      droneRefs.current,
      drones,
      DRONE_TINT,
      previewScale.drone ?? 1,
      ENEMY_ROTATIONS.drone,
    );
    updateTypeRefs(
      fighterRefs.current,
      fighters,
      FIGHTER_TINT,
      previewScale.fighter ?? 1,
      ENEMY_ROTATIONS.fighter,
    );
    updateTypeRefs(
      tankRefs.current,
      tanks,
      TANK_TINT,
      previewScale.tank ?? 1,
      ENEMY_ROTATIONS.tank,
    );

    // Tank charge overlay — rendered as a separate pulsing sphere instance.
    if (tankChargeRef.current) {
      let chargeIdx = 0;
      for (const e of tanks) {
        if (e.state === "charging" && chargeIdx < MAX_CHARGE) {
          const s = 0.3 + (e.stateTimer ?? 0) * 0.5;
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
