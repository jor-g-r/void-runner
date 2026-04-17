import { useRef, useEffect, useMemo } from "react";
import { useFrame, useThree, useLoader } from "@react-three/fiber";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import type { Group } from "three";
import { useGameStore } from "../stores/gameStore";
import { extractGroupByName } from "../systems/modelUtils";
import { createVaporwaveMaterial } from "../systems/vaporwaveMaterial";
import { playSfx } from "../systems/audio";
import * as THREE from "three";

const BOUNDS_X = 8.2;
const BOUNDS_Y = 5;
const LERP_FACTOR = 0.12;
const TILT_LERP = 0.06;
const MAX_BANK = 0.8;
const MAX_PITCH = 0.4;
const FIRE_RATE = 1 / 8;
const KEYBOARD_SPEED = 14;
const CHARGE_TIME = 1.0;
const DOUBLE_TAP_WINDOW = 0.3;

const keys = new Set<string>();

// Vaporwave palette — each submesh of the ship gets one of these by index.
// Inspired by the stylized toy-ship reference: purple cockpit, coral wings,
// cool-white fuselage, electric-blue engines.
const PLAYER_PALETTE = [
  { baseColor: "#4a1866", topTint: "#cc66ff", bottomTint: "#ff66cc" }, // purple cockpit
  { baseColor: "#1a3355", topTint: "#88ccff", bottomTint: "#aaffee" }, // cool white fuselage
  { baseColor: "#661133", topTint: "#ff6688", bottomTint: "#ff3366" }, // coral wings
  { baseColor: "#1e2e66", topTint: "#6699ff", bottomTint: "#00ddff" }, // electric blue engines
  { baseColor: "#3a1a55", topTint: "#aa55ee", bottomTint: "#ee44bb" }, // magenta accent
];

