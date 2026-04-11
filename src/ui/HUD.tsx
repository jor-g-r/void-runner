import { useGameStore } from "../stores/gameStore";

export const HUD = () => {
  const score = useGameStore((s) => s.score);
  const playerHP = useGameStore((s) => s.playerHP);
  const playerMaxHP = useGameStore((s) => s.playerMaxHP);

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
      </div>
      <div style={{ textAlign: "right" }}>
        <div style={{ fontSize: "14px", opacity: 0.7 }}>SCORE</div>
        <div style={{ fontSize: "24px", fontWeight: "bold" }}>
          {score.toString().padStart(8, "0")}
        </div>
      </div>
    </div>
  );
};
