import { useEffect, useRef, useState } from "react";
import { touchInput } from "../systems/touchInput";

const JOYSTICK_SIZE = 130;
const STICK_SIZE = 56;
const DEAD_ZONE = 0.12;
const BUTTON_SIZE_ROLL = 64;
const BUTTON_SIZE_CHARGE = 84;

// Virtual joystick (left) + roll / charge buttons (right). Writes to the
// shared touchInput module so Player.tsx can read axes and button state
// each frame without triggering React renders.
export const TouchControls = () => {
  const padRef = useRef<HTMLDivElement>(null);
  const joyPointerId = useRef<number | null>(null);
  const rollPointerId = useRef<number | null>(null);
  const chargePointerId = useRef<number | null>(null);
  const [stickOffset, setStickOffset] = useState({ x: 0, y: 0 });
  const [rollActive, setRollActive] = useState(false);
  const [chargeActive, setChargeActive] = useState(false);

  useEffect(() => {
    touchInput.active = true;
    return () => {
      touchInput.active = false;
      touchInput.axisX = 0;
      touchInput.axisY = 0;
      touchInput.rollPulse = false;
      touchInput.chargeHeld = false;
    };
  }, []);

  const updateJoystick = (clientX: number, clientY: number) => {
    const pad = padRef.current;
    if (!pad) return;
    const rect = pad.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = clientX - cx;
    const dy = clientY - cy;
    const radius = rect.width / 2 - STICK_SIZE / 4;
    const dist = Math.hypot(dx, dy);
    const clampedDist = Math.min(dist, radius);
    const nx = dist > 0 ? (dx / dist) * clampedDist : 0;
    const ny = dist > 0 ? (dy / dist) * clampedDist : 0;
    setStickOffset({ x: nx, y: ny });

    let ax = nx / radius;
    let ay = -ny / radius; // invert: screen-down is axis-negative
    if (Math.abs(ax) < DEAD_ZONE) ax = 0;
    if (Math.abs(ay) < DEAD_ZONE) ay = 0;
    touchInput.axisX = Math.max(-1, Math.min(1, ax));
    touchInput.axisY = Math.max(-1, Math.min(1, ay));
  };

  const resetJoystick = () => {
    setStickOffset({ x: 0, y: 0 });
    touchInput.axisX = 0;
    touchInput.axisY = 0;
  };

  const onJoyDown = (e: React.PointerEvent) => {
    if (joyPointerId.current !== null) return;
    joyPointerId.current = e.pointerId;
    (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
    updateJoystick(e.clientX, e.clientY);
  };
  const onJoyMove = (e: React.PointerEvent) => {
    if (joyPointerId.current !== e.pointerId) return;
    updateJoystick(e.clientX, e.clientY);
  };
  const onJoyUp = (e: React.PointerEvent) => {
    if (joyPointerId.current !== e.pointerId) return;
    joyPointerId.current = null;
    resetJoystick();
  };

  const onRollDown = (e: React.PointerEvent) => {
    if (rollPointerId.current !== null) return;
    rollPointerId.current = e.pointerId;
    (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
    touchInput.rollPulse = true;
    setRollActive(true);
  };
  const onRollUp = (e: React.PointerEvent) => {
    if (rollPointerId.current !== e.pointerId) return;
    rollPointerId.current = null;
    setRollActive(false);
  };

  const onChargeDown = (e: React.PointerEvent) => {
    if (chargePointerId.current !== null) return;
    chargePointerId.current = e.pointerId;
    (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
    touchInput.chargeHeld = true;
    setChargeActive(true);
  };
  const onChargeUp = (e: React.PointerEvent) => {
    if (chargePointerId.current !== e.pointerId) return;
    chargePointerId.current = null;
    touchInput.chargeHeld = false;
    setChargeActive(false);
  };

  return (
    <>
      <div
        ref={padRef}
        onPointerDown={onJoyDown}
        onPointerMove={onJoyMove}
        onPointerUp={onJoyUp}
        onPointerCancel={onJoyUp}
        style={{
          position: "fixed",
          left: "24px",
          bottom: "32px",
          width: `${JOYSTICK_SIZE}px`,
          height: `${JOYSTICK_SIZE}px`,
          borderRadius: "50%",
          border: "2px solid rgba(0, 221, 255, 0.35)",
          background: "rgba(0, 20, 40, 0.28)",
          boxShadow: "0 0 12px rgba(0, 170, 255, 0.25), inset 0 0 20px rgba(0, 170, 255, 0.1)",
          pointerEvents: "auto",
          touchAction: "none",
          zIndex: 10,
        }}
      >
        <div
          style={{
            position: "absolute",
            left: `${JOYSTICK_SIZE / 2 - STICK_SIZE / 2}px`,
            top: `${JOYSTICK_SIZE / 2 - STICK_SIZE / 2}px`,
            width: `${STICK_SIZE}px`,
            height: `${STICK_SIZE}px`,
            borderRadius: "50%",
            background:
              "radial-gradient(circle at 35% 30%, rgba(0, 221, 255, 0.9), rgba(80, 20, 120, 0.85) 70%)",
            border: "1px solid rgba(0, 221, 255, 0.8)",
            boxShadow: "0 0 14px rgba(0, 170, 255, 0.6)",
            transform: `translate(${stickOffset.x}px, ${stickOffset.y}px)`,
            transition: joyPointerId.current === null ? "transform 0.12s" : "none",
            pointerEvents: "none",
          }}
        />
      </div>

      <div
        style={{
          position: "fixed",
          right: "24px",
          bottom: "32px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "14px",
          pointerEvents: "none",
          zIndex: 10,
        }}
      >
        <button
          type="button"
          onPointerDown={onRollDown}
          onPointerUp={onRollUp}
          onPointerCancel={onRollUp}
          aria-label="Barrel roll"
          style={{
            width: `${BUTTON_SIZE_ROLL}px`,
            height: `${BUTTON_SIZE_ROLL}px`,
            borderRadius: "50%",
            border: `1px solid ${rollActive ? "#ff88cc" : "rgba(255, 136, 204, 0.6)"}`,
            background: rollActive ? "rgba(255, 136, 204, 0.3)" : "rgba(60, 10, 50, 0.45)",
            color: "#ff88cc",
            fontFamily: "'Audiowide', cursive",
            fontSize: "11px",
            letterSpacing: "2px",
            boxShadow: "0 0 10px rgba(255, 100, 200, 0.35)",
            pointerEvents: "auto",
            touchAction: "none",
            padding: 0,
          }}
        >
          ROLL
        </button>
        <button
          type="button"
          onPointerDown={onChargeDown}
          onPointerUp={onChargeUp}
          onPointerCancel={onChargeUp}
          aria-label="Charged shot"
          style={{
            width: `${BUTTON_SIZE_CHARGE}px`,
            height: `${BUTTON_SIZE_CHARGE}px`,
            borderRadius: "50%",
            border: `2px solid ${chargeActive ? "#00ffff" : "rgba(0, 221, 255, 0.7)"}`,
            background: chargeActive ? "rgba(0, 221, 255, 0.35)" : "rgba(0, 30, 50, 0.5)",
            color: "#00ddff",
            fontFamily: "'Audiowide', cursive",
            fontSize: "12px",
            letterSpacing: "2px",
            boxShadow: "0 0 14px rgba(0, 170, 255, 0.5)",
            pointerEvents: "auto",
            touchAction: "none",
            padding: 0,
          }}
        >
          CHARGE
        </button>
      </div>
    </>
  );
};
