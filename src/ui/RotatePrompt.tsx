import { useEffect, useState } from "react";
import { isTouchDevice } from "../systems/platform";

// Shown over everything when the device is touch + portrait. iOS Safari
// (and all iPhone browsers, since they share WebKit) doesn't expose the
// Fullscreen API for non-video elements, so we can't programmatically
// rotate the screen — the user has to do it. The prompt blocks input
// underneath until they rotate (or explicitly dismiss for this session).

export const RotatePrompt = () => {
  const touch = isTouchDevice();
  const [isPortrait, setIsPortrait] = useState(() =>
    typeof window !== "undefined" ? window.matchMedia("(orientation: portrait)").matches : false,
  );
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!touch) return;
    const mql = window.matchMedia("(orientation: portrait)");
    const handler = (e: MediaQueryListEvent) => setIsPortrait(e.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, [touch]);

  if (!touch || !isPortrait || dismissed) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "32px",
        background: "rgba(2, 4, 16, 0.92)",
        backdropFilter: "blur(8px)",
        pointerEvents: "auto",
        fontFamily: "'Audiowide', cursive",
        color: "#00ddff",
        textAlign: "center",
        padding: "32px",
      }}
    >
      <svg
        width="120"
        height="120"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{
          filter: "drop-shadow(0 0 14px rgba(0, 170, 255, 0.6))",
          animation: "rotateHint 2.4s ease-in-out infinite",
        }}
      >
        <rect x="7" y="2" width="10" height="20" rx="2" />
        <line x1="11" y1="18" x2="13" y2="18" />
        <path d="M3 9 a9 9 0 0 1 9 -7" stroke="#ff88cc" />
        <polyline points="3,3 3,9 9,9" stroke="#ff88cc" />
      </svg>

      <div
        style={{
          fontSize: "22px",
          letterSpacing: "4px",
          background: "linear-gradient(180deg, #ff88cc 0%, #00ddff 100%)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
        }}
      >
        ROTATE YOUR PHONE
      </div>
      <div
        style={{
          fontFamily: "'Roboto', sans-serif",
          fontSize: "13px",
          letterSpacing: "2px",
          opacity: 0.7,
          maxWidth: "260px",
          lineHeight: 1.5,
        }}
      >
        VOID RUNNER IS DESIGNED FOR LANDSCAPE
      </div>

      <button
        type="button"
        onClick={() => setDismissed(true)}
        style={{
          marginTop: "16px",
          padding: "8px 24px",
          background: "transparent",
          border: "1px solid rgba(0, 221, 255, 0.4)",
          borderRadius: "4px",
          color: "rgba(0, 221, 255, 0.7)",
          fontFamily: "'Roboto', sans-serif",
          fontSize: "11px",
          letterSpacing: "3px",
          cursor: "pointer",
        }}
      >
        PLAY IN PORTRAIT
      </button>

      <style>{`
        @keyframes rotateHint {
          0%, 20% { transform: rotate(0deg); }
          50%, 70% { transform: rotate(-90deg); }
          100% { transform: rotate(0deg); }
        }
      `}</style>
    </div>
  );
};
