import { useEffect } from "react";
import { useGameStore } from "../stores/gameStore";
import { fadeOutMusic, playMusic } from "../systems/audio";

export const Victory = () => {
  const score = useGameStore((s) => s.score);
  const startGame = useGameStore((s) => s.startGame);

  useEffect(() => {
    void fadeOutMusic(2.0);
  }, []);

  const handleRestart = () => {
    void fadeOutMusic(0.4).then(() => {
      playMusic("stage-00", { loop: true, fadeIn: 1.2 });
    });
    startGame();
  };

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "'Roboto', sans-serif",
        color: "#00ffcc",
        pointerEvents: "auto",
        cursor: "pointer",
        background: "rgba(0, 0, 0, 0.4)",
      }}
      onClick={handleRestart}
    >
      <h1
        style={{
          fontFamily: "'Audiowide', cursive",
          fontSize: "52px",
          fontWeight: 400,
          margin: 0,
          textShadow: "0 0 30px #00ffaa, 0 0 60px #008866",
        }}
      >
        MISSION COMPLETE
      </h1>
      <p
        style={{
          fontSize: "24px",
          color: "#00ddff",
          marginTop: "20px",
          textShadow: "0 0 10px #0066ff",
        }}
      >
        SCORE: {score.toString().padStart(8, "0")}
      </p>
      <p
        style={{
          fontSize: "16px",
          marginTop: "30px",
          opacity: 0.7,
          color: "#ffffff",
          animation: "pulse 2s ease-in-out infinite",
        }}
      >
        CLICK TO PLAY AGAIN
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
