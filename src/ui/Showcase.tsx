import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useLoader, useThree } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import * as THREE from "three";
import { EnemyRenderer } from "../components/EnemyRenderer";
import { createVaporwaveMaterial } from "../systems/vaporwaveMaterial";
import { extractGroupByName } from "../systems/modelUtils";

const PLAYER_PALETTE = [
  { baseColor: "#4a1866", topTint: "#cc66ff", bottomTint: "#ff66cc" },
  { baseColor: "#1a3355", topTint: "#88ccff", bottomTint: "#aaffee" },
  { baseColor: "#661133", topTint: "#ff6688", bottomTint: "#ff3366" },
  { baseColor: "#1e2e66", topTint: "#6699ff", bottomTint: "#00ddff" },
  { baseColor: "#3a1a55", topTint: "#aa55ee", bottomTint: "#ee44bb" },
];

const BOSS_PALETTE = [
  { baseColor: "#280033", topTint: "#ff33cc", bottomTint: "#6600ff" },
  { baseColor: "#330022", topTint: "#cc33ff", bottomTint: "#ff0066" },
  { baseColor: "#0a1144", topTint: "#3366ff", bottomTint: "#6633cc" },
  { baseColor: "#1a0033", topTint: "#ff66cc", bottomTint: "#9933ff" },
];

const MODEL_NAMES = ["PLAYER", "DRONE", "FIGHTER", "TANK", "VOID CARRIER"];
const ANGLE_LOG_DELAY = 5000;

type Position = [number, number, number];
type Rotation = { x: number; y: number; z: number };

const DragSurface = ({
  position,
  width,
  onRotate,
}: {
  position: Position;
  width: number;
  onRotate: (deltaX: number, deltaY: number, roll: boolean) => void;
}) => {
  const drag = useRef<{ pointerId: number; x: number; y: number } | null>(null);
  const rotateRef = useRef(onRotate);

  useEffect(() => {
    rotateRef.current = onRotate;
  }, [onRotate]);

  useEffect(() => {
    const onMove = (event: PointerEvent) => {
      const active = drag.current;
      if (!active || active.pointerId !== event.pointerId) return;
      const deltaX = event.clientX - active.x;
      const deltaY = event.clientY - active.y;
      active.x = event.clientX;
      active.y = event.clientY;
      rotateRef.current(deltaX, deltaY, event.shiftKey);
    };

    const endDrag = (event: PointerEvent) => {
      if (drag.current?.pointerId === event.pointerId) drag.current = null;
    };
    const onBlur = () => {
      drag.current = null;
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", endDrag);
    window.addEventListener("pointercancel", endDrag);
    window.addEventListener("blur", onBlur);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", endDrag);
      window.removeEventListener("pointercancel", endDrag);
      window.removeEventListener("blur", onBlur);
    };
  }, []);

  const onPointerDown = (event: {
    stopPropagation: () => void;
    pointerId: number;
    clientX: number;
    clientY: number;
  }) => {
    event.stopPropagation();
    drag.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY };
  };

  return (
    <mesh position={[position[0], position[1], 1.3]} onPointerDown={onPointerDown}>
      <planeGeometry args={[width, 2.45]} />
      <meshBasicMaterial transparent opacity={0} colorWrite={false} side={THREE.DoubleSide} />
    </mesh>
  );
};

const PlayerPreview = ({ position, rotation }: { position: Position; rotation: Rotation }) => {
  const gltf = useLoader(GLTFLoader, "/models/crafts/scene.gltf");
  const model = useMemo(() => {
    const group = extractGroupByName(gltf.scene, "craft1", 2.0);
    if (!group) return null;
    let meshIndex = 0;
    group.traverse((child) => {
      const mesh = child as THREE.Mesh;
      if (!mesh.isMesh) return;
      mesh.material = createVaporwaveMaterial({
        ...PLAYER_PALETTE[meshIndex % PLAYER_PALETTE.length],
        emissiveIntensity: 1,
        scanSpeed: 1.4,
        fresnelPower: 2.2,
      });
      meshIndex++;
    });
    return group;
  }, [gltf]);

  return model ? (
    <primitive object={model} position={position} rotation={[rotation.x, rotation.y, rotation.z]} />
  ) : null;
};

