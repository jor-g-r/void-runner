import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { InstancedMesh, Object3D, Color } from "three";
import { useGameStore } from "../stores/gameStore";

const DUMMY = new Object3D();
const MAX_PER_TYPE = 30;
const WHITE = new Color("#ffffff");
const COLORS = {
  drone: { color: new Color("#44ff88"), emissive: new Color("#22aa44") },
  fighter: { color: new Color("#ff4466"), emissive: new Color("#aa2233") },
  tank: { color: new Color("#ff8844"), emissive: new Color("#aa4422") },
};

// Reusable color for instanced setColorAt
const tempColor = new Color();

export const EnemyRenderer = () => {
  const droneRef = useRef<InstancedMesh>(null);
  const fighterRef = useRef<InstancedMesh>(null);
  const tankRef = useRef<InstancedMesh>(null);
  const tankChargeRef = useRef<InstancedMesh>(null);

  useFrame(() => {
    const enemies = useGameStore.getState().enemies;

    const drones = enemies.filter((e) => e.type === "drone");
    const fighters = enemies.filter((e) => e.type === "fighter");
    const tanks = enemies.filter((e) => e.type === "tank");

    // --- Drones ---
    if (droneRef.current) {
      for (let i = 0; i < MAX_PER_TYPE; i++) {
        if (i < drones.length) {
          const e = drones[i];
          DUMMY.position.set(e.position[0], e.position[1], e.position[2]);
          DUMMY.scale.set(1, 1, 1);
          DUMMY.updateMatrix();
          droneRef.current.setMatrixAt(i, DUMMY.matrix);
          tempColor.copy(e.flashTimer > 0 ? WHITE : COLORS.drone.color);
          droneRef.current.setColorAt(i, tempColor);
        } else {
          DUMMY.scale.set(0, 0, 0);
          DUMMY.updateMatrix();
          droneRef.current.setMatrixAt(i, DUMMY.matrix);
        }
      }
      droneRef.current.instanceMatrix.needsUpdate = true;
      if (droneRef.current.instanceColor) droneRef.current.instanceColor.needsUpdate = true;
    }

    // --- Fighters ---
    if (fighterRef.current) {
      for (let i = 0; i < MAX_PER_TYPE; i++) {
        if (i < fighters.length) {
          const e = fighters[i];
          DUMMY.position.set(e.position[0], e.position[1], e.position[2]);
          DUMMY.rotation.set(Math.PI, 0, 0);
          DUMMY.scale.set(1, 1, 1);
          DUMMY.updateMatrix();
          fighterRef.current.setMatrixAt(i, DUMMY.matrix);
          tempColor.copy(e.flashTimer > 0 ? WHITE : COLORS.fighter.color);
          fighterRef.current.setColorAt(i, tempColor);
        } else {
          DUMMY.scale.set(0, 0, 0);
          DUMMY.rotation.set(0, 0, 0);
          DUMMY.updateMatrix();
          fighterRef.current.setMatrixAt(i, DUMMY.matrix);
        }
      }
      fighterRef.current.instanceMatrix.needsUpdate = true;
      if (fighterRef.current.instanceColor) fighterRef.current.instanceColor.needsUpdate = true;
    }

    // --- Tanks ---
    if (tankRef.current && tankChargeRef.current) {
      let chargeIdx = 0;
      for (let i = 0; i < MAX_PER_TYPE; i++) {
        if (i < tanks.length) {
          const e = tanks[i];
          DUMMY.position.set(e.position[0], e.position[1], e.position[2]);
          DUMMY.rotation.set(0, 0, 0);
          DUMMY.scale.set(1, 1, 1);
          DUMMY.updateMatrix();
          tankRef.current.setMatrixAt(i, DUMMY.matrix);
          tempColor.copy(e.flashTimer > 0 ? WHITE : COLORS.tank.color);
          tankRef.current.setColorAt(i, tempColor);

          // Charge telegraph
          if (e.state === "charging") {
            const s = 0.3 + e.stateTimer * 0.5;
            DUMMY.position.set(e.position[0], e.position[1], e.position[2] + 0.5);
            DUMMY.scale.set(s, s, s);
            DUMMY.updateMatrix();
            tankChargeRef.current.setMatrixAt(chargeIdx, DUMMY.matrix);
            chargeIdx++;
          }
        } else {
          DUMMY.scale.set(0, 0, 0);
          DUMMY.updateMatrix();
          tankRef.current.setMatrixAt(i, DUMMY.matrix);
        }
      }
      // Hide unused charge spheres
      for (let i = chargeIdx; i < 10; i++) {
        DUMMY.scale.set(0, 0, 0);
        DUMMY.updateMatrix();
        tankChargeRef.current.setMatrixAt(i, DUMMY.matrix);
      }
      tankRef.current.instanceMatrix.needsUpdate = true;
      if (tankRef.current.instanceColor) tankRef.current.instanceColor.needsUpdate = true;
      tankChargeRef.current.instanceMatrix.needsUpdate = true;
    }
  });

  return (
    <>
      <instancedMesh ref={droneRef} args={[undefined, undefined, MAX_PER_TYPE]}>
        <octahedronGeometry args={[0.5, 0]} />
        <meshStandardMaterial color="#44ff88" emissive="#22aa44" emissiveIntensity={0.5} />
      </instancedMesh>

      <instancedMesh ref={fighterRef} args={[undefined, undefined, MAX_PER_TYPE]}>
        <coneGeometry args={[0.5, 1.2, 5]} />
        <meshStandardMaterial color="#ff4466" emissive="#aa2233" emissiveIntensity={0.5} />
      </instancedMesh>

      <instancedMesh ref={tankRef} args={[undefined, undefined, MAX_PER_TYPE]}>
        <boxGeometry args={[1.2, 1.2, 0.8]} />
        <meshStandardMaterial color="#ff8844" emissive="#aa4422" emissiveIntensity={0.5} />
      </instancedMesh>

      {/* Tank charge telegraph spheres */}
      <instancedMesh ref={tankChargeRef} args={[undefined, undefined, 10]}>
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
