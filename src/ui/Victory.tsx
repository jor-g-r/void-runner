import { useEffect } from "react";
import { useGameStore } from "../stores/gameStore";
import { fadeOutMusic, playMusic } from "../systems/audio";
import { Leaderboard } from "./Leaderboard";
import { NameEntry } from "./NameEntry";
import { useEndRunSubmit } from "./useEndRunSubmit";

export const Victory = () => {
  const score = useGameStore((s) => s.score);
  const startGame = useGameStore((s) => s.startGame);
  const scoreSubmitted = useGameStore((s) => s.scoreSubmitted);
  const playerName = useGameStore((s) => s.playerName);

  const { rows, highlightId, submitting, error, enabled, submit } = useEndRunSubmit(true);

  useEffect(() => {
    void fadeOutMusic(2.0);
  }, []);

  const handleRestart = () => {
    void fadeOutMusic(0.4).then(() => {
      playMusic("stage-00", { loop: true, fadeIn: 1.2 });
    });
    startGame();
  };

  const showNameEntry = enabled && !scoreSubmitted;

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "18px",
        fontFamily: "'Roboto', sans-serif",
        color: "#00ffcc",
        pointerEvents: "auto",
        background: "rgba(0, 0, 0, 0.4)",
        overflowY: "auto",
        padding: "40px 16px",
      }}
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
          margin: 0,
          textShadow: "0 0 10px #0066ff",
        }}
      >
        SCORE: {score.toString().padStart(8, "0")}
      </p>

      {showNameEntry ? (
        <NameEntry
          initialName={playerName}
          submitting={submitting}
          error={error}
          onSubmit={submit}
        />
      ) : (
        <Leaderboard rows={rows} highlightId={highlightId} />
      )}

      <button
        type="button"
        onClick={handleRestart}
        style={{
          marginTop: "8px",
          padding: "12px 36px",
          background: "transparent",
          border: "1px solid #00ddff",
          borderRadius: "4px",
          color: "#00ddff",
          fontFamily: "'Roboto', sans-serif",
          fontSize: "16px",
          letterSpacing: "4px",
          cursor: "pointer",
          textShadow: "0 0 10px #0066ff",
          boxShadow: "0 0 15px rgba(0, 170, 255, 0.3), inset 0 0 15px rgba(0, 170, 255, 0.1)",
          animation: "pulse 2s ease-in-out infinite",
        }}
      >
        PLAY AGAIN
      </button>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 1; }
        }
      `}</style>
    </div>
  );
};
