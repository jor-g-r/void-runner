import { useEffect } from "react";
import { useGameStore } from "../stores/gameStore";
import { fadeOutMusic, playMusic } from "../systems/audio";
import { Leaderboard } from "./Leaderboard";
import { NameEntry } from "./NameEntry";
import { useEndRunSubmit } from "./useEndRunSubmit";

export const GameOver = () => {
  const score = useGameStore((s) => s.score);
  const startGame = useGameStore((s) => s.startGame);
  const scoreSubmitted = useGameStore((s) => s.scoreSubmitted);
  const playerName = useGameStore((s) => s.playerName);

  const { rows, highlightId, submitting, error, enabled, submit } = useEndRunSubmit(false);

  useEffect(() => {
    void fadeOutMusic(1.5);
  }, []);

  const handleRetry = () => {
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
        color: "#ff4444",
        pointerEvents: "auto",
        background: "rgba(0, 0, 0, 0.5)",
        overflowY: "auto",
        padding: "40px 16px",
      }}
    >
      <h1
        style={{
          fontFamily: "'Audiowide', cursive",
          fontSize: "48px",
          fontWeight: 400,
          margin: 0,
          textShadow: "0 0 20px #ff0000",
        }}
      >
        DESTROYED
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
        onClick={handleRetry}
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
        RETRY
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
