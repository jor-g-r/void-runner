# Tech Debt — Void Runner

> Snapshot of known divergences between the code in `src/` and the documented
> architecture (`GAME_SPEC.md`, `src/context.md`, `docs/architecture/*`).
> Reviewed: 2026-05-25; updated 2026-10-05 (B1 resolved — see
> `docs/architecture/leaderboard.md` §2.4). Owner: solo dev.

Each item is independent. Pick by impact + cost, not by order.

---

## Architectural divergences

These violate documented patterns in `src/context.md`. Listed by impact on
future iteration speed.

### A1 — Projectiles are not pooled

**Doc says** (`src/context.md` "Object Pooling"):

> Pre-allocate ~100 objects. Activate/deactivate instead of create/destroy.

**Code does** (`src/stores/gameStore.ts:212-258`): `[...state.playerProjectiles, {…}]`
on every shot, `.filter(p => p.lifetime > 0)` every frame in `tick()`. The
`active` field on `ProjectileData` exists but is never read.

**Impact:** GC pressure on the hot path. Visible as micro-stutters at high fire
rates / charged shot + homing + many enemies.

**Cost:** Medium. Needs a small ring-buffer or fixed array + free list. Touches
the store, `ProjectileManager`, and the collision pass in `EnemyManager`.

### A2 — Enemy AI is hardcoded per type instead of data-driven

**Doc says** (`src/context.md` and refactor checklist):

> Enemy behavior driven by data (`enemies.ts`), not hardcoded per-type.

**Code does** (`src/components/EnemyManager.tsx:142-223`): big
`if (enemy.type === "fighter") … else if (enemy.type === "tank") …` block
inside the per-frame loop. `data/enemies.ts` only holds stats (hp, speed,
score), not behavior.

**Impact:** Every new enemy type requires editing `EnemyManager`. Boss likely
has the same shape (`Boss.tsx`, 324 lines — not audited yet).

**Cost:** Medium-high. Define a behavior interface (`update(enemy, ctx, delta)
→ partial enemy`), move each branch to its own file under
`systems/behaviors/`, register them in a map keyed by type. Boss can stay
separate if its complexity warrants it.

### A3 — `gameStore.tick()` mixes too many systems

**Code does** (`src/stores/gameStore.ts:126-208`): one `set()` updates
projectiles, invulnerability timer, barrel roll cooldown/timer, shield regen,
and `time`. ~80 lines inside a single store action.

**Impact:** Hard to read, hard to test in isolation, and any new timed effect
(e.g. status effects, slow-mo) lands here by gravity.

**Cost:** Low-medium. Extract into `systems/projectiles.ts` and
`systems/playerStatus.ts`, called from one `tick` orchestrator. The store
keeps the data, systems own the math.

### A4 — Wave scheduling is split between `timeline.ts` and `EnemyManager`

**Code does** (`src/components/EnemyManager.tsx:64-73`): the while-loop that
checks `LEVEL_WAVES[waveIndex].time <= currentTime` and advances `waveIndex`
lives in the manager, not in `systems/timeline.ts`. `timeline.ts` only owns
`spawnWave()` and `resetTimelineIds()`.

**Impact:** "Where does scheduling live?" has two answers. New wave logic
(branches, conditional waves) would be ambiguous.

**Cost:** Low. Move the loop into a `tickTimeline(currentTime, state) → spawned[]`
function in `timeline.ts`.

---

## Small traps

Low impact each, but cheap to fix and they accumulate.

### S1 — `nextProjectileId` reused for pickups

`src/stores/gameStore.ts:269` uses the projectile counter to generate pickup
ids: `` `pk-${nextProjectileId++}` ``. Works because the string is unique by
prefix, but the name lies. Give pickups their own counter.

### S2 — Delta clamp duplicated

`Math.min(rawDelta, 0.1)` appears in both `gameStore.ts:128` and
`EnemyManager.tsx:51`. Extract a single helper or do it once at the entry of
the frame.

### S3 — `EnemyManager` writes the store directly with `setState`

`src/components/EnemyManager.tsx:254`: `useGameStore.setState({...})` from
inside `useFrame`. Bypasses the store's actions, harder to trace in DevTools.
Acceptable for perf, but worth wrapping in a single named action like
`commitFrame(patch)` for clarity.

### S4 — Repeated `as [number, number, number]` casts

Tuple casts litter the store and managers. A `vec3(x, y, z)` helper that
returns a properly typed tuple would clean up ~20 call sites.

---

## Things we are deliberately NOT calling debt

For the record, so we don't re-debate these:

- No tests. Single-level game, scope-limited MVP, manual playtesting is the
  current bar. Could add `vitest` for `collisions.ts` and `timeline.ts` cheaply
  if a bug ever lands there.
- Inline styles in `ui/*`. Vaporwave theme is one-off; a CSS module would be
  more ceremony than value.
- `Date.now()` for run timing in `runStartedAt`. Wall clock is fine for a
  ~3.5-minute run; no NTP drift concerns at this scale.

---

## How to use this doc

- Add new debt as a numbered entry under the right section.
- When fixing an item, remove it from this file **in the same commit** as the fix.
- Don't list "ideas" or "nice-to-haves" here — those belong in a wishlist, not in debt.
