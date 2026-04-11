import { useGameStore } from "../stores/gameStore";

export const TitleScreen = () => {
  const startGame = useGameStore((s) => s.startGame);

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "'Courier New', monospace",
        color: "#00ddff",
        pointerEvents: "auto",
        cursor: "pointer",
      }}
      onClick={startGame}
    >
      <h1
        style={{
          fontSize: "64px",
          fontWeight: "bold",
          margin: 0,
          textShadow: "0 0 30px #0066ff, 0 0 60px #003399",
          letterSpacing: "8px",
        }}
      >
        VOID RUNNER
      </h1>
      <p
        style={{
          fontSize: "18px",
          marginTop: "40px",
          opacity: 0.7,
          animation: "pulse 2s ease-in-out infinite",
        }}
      >
        CLICK TO START
      </p>
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 1; }
        }
      `}</style>
    </div>
  );
};
