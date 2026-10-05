import { useState } from "react";
import { isClean } from "../lib/profanity";

type Props = {
  initialName: string;
  submitting: boolean;
  error: string | null;
  onSubmit: (name: string) => void;
};

const ALLOWED_CHAR = /[A-Za-z0-9 _.-]/;
const MIN_LEN = 3;
const MAX_LEN = 12;

const sanitize = (raw: string): string => {
  let out = "";
  for (const ch of raw) {
    if (ALLOWED_CHAR.test(ch)) out += ch;
    if (out.length >= MAX_LEN) break;
  }
  return out;
};

export const NameEntry = ({ initialName, submitting, error, onSubmit }: Props) => {
  const [name, setName] = useState(() => sanitize(initialName));
  const [localError, setLocalError] = useState<string | null>(null);

  const trimmed = name.trim();
  const tooShort = trimmed.length < MIN_LEN;
  const dirty = trimmed.length > 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    if (tooShort) {
      setLocalError(`MIN ${MIN_LEN} CHARACTERS`);
      return;
    }
    if (!isClean(trimmed)) {
      setLocalError("PICK ANOTHER NAME");
      return;
    }
    setLocalError(null);
    onSubmit(trimmed);
  };

  const displayedError = localError ?? error;

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "10px",
        marginTop: "20px",
      }}
    >
      <label
        htmlFor="name-entry"
        style={{
          fontFamily: "'Audiowide', cursive",
          fontSize: "14px",
          letterSpacing: "3px",
          color: "#ff88cc",
          textShadow: "0 0 10px #cc66ff",
        }}
      >
        ENTER PILOT TAG
      </label>
      <input
        id="name-entry"
        type="text"
        autoFocus
        spellCheck={false}
        autoComplete="off"
        maxLength={MAX_LEN}
        disabled={submitting}
        value={name}
        onChange={(e) => {
          setName(sanitize(e.target.value));
          setLocalError(null);
        }}
        placeholder="ACE"
        style={{
          fontFamily: "'Audiowide', cursive",
          fontSize: "22px",
          letterSpacing: "6px",
          textAlign: "center",
          textTransform: "uppercase",
          width: "240px",
          padding: "10px 12px",
          background: "rgba(0, 10, 30, 0.5)",
          border: "1px solid #00ddff",
          borderRadius: "4px",
          color: "#00ddff",
          textShadow: "0 0 10px #0066ff",
          boxShadow: "0 0 12px rgba(0, 170, 255, 0.35), inset 0 0 12px rgba(0, 170, 255, 0.1)",
          outline: "none",
        }}
      />
      <button
        type="submit"
        disabled={submitting || tooShort || !dirty}
        style={{
          padding: "10px 32px",
          background: "transparent",
          border: "1px solid #00ddff",
          borderRadius: "4px",
          color: "#00ddff",
          fontFamily: "'Roboto', sans-serif",
          fontSize: "16px",
          letterSpacing: "4px",
          cursor: submitting || tooShort ? "not-allowed" : "pointer",
          opacity: submitting || tooShort ? 0.5 : 1,
          textShadow: "0 0 10px #0066ff",
          boxShadow: "0 0 15px rgba(0, 170, 255, 0.3), inset 0 0 15px rgba(0, 170, 255, 0.1)",
        }}
      >
        {submitting ? "SUBMITTING…" : "SUBMIT"}
      </button>
      {displayedError && (
        <p style={{ color: "#ff6688", fontSize: "12px", letterSpacing: "2px", margin: 0 }}>
          {displayedError}
        </p>
      )}
    </form>
  );
};
