import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { InstancedMesh, Object3D, type Color } from "three";
import { useGameStore } from "../stores/gameStore";

const DUMMY = new Object3D();
const MAX_PROJECTILES = 100;

export const ProjectileManager = () => {
  const meshRef = useRef<InstancedMesh>(null);
  const tick = useGameStore((s) => s.tick);
  const phase = useGameStore((s) => s.phase);

  // Stable color for instanced mesh
  const color = useMemo(() => {
    const c = { r: 0.2, g: 0.8, b: 1 } as unknown as Color;
    return c;
  }, []);

  useFrame((_state, delta) => {
    if (phase !== "playing") return;

    // Advance game time and update projectile positions
    tick(delta);

    const projectiles = useGameStore.getState().playerProjectiles;
    if (!meshRef.current) return;

    // Update instanced mesh transforms
    for (let i = 0; i < MAX_PROJECTILES; i++) {
      if (i < projectiles.length) {
        const p = projectiles[i];
        DUMMY.position.set(p.position[0], p.position[1], p.position[2]);
        DUMMY.scale.set(1, 1, 1);
      } else {
        // Hide unused instances
        DUMMY.scale.set(0, 0, 0);
      }
      DUMMY.updateMatrix();
      meshRef.current.setMatrixAt(i, DUMMY.matrix);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, MAX_PROJECTILES]}>
      <boxGeometry args={[0.08, 0.08, 0.6]} />
      <meshStandardMaterial
        color={color as unknown as string}
        emissive="#00ddff"
        emissiveIntensity={3}
        toneMapped={false}
      />
    </instancedMesh>
  );
};
