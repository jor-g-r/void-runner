import { useRef, useState } from "react";
import { useGameStore } from "../stores/gameStore";
import { adoptIntroTrack, fadeOutMusic, playMusic, warmUpSfx } from "../systems/audio";
import { isTouchDevice } from "../systems/platform";
import { lockPortrait, requestFullscreen } from "../systems/fullscreen";

const INTRO_TARGET_VOLUME = 0.55;
const INTRO_FADE_IN_MS = 1200;

export const TitleScreen = () => {
  const startGame = useGameStore((s) => s.startGame);
  const introRef = useRef<HTMLAudioElement>(null);
  const fadeRaf = useRef(0);
  const [ready, setReady] = useState(false);

  const activateAudio = () => {
    if (ready) return;
    // The first tap is a user gesture — the only chance to request
    // fullscreen and a portrait lock on mobile. Fire-and-forget; helpers
    // no-op on desktop and unsupported browsers.
    if (isTouchDevice()) {
      void requestFullscreen().then(() => lockPortrait());
    }
    const audio = introRef.current;
    if (!audio) return;

    audio.volume = 0;
    adoptIntroTrack(audio);
    void audio
      .play()
      .then(() => {
        const t0 = performance.now();
        const step = (now: number) => {
          const t = Math.min(1, (now - t0) / INTRO_FADE_IN_MS);
          audio.volume = Math.max(0, Math.min(1, INTRO_TARGET_VOLUME * t));
          if (t < 1) fadeRaf.current = requestAnimationFrame(step);
        };
        fadeRaf.current = requestAnimationFrame(step);
      })
      .catch(() => {});
    setReady(true);
  };

  const handleStart = (e: React.MouseEvent) => {
    e.stopPropagation();
    warmUpSfx();
    void fadeOutMusic(0.8).then(() => {
      playMusic("stage-00", { loop: true, fadeIn: 1.5 });
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
        color: "#00ddff",
        pointerEvents: "auto",
        cursor: "pointer",
      }}
      onClick={activateAudio}
    >
      <audio ref={introRef} src="/audio/stage-intro.mp3" loop preload="auto" />
      <h1
        style={{
          fontFamily: "'Audiowide', cursive",
          fontSize: "clamp(40px, 11vw, 64px)",
          fontWeight: 400,
          margin: 0,
          padding: "0 16px",
          letterSpacing: "clamp(4px, 1.5vw, 8px)",
          textAlign: "center",
          background: "linear-gradient(180deg, #ff88cc 0%, #cc66ff 25%, #00ddff 60%, #4466ff 100%)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          filter:
            "drop-shadow(0 0 20px rgba(0, 150, 255, 0.6)) drop-shadow(0 0 50px rgba(100, 50, 255, 0.3))",
        }}
      >
        VOID RUNNER
      </h1>

      {ready ? (
        <button
          type="button"
          onClick={handleStart}
          style={{
            marginTop: "40px",
            padding: "12px 40px",
            background: "transparent",
            border: "1px solid #00ddff",
            borderRadius: "4px",
            color: "#00ddff",
            fontFamily: "'Roboto', sans-serif",
            fontSize: "18px",
            letterSpacing: "4px",
            cursor: "pointer",
            textShadow: "0 0 10px #0066ff",
            boxShadow: "0 0 15px rgba(0, 170, 255, 0.3), inset 0 0 15px rgba(0, 170, 255, 0.1)",
            animation: "pulse 2s ease-in-out infinite",
          }}
        >
          START
        </button>
      ) : (
        <p
          style={{
            fontSize: "18px",
            marginTop: "40px",
            opacity: 0.7,
            animation: "pulse 2s ease-in-out infinite",
          }}
        >
          CLICK ANYWHERE
        </p>
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 1; }
        }
      `}</style>
    </div>
  );
};
