import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import type { Group } from "three";

interface Props {
  position: [number, number, number];
  amount: number;
  onComplete: () => void;
}

const DURATION = 0.9;
const RISE_SPEED = 3;

export const ScorePopup = ({ position, amount, onComplete }: Props) => {
  const groupRef = useRef<Group>(null);
  const divRef = useRef<HTMLDivElement>(null);
  const ageRef = useRef(0);
  const baseY = position[1];

  useFrame((_state, rawDelta) => {
    const delta = Math.min(rawDelta, 0.1);
    ageRef.current += delta;

    if (ageRef.current >= DURATION) {
      onComplete();
      return;
    }

    if (groupRef.current) {
      groupRef.current.position.y = baseY + RISE_SPEED * ageRef.current;
    }
    if (divRef.current) {
      const t = ageRef.current / DURATION;
      divRef.current.style.opacity = String(1 - t * t);
    }
  });

  return (
    <group ref={groupRef} position={position}>
      <Html center distanceFactor={20} pointerEvents="none">
        <div
          ref={divRef}
          style={{
            color: "#00ddff",
            fontFamily: "'Roboto', sans-serif",
            fontSize: "32px",
            fontWeight: 700,
            textShadow: "0 0 8px #0066ff, 0 0 16px #003399",
            whiteSpace: "nowrap",
            userSelect: "none",
          }}
        >
          +{amount}
        </div>
      </Html>
    </group>
  );
};
