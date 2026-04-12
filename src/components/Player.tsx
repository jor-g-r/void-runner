import { useRef, useEffect } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import type { Mesh } from "three";
import { useGameStore } from "../stores/gameStore";

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

export const Player = () => {
  const meshRef = useRef<Mesh>(null);
  const targetX = useRef(0);
  const targetY = useRef(0);
  const currentX = useRef(0);
  const currentY = useRef(0);
  const fireTimer = useRef(0);
  const usingKeyboard = useRef(false);
  const chargeHeld = useRef(false);
  const chargeTime = useRef(0);
  const barrelRollAngle = useRef(0);

  // Double-tap detection for barrel roll
  const lastTapA = useRef(0);
  const lastTapD = useRef(0);

  const { viewport } = useThree();
  const setPlayerPosition = useGameStore((s) => s.setPlayerPosition);
  const fireProjectile = useGameStore((s) => s.firePlayerProjectile);
  const fireCharged = useGameStore((s) => s.fireChargedShot);
  const startBarrelRoll = useGameStore((s) => s.startBarrelRoll);
  const phase = useGameStore((s) => s.phase);

  useEffect(() => {
    const now = () => performance.now() / 1000;

    const onKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (keys.has(key)) return; // Ignore held repeats
      keys.add(key);

      if (["w", "a", "s", "d", "arrowup", "arrowdown", "arrowleft", "arrowright"].includes(key)) {
        usingKeyboard.current = true;
      }

      // Double-tap A for barrel roll left
      if (key === "a" || key === "arrowleft") {
        const t = now();
        if (t - lastTapA.current < DOUBLE_TAP_WINDOW) {
          startBarrelRoll();
        }
        lastTapA.current = t;
      }

      // Double-tap D for barrel roll right
      if (key === "d" || key === "arrowright") {
        const t = now();
        if (t - lastTapD.current < DOUBLE_TAP_WINDOW) {
          startBarrelRoll();
        }
        lastTapD.current = t;
      }

      // Spacebar = start charging
      if (key === " ") {
        chargeHeld.current = true;
        chargeTime.current = 0;
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      keys.delete(key);

      // Spacebar release = fire charged shot if ready
      if (key === " ") {
        chargeHeld.current = false;
        if (chargeTime.current >= CHARGE_TIME) {
          const state = useGameStore.getState();
          const [px, py] = state.playerPosition;
          fireCharged(px, py);
          state.requestShake(0.08, 0.15);
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
    if (phase !== "playing" || !meshRef.current) return;
    const delta = Math.min(rawDelta, 0.1);
    const gameState = useGameStore.getState();

    // --- Charge tracking (quickCharge upgrade = 2x faster) ---
    const chargeSpeed = gameState.upgrades.includes("quickCharge") ? 2 : 1;
    if (chargeHeld.current) {
      chargeTime.current += delta * chargeSpeed;
      useGameStore.setState({ chargeLevel: Math.min(chargeTime.current / CHARGE_TIME, 1) });
    }

    // --- Input ---
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

    meshRef.current.position.x = currentX.current;
    meshRef.current.position.y = currentY.current;

    // --- Tilt ---
    const velocityX = targetX.current - currentX.current;
    const targetBank = -(velocityX / BOUNDS_X) * MAX_BANK;
    meshRef.current.rotation.z +=
      (targetBank - meshRef.current.rotation.z) * TILT_LERP;

    const velocityY = targetY.current - currentY.current;
    const targetPitch = (velocityY / BOUNDS_Y) * MAX_PITCH;
    meshRef.current.rotation.x +=
      (targetPitch - meshRef.current.rotation.x) * TILT_LERP;

    // --- Barrel roll animation ---
    if (gameState.isBarrelRolling) {
      barrelRollAngle.current += delta * (Math.PI * 2) / 0.4; // Full rotation in 0.4s
      meshRef.current.rotation.z = barrelRollAngle.current;
    } else {
      barrelRollAngle.current = 0;
    }

    // --- Invulnerability blink ---
    if (gameState.isInvulnerable && !gameState.isBarrelRolling) {
      meshRef.current.visible = Math.floor(gameState.invulnerableTimer * 10) % 2 === 0;
    } else {
      meshRef.current.visible = true;
    }

    setPlayerPosition([currentX.current, currentY.current]);

    // --- Auto-fire (paused while charging) ---
    const rapidFire = gameState.upgrades.includes("rapidFire");
    const wideShot = gameState.upgrades.includes("wideShot");
    const actualFireRate = rapidFire ? FIRE_RATE * 0.6 : FIRE_RATE;

    if (!chargeHeld.current) {
      fireTimer.current -= delta;
      if (fireTimer.current <= 0) {
        fireTimer.current = actualFireRate;
        fireProjectile(currentX.current - 0.2, currentY.current);
        fireProjectile(currentX.current + 0.2, currentY.current);

        // Wide shot: 2 angled side lasers
        if (wideShot) {
          fireProjectile(currentX.current - 0.4, currentY.current, -15);
          fireProjectile(currentX.current + 0.4, currentY.current, 15);
        }
      }
    } else {
      fireTimer.current = actualFireRate;
    }
  });

  const chargeLevel = useGameStore((s) => s.chargeLevel);

  return (
    <mesh ref={meshRef} position={[0, 0, 0]} scale={0.65}>
      <group>
        <mesh>
          <coneGeometry args={[0.3, 1.2, 4]} />
          <meshStandardMaterial color="#4488ff" emissive="#2244aa" emissiveIntensity={0.5} />
        </mesh>
        <mesh position={[-0.6, 0, 0.2]} rotation={[0, 0, -0.3]}>
          <boxGeometry args={[0.8, 0.05, 0.4]} />
          <meshStandardMaterial color="#3366dd" emissive="#1133aa" emissiveIntensity={0.3} />
        </mesh>
        <mesh position={[0.6, 0, 0.2]} rotation={[0, 0, 0.3]}>
          <boxGeometry args={[0.8, 0.05, 0.4]} />
          <meshStandardMaterial color="#3366dd" emissive="#1133aa" emissiveIntensity={0.3} />
        </mesh>
        <mesh position={[0, 0, 0.6]}>
          <sphereGeometry args={[0.12, 8, 8]} />
          <meshStandardMaterial color="#00ccff" emissive="#00ccff" emissiveIntensity={2} />
        </mesh>
        {/* Charge glow — scales up with charge level */}
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
    </mesh>
  );
};