export const Player = () => {
  const groupRef = useRef<Group>(null);
  const targetX = useRef(0);
  const targetY = useRef(0);
  const currentX = useRef(0);
  const currentY = useRef(0);
  const fireTimer = useRef(0);
  const usingKeyboard = useRef(false);
  const chargeHeld = useRef(false);
  const chargeTime = useRef(0);
  const barrelRollAngle = useRef(0);
  const lastTapA = useRef(0);
  const lastTapD = useRef(0);

  const { viewport } = useThree();
  const setPlayerPosition = useGameStore((s) => s.setPlayerPosition);
  const fireProjectile = useGameStore((s) => s.firePlayerProjectile);
  const fireCharged = useGameStore((s) => s.fireChargedShot);
  const startBarrelRoll = useGameStore((s) => s.startBarrelRoll);
  const phase = useGameStore((s) => s.phase);
  const chargeLevel = useGameStore((s) => s.chargeLevel);

  // Load player model
  // Player uses craft1 from 5 low-polyish pack with vaporwave material.
  // Each submesh gets a different palette entry so parts (cockpit, wings,
  // fuselage, engines) keep distinct identity instead of a single flat tone.
  const gltf = useLoader(GLTFLoader, "/models/crafts/scene.gltf");
  const playerModel = useMemo(() => {
    const group = extractGroupByName(gltf.scene, "craft1", 2.0);
    if (!group) return null;
    let meshIdx = 0;
    group.traverse((child) => {
      const mesh = child as THREE.Mesh;
      if (!mesh.isMesh) return;
      const palette = PLAYER_PALETTE[meshIdx % PLAYER_PALETTE.length];
      mesh.material = createVaporwaveMaterial({
        ...palette,
        emissiveIntensity: 1.0,
        scanSpeed: 1.4,
        fresnelPower: 2.2,
      });
      meshIdx++;
    });
    return group;
  }, [gltf]);

  useEffect(() => {
    const now = () => performance.now() / 1000;

    const onKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (keys.has(key)) return;
      keys.add(key);

      if (["w", "a", "s", "d", "arrowup", "arrowdown", "arrowleft", "arrowright"].includes(key)) {
        usingKeyboard.current = true;
      }

      if (key === "a" || key === "arrowleft") {
        const t = now();
        if (t - lastTapA.current < DOUBLE_TAP_WINDOW) startBarrelRoll();
        lastTapA.current = t;
      }
      if (key === "d" || key === "arrowright") {
        const t = now();
        if (t - lastTapD.current < DOUBLE_TAP_WINDOW) startBarrelRoll();
        lastTapD.current = t;
      }
      if (key === " ") {
        chargeHeld.current = true;
        chargeTime.current = 0;
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      keys.delete(key);
      if (key === " ") {
        chargeHeld.current = false;
        if (chargeTime.current >= CHARGE_TIME) {
          const state = useGameStore.getState();
          const [px, py] = state.playerPosition;
          fireCharged(px, py);
          state.requestShake(0.08, 0.15);
          playSfx("charge");
        } else {
          // Aborted charge — clear the glow state explicitly so the sphere
          // doesn't linger at whatever partial level was last set.
          useGameStore.setState({ chargeLevel: 0 });
        }
        chargeTime.current = 0;
      }
    };

    const onMouseMove = () => {
      usingKeyboard.current = false;
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("mousemove", onMouseMove);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("mousemove", onMouseMove);
      keys.clear();
    };
  }, [startBarrelRoll, fireCharged]);

  useFrame((state, rawDelta) => {
    if (phase !== "playing" || !groupRef.current) return;
    const delta = Math.min(rawDelta, 0.1);
    const gameState = useGameStore.getState();

    const chargeSpeed = gameState.upgrades.includes("quickCharge") ? 2 : 1;
    if (chargeHeld.current) {
      chargeTime.current += delta * chargeSpeed;
      useGameStore.setState({ chargeLevel: Math.min(chargeTime.current / CHARGE_TIME, 1) });
    }

    const kbX =
      (keys.has("d") || keys.has("arrowright") ? 1 : 0) -
      (keys.has("a") || keys.has("arrowleft") ? 1 : 0);
    const kbY =
      (keys.has("w") || keys.has("arrowup") ? 1 : 0) -
      (keys.has("s") || keys.has("arrowdown") ? 1 : 0);

    if (usingKeyboard.current) {
      targetX.current += kbX * KEYBOARD_SPEED * delta;
      targetY.current += kbY * KEYBOARD_SPEED * delta;
    } else {
      const mouse = state.pointer;
      targetX.current = (mouse.x * viewport.width) / 2;
      targetY.current = (mouse.y * viewport.height) / 2;
      targetX.current += kbX * KEYBOARD_SPEED * delta;
      targetY.current += kbY * KEYBOARD_SPEED * delta;
    }

    targetX.current = Math.max(-BOUNDS_X, Math.min(BOUNDS_X, targetX.current));
    targetY.current = Math.max(-BOUNDS_Y, Math.min(BOUNDS_Y, targetY.current));

    currentX.current += (targetX.current - currentX.current) * LERP_FACTOR;
    currentY.current += (targetY.current - currentY.current) * LERP_FACTOR;

    groupRef.current.position.x = currentX.current;
    groupRef.current.position.y = currentY.current;

    const velocityX = targetX.current - currentX.current;
    const targetBank = -(velocityX / BOUNDS_X) * MAX_BANK;
    groupRef.current.rotation.z += (targetBank - groupRef.current.rotation.z) * TILT_LERP;

    const velocityY = targetY.current - currentY.current;
    const targetPitch = (velocityY / BOUNDS_Y) * MAX_PITCH;
    groupRef.current.rotation.x += (targetPitch - groupRef.current.rotation.x) * TILT_LERP;

    if (gameState.isBarrelRolling) {
      barrelRollAngle.current += (delta * (Math.PI * 2)) / 0.4;
      groupRef.current.rotation.z = barrelRollAngle.current;
    } else {
      barrelRollAngle.current = 0;
    }

    if (gameState.isInvulnerable && !gameState.isBarrelRolling) {
      groupRef.current.visible = Math.floor(gameState.invulnerableTimer * 10) % 2 === 0;
    } else {
      groupRef.current.visible = true;
    }

    setPlayerPosition([currentX.current, currentY.current]);

    const rapidFire = gameState.upgrades.includes("rapidFire");
    const wideShot = gameState.upgrades.includes("wideShot");
    const actualFireRate = rapidFire ? FIRE_RATE * 0.6 : FIRE_RATE;

    if (!chargeHeld.current) {
      fireTimer.current -= delta;
      if (fireTimer.current <= 0) {
        fireTimer.current = actualFireRate;
        fireProjectile(currentX.current - 0.2, currentY.current);
        fireProjectile(currentX.current + 0.2, currentY.current);
        if (wideShot) {
          // vx=50 gives a visible ~14° spread that actually reaches enemies
          // a few units off-axis at mid-range (z ~ -20).
          fireProjectile(currentX.current - 0.4, currentY.current, -50);
          fireProjectile(currentX.current + 0.4, currentY.current, 50);
        }
        playSfx("shoot");
      }
    } else {
      fireTimer.current = actualFireRate;
    }
  });

  return (
    <group ref={groupRef} position={[0, 0, 0]}>
      {playerModel && <primitive object={playerModel} rotation={[0, Math.PI, 0]} />}

      {/* Engine glow */}
      <mesh position={[0, 0, 0.5]}>
        <sphereGeometry args={[0.1, 8, 8]} />
        <meshStandardMaterial color="#00ccff" emissive="#00ccff" emissiveIntensity={2} />
      </mesh>

      {/* Charge glow */}
      {chargeLevel > 0 && (
        <mesh position={[0, 0, -0.3]} scale={0.3 + chargeLevel * 0.8}>
          <sphereGeometry args={[0.5, 10, 10]} />
          <meshStandardMaterial
            color="#aaffff"
            emissive="#00ffff"
            emissiveIntensity={chargeLevel * 6}
            transparent
            opacity={0.3 + chargeLevel * 0.4}
            toneMapped={false}
          />
        </mesh>
      )}
    </group>
  );
};