const BossPreview = ({ position, rotation }: { position: Position; rotation: Rotation }) => {
  const gltf = useLoader(GLTFLoader, "/models/boss/scene.gltf");
  const model = useMemo(() => {
    const group = extractGroupByName(gltf.scene, "ROVTex", 8);
    if (!group) return null;
    let meshIndex = 0;
    group.traverse((child) => {
      const mesh = child as THREE.Mesh;
      if (!mesh.isMesh) return;
      mesh.material = createVaporwaveMaterial({
        ...BOSS_PALETTE[meshIndex % BOSS_PALETTE.length],
        emissiveIntensity: 1.1,
        scanSpeed: 0.8,
        fresnelPower: 2,
      });
      meshIndex++;
    });
    return group;
  }, [gltf]);

  return model ? (
    <group position={position} scale={0.24} rotation={[rotation.x, rotation.y, rotation.z]}>
      <primitive object={model} />
      <mesh position={[0, 0, 1]}>
        <sphereGeometry args={[0.6, 12, 12]} />
        <meshStandardMaterial
          color="#ff00ff"
          emissive="#ff00ff"
          emissiveIntensity={3}
          toneMapped={false}
        />
      </mesh>
    </group>
  ) : null;
};

const ShowcaseScene = () => {
  const viewport = useThree((state) => state.viewport);
  const columns = viewport.aspect > 1.15 ? 3 : 2;
  const spacingX = Math.min(4.2, viewport.width / (columns + 0.5));
  const [rotations, setRotations] = useState<Rotation[]>([
    { x: 0.18, y: Math.PI, z: 0 },
    { x: 0.22, y: 0.65, z: 0 },
    { x: 0.32, y: 0.35, z: 0 },
    { x: 0.22, y: 0.65, z: 0 },
    { x: 0, y: Math.PI, z: 0 },
  ]);
  const rotationsRef = useRef(rotations);
  const angleLogTimers = useRef<(number | null)[]>(Array(MODEL_NAMES.length).fill(null));

  useEffect(
    () => () => {
      angleLogTimers.current.forEach((timer) => {
        if (timer !== null) window.clearTimeout(timer);
      });
    },
    [],
  );

  const positions = useMemo(() => {
    const cardCount = 5;
    const rows = Math.ceil(cardCount / columns);
    const rowSpacing = 2.9;
    return Array.from({ length: cardCount }, (_, index): Position => {
      const row = Math.floor(index / columns);
      const rowStart = row * columns;
      const countInRow = Math.min(columns, cardCount - rowStart);
      const column = index - rowStart;
      const x = (column - (countInRow - 1) / 2) * spacingX;
      const y = ((rows - 1) / 2 - row) * rowSpacing + 0.1;
      return [x, y, 0];
    });
  }, [columns, spacingX]);

  const previewEnemies = useMemo(
    () => [
      {
        type: "drone" as const,
        position: positions[1],
        flashTimer: 0,
        rotationX: rotations[1].x,
        rotationY: rotations[1].y,
        rotationZ: rotations[1].z,
      },
      {
        type: "fighter" as const,
        position: positions[2],
        flashTimer: 0,
        rotationX: rotations[2].x,
        rotationY: rotations[2].y,
        rotationZ: rotations[2].z,
      },
      {
        type: "tank" as const,
        position: positions[3],
        flashTimer: 0,
        rotationX: rotations[3].x,
        rotationY: rotations[3].y,
        rotationZ: rotations[3].z,
      },
    ],
    [positions, rotations],
  );

  const rotateItem = (index: number, deltaX: number, deltaY: number, roll: boolean) => {
    const nextRotations = rotationsRef.current.map((rotation, itemIndex) =>
      itemIndex === index
        ? roll
          ? { ...rotation, z: rotation.z + deltaX * 0.01 }
          : {
              ...rotation,
              x: THREE.MathUtils.clamp(rotation.x + deltaY * 0.008, -1.25, 1.25),
              y: rotation.y + deltaX * 0.01,
            }
        : rotation,
    );
    rotationsRef.current = nextRotations;
    setRotations(nextRotations);

    const previousTimer = angleLogTimers.current[index];
    if (previousTimer !== null) window.clearTimeout(previousTimer);
    angleLogTimers.current[index] = window.setTimeout(() => {
      const { x, y, z } = rotationsRef.current[index];
      const degrees = (radians: number) => Math.round(THREE.MathUtils.radToDeg(radians) * 10) / 10;
      console.info(`[Showcase] ${MODEL_NAMES[index]} pose stable`, {
        rotationRadians: { x, y, z },
        rotationDegrees: { x: degrees(x), y: degrees(y), z: degrees(z) },
      });
      angleLogTimers.current[index] = null;
    }, ANGLE_LOG_DELAY);
  };

  const label = (title: string, subtitle: string, position: Position) => (
    <Html key={title} position={[position[0], position[1] - 1.05, position[2]]} center>
      <div
        style={{
          minWidth: "124px",
          padding: "8px 12px",
          border: "1px solid rgba(0, 221, 255, 0.34)",
          borderRadius: "5px",
          background: "rgba(4, 8, 25, 0.82)",
          color: "#00ddff",
          textAlign: "center",
          fontFamily: "'Audiowide', cursive",
          letterSpacing: "1px",
          whiteSpace: "nowrap",
          pointerEvents: "none",
        }}
      >
        <div style={{ fontSize: "12px" }}>{title}</div>
        <div
          style={{
            marginTop: "4px",
            color: "rgba(220, 230, 255, 0.58)",
            fontFamily: "'Roboto', sans-serif",
            fontSize: "10px",
            letterSpacing: "1.5px",
          }}
        >
          {subtitle}
        </div>
      </div>
    </Html>
  );

  return (
    <>
      <color attach="background" args={["#030511"]} />
      <ambientLight intensity={0.8} />
      <directionalLight position={[4, 5, 8]} intensity={1.4} />
      <pointLight position={[0, 0, 5]} color="#5633aa" intensity={20} distance={18} />

      <PlayerPreview position={positions[0]} rotation={rotations[0]} />
      <EnemyRenderer previewEnemies={previewEnemies} previewScale={{ drone: 1.6 }} />
      <BossPreview position={positions[4]} rotation={rotations[4]} />

      {positions.map((position, index) => (
        <DragSurface
          key={`drag-${index}`}
          position={position}
          width={Math.min(3.5, spacingX * 0.86)}
          onRotate={(deltaX, deltaY, roll) => rotateItem(index, deltaX, deltaY, roll)}
        />
      ))}

      {label("PLAYER", "PLAYER SHIP", positions[0])}
      {label("DRONE", "LIGHT ENEMY", positions[1])}
      {label("FIGHTER", "STANDARD ENEMY", positions[2])}
      {label("TANK", "HEAVY ENEMY", positions[3])}
      {label("VOID CARRIER", "BOSS", positions[4])}
    </>
  );
};

