import { useState } from "react";
import { isTouchDevice } from "../systems/platform";

// Shown once per session on touch devices. Void Runner's feel depends on
// precise analog aiming and charged-shot timing that don't survive the
// translation to a phone touch screen — and iOS can't hide the browser
// chrome without the user adding the site to their home screen, which
// most casual players won't do. We recommend desktop, but leave a
// PLAY ANYWAY escape for anyone who insists.

export const DesktopOnlyPrompt = () => {
  const touch = isTouchDevice();
  const [dismissed, setDismissed] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!touch || dismissed) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(window.location.origin + window.location.pathname);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // Clipboard API may be blocked in some contexts — silently ignore.
    }
  };

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
        gap: "28px",
        background: "rgba(2, 4, 16, 0.95)",
        backdropFilter: "blur(8px)",
        pointerEvents: "auto",
        fontFamily: "'Audiowide', cursive",
        color: "#00ddff",
        textAlign: "center",
        padding: "40px 24px",
      }}
    >
      <svg
        width="84"
        height="84"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ filter: "drop-shadow(0 0 14px rgba(0, 170, 255, 0.6))" }}
      >
        <rect x="3" y="4" width="18" height="12" rx="1.5" />
        <line x1="8" y1="20" x2="16" y2="20" />
        <line x1="12" y1="16" x2="12" y2="20" />
      </svg>

      <div
        style={{
          fontSize: "20px",
          letterSpacing: "4px",
          background: "linear-gradient(180deg, #ff88cc 0%, #00ddff 100%)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
        }}
      >
        BEST ON DESKTOP
      </div>

      <div
        style={{
          fontFamily: "'Roboto', sans-serif",
          fontSize: "13px",
          letterSpacing: "1.5px",
          opacity: 0.75,
          maxWidth: "300px",
          lineHeight: 1.55,
        }}
      >
        VOID RUNNER IS TUNED FOR KEYBOARD + MOUSE.
        <br />
        OPEN THIS LINK ON A COMPUTER FOR THE FULL EXPERIENCE.
      </div>

      <button
        type="button"
        onClick={handleCopy}
        style={{
          padding: "12px 28px",
          background: "transparent",
          border: "1px solid #00ddff",
          borderRadius: "4px",
          color: "#00ddff",
          fontFamily: "'Audiowide', cursive",
          fontSize: "13px",
          letterSpacing: "3px",
          cursor: "pointer",
          textShadow: "0 0 10px #0066ff",
          boxShadow: "0 0 15px rgba(0, 170, 255, 0.3), inset 0 0 15px rgba(0, 170, 255, 0.1)",
          minWidth: "200px",
        }}
      >
        {copied ? "COPIED!" : "COPY LINK"}
      </button>

      <button
        type="button"
        onClick={() => setDismissed(true)}
        style={{
          marginTop: "8px",
          padding: "6px 20px",
          background: "transparent",
          border: "none",
          color: "rgba(0, 221, 255, 0.5)",
          fontFamily: "'Roboto', sans-serif",
          fontSize: "11px",
          letterSpacing: "3px",
          cursor: "pointer",
          textDecoration: "underline",
        }}
      >
        PLAY ANYWAY
      </button>
    </div>
  );
};
