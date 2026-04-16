import { useEffect, useSyncExternalStore } from "react";
import { isMuted, subscribeMuted, toggleMuted } from "../systems/audio";

const SpeakerOn = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
    <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
  </svg>
);

const SpeakerOff = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
    <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" />
  </svg>
);

export const MuteButton = () => {
  const muted = useSyncExternalStore(subscribeMuted, isMuted, () => false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "m" && !e.ctrlKey && !e.metaKey && !e.altKey) {
        toggleMuted();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleMuted();
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      onPointerDown={(e) => e.stopPropagation()}
      aria-label={muted ? "Unmute audio" : "Mute audio"}
      style={{
        position: "fixed",
        right: "20px",
        bottom: "20px",
        width: "40px",
        height: "40px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0, 20, 40, 0.5)",
        border: "1px solid rgba(0, 221, 255, 0.4)",
        borderRadius: "6px",
        color: muted ? "#ff5577" : "#00ddff",
        cursor: "pointer",
        pointerEvents: "auto",
        zIndex: 10,
        padding: 0,
        boxShadow: "0 0 8px rgba(0, 170, 255, 0.3)",
        transition: "color 0.15s, border-color 0.15s",
      }}
    >
      {muted ? <SpeakerOff /> : <SpeakerOn />}
    </button>
  );
};