export const Showcase = () => (
  <main
    style={{
      position: "fixed",
      inset: 0,
      overflow: "hidden",
      background: "#030511",
      color: "#00ddff",
    }}
  >
    <Canvas
      camera={{ position: [0, 0, 9], fov: 40 }}
      dpr={[1, 1.5]}
      style={{ touchAction: "none", cursor: "grab" }}
    >
      <ShowcaseScene />
    </Canvas>
    <header
      style={{
        position: "absolute",
        top: "22px",
        left: "24px",
        right: "24px",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "space-between",
        pointerEvents: "none",
        fontFamily: "'Audiowide', cursive",
        textShadow: "0 0 12px rgba(0, 170, 255, 0.55)",
      }}
    >
      <div>
        <div style={{ fontSize: "clamp(18px, 3vw, 28px)", letterSpacing: "3px" }}>
          VOID RUNNER — SHIP VIEWER
        </div>
        <div
          style={{
            marginTop: "8px",
            color: "rgba(220, 230, 255, 0.58)",
            fontFamily: "'Roboto', sans-serif",
            fontSize: "12px",
            letterSpacing: "2px",
          }}
        >
          DRAG TO ROTATE · SHIFT + HORIZONTAL DRAG TO ROLL
        </div>
      </div>
      <a
        href="/"
        style={{
          pointerEvents: "auto",
          padding: "9px 14px",
          border: "1px solid rgba(0, 221, 255, 0.45)",
          borderRadius: "4px",
          color: "#00ddff",
          textDecoration: "none",
          fontSize: "11px",
          letterSpacing: "2px",
        }}
      >
        BACK TO GAME
      </a>
    </header>
  </main>
);
