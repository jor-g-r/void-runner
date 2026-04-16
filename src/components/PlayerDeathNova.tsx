import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { Mesh, Points, PointsMaterial } from "three";

interface Props {
  position: [number, number, number];
  onComplete: () => void;
}

const PARTICLE_COUNT = 80;
const DURATION = 1.4;

// Vaporwave palette — particles get a random color from this set.
const COLORS = ["#ff66cc", "#cc66ff", "#00ddff", "#ffffff", "#ff3399"];

export const PlayerDeathNova = ({ position, onComplete }: Props) => {
  const pointsRef = useRef<Points>(null);
  const ringRef = useRef<Mesh>(null);
  const ringMatRef = useRef<THREE.MeshBasicMaterial>(null);
  const elapsed = useRef(0);

  const { velocities, initialPositions, colors } = useMemo(() => {
    const vels: [number, number, number][] = [];
    const pos: number[] = [];
    const cols: number[] = [];
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;
      const speed = 8 + Math.random() * 18;
      vels.push([
        Math.sin(phi) * Math.cos(theta) * speed,
        Math.sin(phi) * Math.sin(theta) * speed,
        Math.cos(phi) * speed * 0.4, // dampen Z so the burst reads as a flat nova
      ]);
      pos.push(position[0], position[1], position[2]);
      const c = new THREE.Color(COLORS[Math.floor(Math.random() * COLORS.length)]);
      cols.push(c.r, c.g, c.b);
    }
    return {
      velocities: vels,
      initialPositions: new Float32Array(pos),
      colors: new Float32Array(cols),
    };
  }, [position]);

  useFrame((_state, rawDelta) => {
    const delta = Math.min(rawDelta, 0.1);
    elapsed.current += delta;

    if (elapsed.current >= DURATION) {
      onComplete();
      return;
    }

    const t = elapsed.current / DURATION;

    // Particles
    if (pointsRef.current) {
      const positions = pointsRef.current.geometry.getAttribute("position");
      const arr = positions.array as Float32Array;
      // Slight drag so particles slow down as they spread
      const drag = 1 - delta * 0.8;
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        arr[i * 3] += velocities[i][0] * delta;
        arr[i * 3 + 1] += velocities[i][1] * delta;
        arr[i * 3 + 2] += velocities[i][2] * delta;
        velocities[i][0] *= drag;
        velocities[i][1] *= drag;
        velocities[i][2] *= drag;
      }
      positions.needsUpdate = true;

      const material = pointsRef.current.material as PointsMaterial;
      material.opacity = 1 - t * t; // accelerating fade
      material.size = 0.5 * (1 - t * 0.6);
    }

    // Shockwave ring — expands fast, fades fast
    if (ringRef.current && ringMatRef.current) {
      const ringT = Math.min(1, elapsed.current / 0.6); // fully expanded by 0.6s
      const scale = 0.3 + ringT * 12;
      ringRef.current.scale.set(scale, scale, 1);
      ringMatRef.current.opacity = 0.9 * (1 - ringT);
    }
  });

  return (
    <group>
      <points ref={pointsRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[initialPositions, 3]} />
          <bufferAttribute attach="attributes-color" args={[colors, 3]} />
        </bufferGeometry>
        <pointsMaterial
          size={0.5}
          transparent
          opacity={1}
          vertexColors
          depthWrite={false}
          toneMapped={false}
        />
      </points>
      <mesh ref={ringRef} position={position}>
        <ringGeometry args={[0.6, 0.85, 32]} />
        <meshBasicMaterial
          ref={ringMatRef}
          color="#ffffff"
          transparent
          opacity={0.9}
          side={THREE.DoubleSide}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
};
