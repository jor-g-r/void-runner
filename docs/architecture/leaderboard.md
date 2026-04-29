# Global Leaderboard — Architecture Spec

> Top-10 global scoreboard for Void Runner. Backend: Supabase (free tier).
> Target ship date: before 2026-05-01 (Vibe Jam submission).

---

## 1. Goals & Non-Goals

**Goals**

- Persist every completed run (victory or death) to a global table.
- Display top 10 scores on the title screen and on Victory / Game Over.
- Highlight the player's submitted entry and its rank.
- Survive light cheating attempts; never crash the game if the backend is down.

**Non-Goals (v1)**

- User accounts, login, password recovery.
- Strong anti-cheat (replay verification, server-authoritative simulation).
- Friend lists, weekly resets, regional boards, or filtering.
- Editing or deleting scores from the client.

---

## 2. Backend

**Provider:** Supabase (free tier, existing account).
**Access pattern:** client → `@supabase/supabase-js` → Postgres via PostgREST. No custom server.

### 2.1 Schema

```sql
create table public.scores (
  id              uuid primary key default gen_random_uuid(),
  name            text        not null,
  score           integer     not null,
  run_duration_ms integer     not null,
  deaths          integer     not null,
  victory         boolean     not null default false,
  created_at      timestamptz not null default now(),

  constraint name_length      check (char_length(name) between 1 and 12),
  constraint name_charset     check (name ~ '^[A-Za-z0-9 _.-]+$'),
  constraint score_range      check (score between 0 and 999999),
  constraint duration_range   check (run_duration_ms between 30000 and 600000),
  constraint deaths_range     check (deaths between 0 and 99),
  constraint score_vs_time    check (score <= run_duration_ms)  -- ~1pt/ms ceiling
);

create index scores_leaderboard_idx on public.scores (score desc, created_at asc);
```

`score_vs_time` is a soft sanity bound — current scoring caps well below this.
Tighten if real run telemetry shows a tighter ceiling.

### 2.2 Row Level Security

```sql
alter table public.scores enable row level security;

create policy scores_public_read
  on public.scores for select
  to anon
  using (true);

create policy scores_public_insert
  on public.scores for insert
  to anon
  with check (true);  -- CHECK constraints on the table do the validation
```

No update or delete policies → anon clients cannot mutate or remove rows.

### 2.3 Env Vars

`.env`:

```
VITE_SUPABASE_URL=https://<project>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-key>
```

Anon key is safe to ship in the client bundle. Never ship the service-role key.

---

## 3. Anti-Cheat Strategy

Acceptance: a determined cheater can forge POSTs with valid CHECK ranges. We
only need to block trivial inspect-element submissions and absurd values.

**Layers:**

1. **DB CHECK constraints** — cap score, duration, deaths, name shape.
2. **Score-vs-time ceiling** — `score <= run_duration_ms` rejects instant 1M scores.
3. **Single submit per run** — `gameStore.scoreSubmitted` flag, cleared on restart.
4. **Soft profanity filter** — client-side regex against a small block list before insert.
5. **Graceful degradation** — all submit/fetch calls wrapped in try/catch; failures never break gameplay.

Out of scope for v1: HMAC signing, rate limit by IP, replay verification.
If griefing happens post-launch, add a Supabase Edge Function gateway with a
shared secret + IP rate limit.

---

## 4. Client Integration

### 4.1 New files

```
src/lib/
  supabase.ts        ← createClient() singleton
  leaderboard.ts     ← submitScore(), fetchTopScores()
  profanity.ts       ← isClean(name)

src/ui/
  Leaderboard.tsx    ← top-10 list, reused in title + end screens
  NameEntry.tsx      ← 3–12 char input shown on Victory / GameOver
```

### 4.2 API surface

```ts
// src/lib/leaderboard.ts
export type ScoreRow = {
  id: string;
  name: string;
  score: number;
  run_duration_ms: number;
  deaths: number;
  victory: boolean;
  created_at: string;
};

export async function submitScore(payload: {
  name: string;
  score: number;
  runDurationMs: number;
  deaths: number;
  victory: boolean;
}): Promise<{ id: string; rank: number | null }>;

export async function fetchTopScores(limit = 10): Promise<ScoreRow[]>;
```

`rank` is computed client-side from the fetched top N after submit; null if the
player did not place in the visible window.

### 4.3 gameStore additions

```ts
runStartedAt: number | null; // ms timestamp at run start
deaths: number; // incremented on each respawn
scoreSubmitted: boolean; // gate to prevent double-submit
playerName: string; // persisted in localStorage between runs
```

### 4.4 UI flow

- **Title screen:** Leaderboard panel always visible (top 10, read-only).
- **Victory / GameOver:**
  1. Show final score + stats.
  2. If `!scoreSubmitted`: show `NameEntry` (prefilled from localStorage).
  3. On submit: call `submitScore`, set `scoreSubmitted = true`, persist name.
  4. Re-fetch top 10, highlight the player's row if present.
- **Failure:** if submit throws, show "Could not submit score" inline, allow retry, never block restart.

---

## 5. Privacy & Moderation

- Only name + run metadata is stored. No IP, email, device, or session info.
- Name input is filtered client-side via a small block list (~30 common slurs).
- Server-side: a future Edge Function can run a stricter filter on insert if needed.
- No GDPR delete flow in v1; if a user complains, manual delete via Supabase dashboard.

---

## 6. Rollout Plan

| Day | Task                                                                                |
| --- | ----------------------------------------------------------------------------------- |
| D1  | Supabase project setup, table + RLS, env vars, smoke test from a script             |
| D2  | `supabase.ts` + `leaderboard.ts`, gameStore fields, integration in Victory/GameOver |
| D3  | `Leaderboard.tsx` + `NameEntry.tsx`, vaporwave styling, title-screen panel          |
| D4  | Edge cases (offline, duplicate submit, long names), profanity list, polish          |
| D5  | Buffer + Vibe Jam submission                                                        |

Today is 2026-04-27. Deadline is 2026-05-01. D1–D4 fit; D5 is the safety margin.

---

## 7. Open Questions

- Profanity list source: hand-rolled vs. an existing tiny npm package?
- Should we display `victory` runs separately from death runs, or mix them?
  (v1 default: mixed, sorted by score only — simplest.)
- Show the player's all-time best locally even if not in global top 10? (Nice-to-have, defer.)
