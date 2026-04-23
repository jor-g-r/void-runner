import { useEffect } from "react";
import { useGameStore } from "../stores/gameStore";
import { isTouchDevice } from "../systems/platform";

const KEYBOARD_CONTROLS = [
  { keys: ["MOUSE", "/", "WASD"], label: "MOVE" },
  { keys: ["DOUBLE-TAP", "A", "/", "D"], label: "BARREL ROLL" },
  { keys: ["HOLD", "SPACE"], label: "CHARGED SHOT" },
  { keys: ["AUTO-FIRE"], label: "ALWAYS ON" },
];

const TOUCH_CONTROLS = [
  { keys: ["JOYSTICK"], label: "MOVE" },
  { keys: ["TAP", "ROLL"], label: "BARREL ROLL" },
  { keys: ["HOLD", "CHARGE"], label: "CHARGED SHOT" },
  { keys: ["AUTO-FIRE"], label: "ALWAYS ON" },
];

export const ControlsModal = () => {
  const beginPlaying = useGameStore((s) => s.beginPlaying);
  const touch = isTouchDevice();
  const controls = touch ? TOUCH_CONTROLS : KEYBOARD_CONTROLS;

  // Enter / Space as keyboard accelerator only — no "any key dismiss" so we
  // don't swallow the first input the player meant for gameplay.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        beginPlaying();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [beginPlaying]);

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(2, 4, 16, 0.72)",
        backdropFilter: "blur(4px)",
        pointerEvents: "auto",
        fontFamily: "'Roboto', sans-serif",
      }}
    >
      <div
        style={{
          width: "min(440px, calc(100vw - 32px))",
          boxSizing: "border-box",
          padding: "clamp(24px, 6vw, 40px) clamp(24px, 7vw, 56px) clamp(20px, 5vw, 36px)",
          border: "1px solid rgba(0, 221, 255, 0.55)",
          borderRadius: "6px",
          background:
            "linear-gradient(160deg, rgba(40, 10, 60, 0.65) 0%, rgba(5, 15, 50, 0.75) 100%)",
          boxShadow: "0 0 40px rgba(0, 170, 255, 0.35), inset 0 0 40px rgba(180, 80, 255, 0.08)",
          textAlign: "center",
        }}
      >
        <h2
          style={{
            fontFamily: "'Audiowide', cursive",
            fontSize: "28px",
            fontWeight: 400,
            margin: "0 0 28px",
            letterSpacing: "6px",
            background: "linear-gradient(180deg, #ff88cc 0%, #cc66ff 40%, #00ddff 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            filter: "drop-shadow(0 0 12px rgba(150, 80, 255, 0.5))",
          }}
        >
          CONTROLS
        </h2>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "14px",
            marginBottom: "32px",
          }}
        >
          {controls.map((row) => (
            <div
              key={row.label}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "24px",
              }}
            >
              <div style={{ display: "flex", gap: "6px" }}>
                {row.keys.map((k, i) => (
                  <span
                    key={`${row.label}-${i}`}
                    style={{
                      padding: k === "/" ? "0" : "4px 10px",
                      border: k === "/" ? "none" : "1px solid rgba(0, 221, 255, 0.6)",
                      borderRadius: "3px",
                      background: k === "/" ? "transparent" : "rgba(0, 221, 255, 0.08)",
                      color: "#e0f6ff",
                      fontSize: "12px",
                      letterSpacing: "2px",
                      fontFamily: "'Audiowide', cursive",
                      boxShadow: k === "/" ? "none" : "inset 0 0 8px rgba(0, 170, 255, 0.15)",
                    }}
                  >
                    {k}
                  </span>
                ))}
              </div>
              <span
                style={{
                  color: "#ff88cc",
                  fontSize: "13px",
                  letterSpacing: "3px",
                  textShadow: "0 0 10px rgba(255, 100, 200, 0.5)",
                }}
              >
                {row.label}
              </span>
            </div>
          ))}
        </div>

        <div
          style={{
            paddingTop: "20px",
            borderTop: "1px solid rgba(0, 221, 255, 0.2)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "10px",
          }}
        >
          <button
            type="button"
            onClick={beginPlaying}
            style={{
              padding: "12px 44px",
              background: "transparent",
              border: "1px solid #00ddff",
              borderRadius: "4px",
              color: "#00ddff",
              fontFamily: "'Audiowide', cursive",
              fontSize: "18px",
              letterSpacing: "6px",
              cursor: "pointer",
              textShadow: "0 0 10px #0066ff",
              boxShadow: "0 0 15px rgba(0, 170, 255, 0.35), inset 0 0 15px rgba(0, 170, 255, 0.12)",
              animation: "modalPulse 2s ease-in-out infinite",
            }}
          >
            LAUNCH
          </button>
          {!touch && (
            <span
              style={{
                color: "rgba(160, 200, 220, 0.55)",
                fontSize: "11px",
                letterSpacing: "3px",
              }}
            >
              OR PRESS ENTER
            </span>
          )}
        </div>
      </div>

      <style>{`
        @keyframes modalPulse {
          0%, 100% { box-shadow: 0 0 15px rgba(0, 170, 255, 0.35), inset 0 0 15px rgba(0, 170, 255, 0.12); }
          50% { box-shadow: 0 0 30px rgba(0, 170, 255, 0.6), inset 0 0 20px rgba(0, 170, 255, 0.2); }
        }
      `}</style>
    </div>
  );
};
