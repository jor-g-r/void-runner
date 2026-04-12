import { useGameStore } from "../stores/gameStore";

export const HUD = () => {
  const score = useGameStore((s) => s.score);
  const playerHP = useGameStore((s) => s.playerHP);
  const playerMaxHP = useGameStore((s) => s.playerMaxHP);
  const chargeLevel = useGameStore((s) => s.chargeLevel);
  const barrelRollCooldown = useGameStore((s) => s.barrelRollCooldown);

  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        padding: "20px 30px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        pointerEvents: "none",
        fontFamily: "'Courier New', monospace",
        color: "#00ddff",
        fontSize: "18px",
        textShadow: "0 0 10px #00aaff",
      }}
    >
      <div>
        <div style={{ fontSize: "14px", opacity: 0.7 }}>HULL</div>
        <div style={{ display: "flex", gap: "4px", marginTop: "4px" }}>
          {Array.from({ length: playerMaxHP }).map((_, i) => (
            <div
              key={i}
              style={{
                width: "24px",
                height: "8px",
                background: i < playerHP ? "#00ddff" : "#223344",
                boxShadow: i < playerHP ? "0 0 6px #00aaff" : "none",
              }}
            />
          ))}
        </div>

        {/* Barrel roll cooldown */}
        <div style={{ fontSize: "12px", opacity: 0.5, marginTop: "8px" }}>
          ROLL {barrelRollCooldown > 0
            ? `${barrelRollCooldown.toFixed(1)}s`
            : "READY"}
        </div>
      </div>

      {/* Charge indicator — bottom center */}
      {chargeLevel > 0 && (
        <div
          style={{
            position: "fixed",
            bottom: "40px",
            left: "50%",
            transform: "translateX(-50%)",
            width: "120px",
          }}
        >
          <div style={{
            height: "4px",
            background: "#223344",
            borderRadius: "2px",
          }}>
            <div style={{
              height: "100%",
              width: `${chargeLevel * 100}%`,
              background: chargeLevel >= 1 ? "#00ffff" : "#0088aa",
              boxShadow: chargeLevel >= 1 ? "0 0 10px #00ffff" : "none",
              borderRadius: "2px",
              transition: "background 0.1s",
            }} />
          </div>
          <div style={{
            fontSize: "10px",
            textAlign: "center",
            marginTop: "4px",
            opacity: 0.6,
            color: chargeLevel >= 1 ? "#00ffff" : "#0088aa",
          }}>
            {chargeLevel >= 1 ? "RELEASE!" : "CHARGING"}
          </div>
        </div>
      )}

      <div style={{ textAlign: "right" }}>
        <div style={{ fontSize: "14px", opacity: 0.7 }}>SCORE</div>
        <div style={{ fontSize: "24px", fontWeight: "bold" }}>
          {score.toString().padStart(8, "0")}
        </div>
      </div>
    </div>
  );
};
