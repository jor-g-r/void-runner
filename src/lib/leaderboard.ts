import { supabase } from "./supabase";

export type ScoreRow = {
  id: string;
  name: string;
  score: number;
  run_duration_ms: number;
  deaths: number;
  victory: boolean;
  created_at: string;
};

export type SubmitPayload = {
  name: string;
  score: number;
  runDurationMs: number;
  deaths: number;
  victory: boolean;
};

export type SubmitResult = {
  id: string;
  rank: number | null;
  top: ScoreRow[];
};

export async function submitScore(payload: SubmitPayload): Promise<SubmitResult> {
  if (!supabase) throw new Error("leaderboard disabled: missing Supabase env vars");

  const { data, error } = await supabase
    .from("scores")
    .insert({
      name: payload.name,
      score: payload.score,
      run_duration_ms: payload.runDurationMs,
      deaths: payload.deaths,
      victory: payload.victory,
    })
    .select("id")
    .single();

  if (error || !data) throw error ?? new Error("score insert failed");

  const top = await fetchTopScores(10);
  const idx = top.findIndex((row) => row.id === data.id);
  return { id: data.id, rank: idx === -1 ? null : idx + 1, top };
}

export async function fetchTopScores(limit = 10): Promise<ScoreRow[]> {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("scores")
    .select("*")
    .order("score", { ascending: false })
    .order("created_at", { ascending: true })
    .limit(limit);

  if (error || !data) return [];
  return data as ScoreRow[];
}
