import type { ScoreRow } from "../lib/leaderboard";

type Props = {
  rows: ScoreRow[] | null;
  highlightId?: string | null;
  title?: string;
  compact?: boolean;
};

const formatScore = (n: number) => n.toString().padStart(8, "0");

const formatDuration = (ms: number) => {
  const totalSeconds = Math.floor(ms / 1000);
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
};

export const Leaderboard = ({
  rows,
  highlightId,
  title = "TOP RUNNERS",
  compact = false,
}: Props) => {
  return (
    <div
      style={{
        fontFamily: "'Roboto', sans-serif",
        color: "#00ddff",
        background: "rgba(10, 0, 30, 0.55)",
        border: "1px solid rgba(0, 221, 255, 0.35)",
        borderRadius: "6px",
        padding: compact ? "12px 14px" : "16px 20px",
        boxShadow: "0 0 18px rgba(0, 170, 255, 0.25), inset 0 0 18px rgba(120, 0, 200, 0.15)",
        minWidth: compact ? "260px" : "340px",
      }}
    >
      <div
        style={{
          fontFamily: "'Audiowide', cursive",
          fontSize: compact ? "14px" : "16px",
          letterSpacing: "3px",
          color: "#ff88cc",
          textShadow: "0 0 10px #cc66ff",
          textAlign: "center",
          marginBottom: compact ? "8px" : "12px",
        }}
      >
        {title}
      </div>

      {rows === null ? (
        <div style={{ textAlign: "center", opacity: 0.6, fontSize: "12px", padding: "12px 0" }}>
          LOADING…
        </div>
      ) : rows.length === 0 ? (
        <div style={{ textAlign: "center", opacity: 0.6, fontSize: "12px", padding: "12px 0" }}>
          NO RUNS YET — BE THE FIRST
        </div>
      ) : (
        <ol style={{ listStyle: "none", margin: 0, padding: 0 }}>
          {rows.map((row, i) => {
            const highlighted =
              highlightId !== null && highlightId !== undefined && row.id === highlightId;
            return (
              <li
                key={row.id}
                style={{
                  display: "grid",
                  gridTemplateColumns: "24px 1fr auto auto",
                  gap: "10px",
                  alignItems: "center",
                  padding: "4px 6px",
                  fontSize: compact ? "12px" : "13px",
                  borderRadius: "3px",
                  background: highlighted ? "rgba(255, 136, 204, 0.18)" : "transparent",
                  color: highlighted ? "#ffeaff" : "#bfeaff",
                  textShadow: highlighted ? "0 0 8px #ff88cc" : "none",
                }}
              >
                <span style={{ opacity: 0.6, textAlign: "right" }}>{i + 1}.</span>
                <span
                  style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                >
                  {row.name}
                  {row.victory && (
                    <span style={{ marginLeft: "6px", color: "#00ffaa", fontSize: "10px" }}>★</span>
                  )}
                </span>
                <span
                  style={{ fontVariantNumeric: "tabular-nums", opacity: 0.7, fontSize: "11px" }}
                >
                  {formatDuration(row.run_duration_ms)}
                </span>
                <span style={{ fontVariantNumeric: "tabular-nums", color: "#00ffcc" }}>
                  {formatScore(row.score)}
                </span>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
};
