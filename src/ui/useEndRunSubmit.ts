import { useEffect, useState } from "react";
import { useGameStore } from "../stores/gameStore";
import { fetchTopScores, submitScore, type ScoreRow } from "../lib/leaderboard";
import { isLeaderboardEnabled } from "../lib/supabase";

// DB constraint: run_duration_ms between 30000 and 600000.
const MIN_RUN_MS = 30_000;
const MAX_RUN_MS = 600_000;

type EndRunState = {
  rows: ScoreRow[] | null;
  highlightId: string | null;
  submitting: boolean;
  error: string | null;
  enabled: boolean;
  submit: (name: string) => Promise<void>;
};

export function useEndRunSubmit(victory: boolean): EndRunState {
  const score = useGameStore((s) => s.score);
  const runStartedAt = useGameStore((s) => s.runStartedAt);
  const deaths = useGameStore((s) => s.deaths);
  const setPlayerName = useGameStore((s) => s.setPlayerName);
  const markScoreSubmitted = useGameStore((s) => s.markScoreSubmitted);

  const enabled = isLeaderboardEnabled();
  const [rows, setRows] = useState<ScoreRow[] | null>(() => (enabled ? null : []));
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    void fetchTopScores().then((data) => {
      if (!cancelled) setRows(data);
    });
    return () => {
      cancelled = true;
    };
  }, [enabled]);

  const submit = async (name: string) => {
    if (!enabled || runStartedAt === null || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const elapsed = Date.now() - runStartedAt;
      const runDurationMs = Math.min(MAX_RUN_MS, Math.max(MIN_RUN_MS, elapsed));
      const result = await submitScore({
        name,
        score: Math.max(0, Math.floor(score)),
        runDurationMs,
        deaths,
        victory,
      });
      setPlayerName(name);
      markScoreSubmitted();
      setRows(result.top);
      setHighlightId(result.id);
    } catch {
      setError("SUBMIT FAILED — TRY AGAIN");
    } finally {
      setSubmitting(false);
    }
  };

  return { rows, highlightId, submitting, error, enabled, submit };
}
