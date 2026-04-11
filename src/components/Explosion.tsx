import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import type { Points } from "three";

interface ExplosionProps {
  position: [number, number, number];
  onComplete: () => void;
}

const PARTICLE_COUNT = 18;
const DURATION = 0.5;

export const Explosion = ({ position, onComplete }: ExplosionProps) => {
  const pointsRef = useRef<Points>(null);
  const elapsed = useRef(0);

  const { velocities, initialPositions } = useMemo(() => {
    const vels: [number, number, number][] = [];
    const pos: number[] = [];
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      // Random direction, random speed
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;
      const speed = 5 + Math.random() * 15;
      vels.push([
        Math.sin(phi) * Math.cos(theta) * speed,
        Math.sin(phi) * Math.sin(theta) * speed,
        Math.cos(phi) * speed,
      ]);
      pos.push(position[0], position[1], position[2]);
    }
    return { velocities: vels, initialPositions: new Float32Array(pos) };
  }, [position]);

  useFrame((_state, rawDelta) => {
    const delta = Math.min(rawDelta, 0.1);
    elapsed.current += delta;

    if (elapsed.current >= DURATION) {
      onComplete();
      return;
    }

    if (!pointsRef.current) return;

    const positions = pointsRef.current.geometry.getAttribute("position");
    const arr = positions.array as Float32Array;

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      arr[i * 3] += velocities[i][0] * delta;
      arr[i * 3 + 1] += velocities[i][1] * delta;
      arr[i * 3 + 2] += velocities[i][2] * delta;
    }
    positions.needsUpdate = true;

    // Fade out
    const progress = elapsed.current / DURATION;
    const material = pointsRef.current.material as THREE.PointsMaterial;
    material.opacity = 1 - progress;
    material.size = 0.3 * (1 - progress * 0.5);
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[initialPositions, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        color="#ffaa33"
        size={0.3}
        transparent
        opacity={1}
        depthWrite={false}
        toneMapped={false}
      />
    </points>
  );
};

// Need THREE namespace for PointsMaterial type
import type * as THREE from "three";
