import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { InstancedMesh, Object3D } from "three";

const STAR_COUNT = 250;
const SPEED_LINE_COUNT = 200;
const FIELD_DEPTH = 100;
const FIELD_WIDTH = 40;
const FIELD_HEIGHT = 25;
const STAR_SPEED = 30;
const SPEED_LINE_SPEED = 60;
const MAX_DELTA = 0.1; // Cap delta at 100ms to prevent jumps on tab switch

const DUMMY = new Object3D();

export const Environment = () => {
  const starsRef = useRef<InstancedMesh>(null);
  const speedLinesRef = useRef<InstancedMesh>(null);

  // Initialize star positions + per-star scale (30% are dimmed via smaller scale)
  const starData = useMemo(() => {
    const positions: [number, number, number][] = [];
    const scales: number[] = [];
    const depthStep = FIELD_DEPTH / STAR_COUNT;
    for (let i = 0; i < STAR_COUNT; i++) {
      positions.push([
        (Math.random() - 0.5) * FIELD_WIDTH,
        (Math.random() - 0.5) * FIELD_HEIGHT,
        -(i * depthStep + Math.random() * depthStep),
      ]);
      // 30% of stars get a random smaller scale (dimmer look)
      scales.push(Math.random() < 0.3 ? 0.3 + Math.random() * 0.5 : 1);
    }
    return { positions, scales };
  }, []);

  // Initialize speed line positions — evenly distributed in depth
  const speedLinePositions = useMemo(() => {
    const positions: [number, number, number][] = [];
    const depthStep = FIELD_DEPTH / SPEED_LINE_COUNT;
    for (let i = 0; i < SPEED_LINE_COUNT; i++) {
      positions.push([
        (Math.random() - 0.5) * FIELD_WIDTH * 0.7,
        (Math.random() - 0.5) * FIELD_HEIGHT * 0.7,
        -(i * depthStep + Math.random() * depthStep),
      ]);
    }
    return positions;
  }, []);

  useFrame((_state, delta) => {
    if (!starsRef.current || !speedLinesRef.current) return;

    // Clamp delta to prevent particle teleportation on tab switch
    const dt = Math.min(delta, MAX_DELTA);

    // Update stars — move toward camera, wrap around
    const { positions: starPositions, scales: starScales } = starData;
    for (let i = 0; i < STAR_COUNT; i++) {
      starPositions[i][2] += STAR_SPEED * dt;
      if (starPositions[i][2] > 10) {
        starPositions[i][2] = -FIELD_DEPTH + Math.random() * 5;
        starPositions[i][0] = (Math.random() - 0.5) * FIELD_WIDTH;
        starPositions[i][1] = (Math.random() - 0.5) * FIELD_HEIGHT;
      }
      const s = starScales[i];
      DUMMY.position.set(
        starPositions[i][0],
        starPositions[i][1],
        starPositions[i][2],
      );
      DUMMY.scale.set(s, s, s);
      DUMMY.updateMatrix();
      starsRef.current.setMatrixAt(i, DUMMY.matrix);
    }
    starsRef.current.instanceMatrix.needsUpdate = true;

    // Update speed lines
    for (let i = 0; i < SPEED_LINE_COUNT; i++) {
      speedLinePositions[i][2] += SPEED_LINE_SPEED * dt;
      if (speedLinePositions[i][2] > 10) {
        speedLinePositions[i][2] = -FIELD_DEPTH + Math.random() * 5;
        speedLinePositions[i][0] = (Math.random() - 0.5) * FIELD_WIDTH * 0.7;
        speedLinePositions[i][1] = (Math.random() - 0.5) * FIELD_HEIGHT * 0.7;
      }
      DUMMY.position.set(
        speedLinePositions[i][0],
        speedLinePositions[i][1],
        speedLinePositions[i][2],
      );
      DUMMY.updateMatrix();
      speedLinesRef.current.setMatrixAt(i, DUMMY.matrix);
    }
    speedLinesRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <>
      {/* Stars — 70% full brightness, 30% random dim */}
      <instancedMesh ref={starsRef} args={[undefined, undefined, STAR_COUNT]}>
        <sphereGeometry args={[0.035, 4, 4]} />
        <meshBasicMaterial color="#ffffff" transparent />
      </instancedMesh>

      {/* Speed lines */}
      <instancedMesh
        ref={speedLinesRef}
        args={[undefined, undefined, SPEED_LINE_COUNT]}
      >
        <boxGeometry args={[0.02, 0.02, 1.5]} />
        <meshBasicMaterial color="#4488ff" transparent opacity={0.3} />
      </instancedMesh>

      {/* Ambient fog — hide far-plane pop-in */}
      <fog attach="fog" args={["#000011", 80, 150]} />
    </>
  );
};
