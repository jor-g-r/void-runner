import { useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import type { Mesh } from "three";
import { useGameStore } from "../stores/gameStore";

const BOUNDS_X = 9;
const BOUNDS_Y = 4;
const LERP_FACTOR = 0.07;
const TILT_LERP = 0.06;
const MAX_BANK = 0.8;
const MAX_PITCH = 0.4;
const FIRE_RATE = 1 / 8; // 8 shots per second

export const Player = () => {
  const meshRef = useRef<Mesh>(null);
  const targetX = useRef(0);
  const targetY = useRef(0);
  const currentX = useRef(0);
  const currentY = useRef(0);
  const fireTimer = useRef(0);

  const { viewport } = useThree();
  const setPlayerPosition = useGameStore((s) => s.setPlayerPosition);
  const fireProjectile = useGameStore((s) => s.firePlayerProjectile);
  const phase = useGameStore((s) => s.phase);

  useFrame((state, rawDelta) => {
    if (phase !== "playing" || !meshRef.current) return;
    const delta = Math.min(rawDelta, 0.1);

    // Mouse position to world coordinates
    const mouse = state.pointer;
    targetX.current = (mouse.x * viewport.width) / 2;
    targetY.current = (mouse.y * viewport.height) / 2;

    // Clamp to bounds
    targetX.current = Math.max(-BOUNDS_X, Math.min(BOUNDS_X, targetX.current));
    targetY.current = Math.max(-BOUNDS_Y, Math.min(BOUNDS_Y, targetY.current));

    // Lerp position
    currentX.current += (targetX.current - currentX.current) * LERP_FACTOR;
    currentY.current += (targetY.current - currentY.current) * LERP_FACTOR;

    // Apply position
    meshRef.current.position.x = currentX.current;
    meshRef.current.position.y = currentY.current;

    // Bank tilt (roll when moving horizontally)
    const velocityX = targetX.current - currentX.current;
    const targetBank = -(velocityX / BOUNDS_X) * MAX_BANK;
    meshRef.current.rotation.z +=
      (targetBank - meshRef.current.rotation.z) * TILT_LERP;

    // Pitch (tilt when moving vertically)
    const velocityY = targetY.current - currentY.current;
    const targetPitch = (velocityY / BOUNDS_Y) * MAX_PITCH;
    meshRef.current.rotation.x +=
      (targetPitch - meshRef.current.rotation.x) * TILT_LERP;

    // Update store
    setPlayerPosition([currentX.current, currentY.current]);

    // Auto-fire
    fireTimer.current -= delta;
    if (fireTimer.current <= 0) {
      fireTimer.current = FIRE_RATE;
      // Twin lasers — offset slightly left and right
      fireProjectile(currentX.current - 0.3, currentY.current);
      fireProjectile(currentX.current + 0.3, currentY.current);
    }
  });

  return (
    <mesh ref={meshRef} position={[0, 0, 0]}>
      {/* Main body */}
      <group>
        {/* Fuselage */}
        <mesh>
          <coneGeometry args={[0.3, 1.2, 4]} />
          <meshStandardMaterial color="#4488ff" emissive="#2244aa" emissiveIntensity={0.5} />
        </mesh>
        {/* Left wing */}
        <mesh position={[-0.6, 0, 0.2]} rotation={[0, 0, -0.3]}>
          <boxGeometry args={[0.8, 0.05, 0.4]} />
          <meshStandardMaterial color="#3366dd" emissive="#1133aa" emissiveIntensity={0.3} />
        </mesh>
        {/* Right wing */}
        <mesh position={[0.6, 0, 0.2]} rotation={[0, 0, 0.3]}>
          <boxGeometry args={[0.8, 0.05, 0.4]} />
          <meshStandardMaterial color="#3366dd" emissive="#1133aa" emissiveIntensity={0.3} />
        </mesh>
        {/* Engine glow */}
        <mesh position={[0, 0, 0.6]}>
          <sphereGeometry args={[0.15, 8, 8]} />
          <meshStandardMaterial
            color="#00ccff"
            emissive="#00ccff"
            emissiveIntensity={2}
          />
        </mesh>
      </group>
    </mesh>
  );
};
