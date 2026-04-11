import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { Group } from "three";
import { useGameStore } from "../stores/gameStore";

// Gun cross — primary reticle, snappy, shows "where I'm aiming"
const GUN_CROSS_DEPTH = -7;
const GUN_CROSS_LERP = 0.2;

// Pipper — secondary reference, shows "where my bullet stream is landing"
const PIPPER_DEPTH = -14;
const PIPPER_LERP = 0.05;

// Far dot — depth reference, shows bullet trajectory at range
const FAR_DOT_DEPTH = -25;
const FAR_DOT_LERP = 0.035;

export const Crosshair = () => {
  const gunCrossRef = useRef<Group>(null);
  const pipperRef = useRef<Group>(null);
  const farDotRef = useRef<Group>(null);

  useFrame(() => {
    const [px, py] = useGameStore.getState().playerPosition;

    if (gunCrossRef.current) {
      gunCrossRef.current.position.x +=
        (px - gunCrossRef.current.position.x) * GUN_CROSS_LERP;
      gunCrossRef.current.position.y +=
        (py - gunCrossRef.current.position.y) * GUN_CROSS_LERP;
    }

    if (pipperRef.current) {
      pipperRef.current.position.x +=
        (px - pipperRef.current.position.x) * PIPPER_LERP;
      pipperRef.current.position.y +=
        (py - pipperRef.current.position.y) * PIPPER_LERP;
    }

    if (farDotRef.current) {
      farDotRef.current.position.x +=
        (px - farDotRef.current.position.x) * FAR_DOT_LERP;
      farDotRef.current.position.y +=
        (py - farDotRef.current.position.y) * FAR_DOT_LERP;
    }
  });

  return (
    <>
      {/* Gun cross — PRIMARY. Bright green, prominent */}
      <group ref={gunCrossRef} position={[0, 0, GUN_CROSS_DEPTH]} renderOrder={999}>
        {/* Top */}
        <mesh position={[0, 0.18, 0]}>
          <boxGeometry args={[0.02, 0.12, 0.001]} />
          <meshBasicMaterial color="#00ffaa" transparent opacity={0.9} depthTest={false} />
        </mesh>
        {/* Bottom */}
        <mesh position={[0, -0.18, 0]}>
          <boxGeometry args={[0.02, 0.12, 0.001]} />
          <meshBasicMaterial color="#00ffaa" transparent opacity={0.9} depthTest={false} />
        </mesh>
        {/* Right */}
        <mesh position={[0.18, 0, 0]}>
          <boxGeometry args={[0.12, 0.02, 0.001]} />
          <meshBasicMaterial color="#00ffaa" transparent opacity={0.9} depthTest={false} />
        </mesh>
        {/* Left */}
        <mesh position={[-0.18, 0, 0]}>
          <boxGeometry args={[0.12, 0.02, 0.001]} />
          <meshBasicMaterial color="#00ffaa" transparent opacity={0.9} depthTest={false} />
        </mesh>
        {/* Center pip */}
        <mesh>
          <circleGeometry args={[0.02, 8]} />
          <meshBasicMaterial color="#00ffaa" transparent opacity={1} depthTest={false} />
        </mesh>
      </group>

      {/* Pipper — SECONDARY. Dimmer, reference only */}
      <group ref={pipperRef} position={[0, 0, PIPPER_DEPTH]} renderOrder={998}>
        <mesh>
          <ringGeometry args={[0.18, 0.22, 20]} />
          <meshBasicMaterial color="#ccaa44" transparent opacity={0.25} depthTest={false} />
        </mesh>
        <mesh>
          <circleGeometry args={[0.04, 8]} />
          <meshBasicMaterial color="#ccaa44" transparent opacity={0.35} depthTest={false} />
        </mesh>
      </group>

      {/* Far dot — TERTIARY. Solid yellow dot, no transparency */}
      <group ref={farDotRef} position={[0, 0, FAR_DOT_DEPTH]} renderOrder={997}>
        <mesh>
          <circleGeometry args={[0.055, 10]} />
          <meshBasicMaterial color="#ffcc00" depthTest={false} />
        </mesh>
      </group>
    </>
  );
};
