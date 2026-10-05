# Level 1 — Wave Design

## Overview

Single level, ~3.5–4 minutes. Scripted timeline — every wave is manually placed for full control over pacing.

The level follows a **tension curve**:

```
Intensity
  ▲
  │          ████
  │        ██    █
  │      ██      █ BOSS
  │    ██        ████
  │  ██              █
  │██                 █
  └──────────────────────► Time
  INTRO  WARM  ESCAL  INT  BR  BOSS  WIN
```

## Timeline Phases

| Phase      | Time       | Duration | Content                                             |
| ---------- | ---------- | -------- | --------------------------------------------------- |
| Intro      | 0:00–0:15  | 15s      | No enemies. Atmosphere.                             |
| Warm-up    | 0:15–0:45  | 30s      | Drones only. Learn to shoot.                        |
| Escalation | 0:45–1:30  | 45s      | Fighters join. Return fire.                         |
| Intensity  | 1:30–2:30  | 60s      | Tanks appear. Peak density (~4s spacing from 2:10). |
| Breather   | 2:30–2:45  | 15s      | Brief calm before boss.                             |
| Boss       | ~2:45–3:45 | ~60s     | Void Carrier fight.                                 |
| Victory    | ~3:45–4:00 | ~15s     | Explosion + score tally.                            |

## Wave Type Definition

```typescript
type EnemyType = "drone" | "fighter" | "tank";
type Formation = "v" | "line" | "diamond" | "random" | "surround";
type SpawnSide = "left" | "center" | "right" | "wide";

interface Wave {
  time: number; // seconds into level
  enemies: EnemyType[]; // what to spawn
  formation: Formation; // spatial arrangement
  position: SpawnSide; // horizontal bias
  note?: string; // design intent (not used in code)
}
```

## Complete Wave List

### Phase: Intro (0–15s)

No waves. Environment particles and music fade in.

### Phase: Warm-up (15–45s)

```typescript
// First contact — simple, centered, easy kills
{ time: 15, enemies: ['drone','drone','drone'], formation: 'v', position: 'center', note: 'First enemies. Player learns to shoot.' },
{ time: 21, enemies: ['drone','drone','drone','drone'], formation: 'line', position: 'left', note: 'Teach lateral movement.' },
{ time: 28, enemies: ['drone','drone','drone','drone'], formation: 'line', position: 'right', note: 'Mirror — move to other side.' },
{ time: 35, enemies: ['drone','drone','drone','drone','drone'], formation: 'v', position: 'center', note: 'Larger V. Satisfying volley.' },
{ time: 41, enemies: ['drone','drone','drone','drone','drone','drone'], formation: 'diamond', position: 'wide', note: 'Spread formation. First real positioning.' },
```

### Phase: Escalation (45–90s)

```typescript
// Fighters introduced. Player must dodge return fire.
{ time: 45, enemies: ['fighter','drone','drone','fighter'], formation: 'line', position: 'wide', note: 'First fighters. Flanking drones.' },
{ time: 51, enemies: ['drone','drone','drone','drone','drone'], formation: 'v', position: 'center', note: 'Breather wave — easy drones.' },
{ time: 57, enemies: ['fighter','fighter'], formation: 'line', position: 'center', note: 'Two fighters together. Concentrated fire.' },
{ time: 63, enemies: ['drone','drone','drone','drone','drone','drone','drone'], formation: 'random', position: 'wide', note: 'Chaos wave. Lots of targets.' },
{ time: 69, enemies: ['fighter','drone','drone','drone','fighter'], formation: 'v', position: 'left', note: 'Fighters at tips of V.' },
{ time: 75, enemies: ['fighter','fighter','fighter'], formation: 'line', position: 'right', note: 'All-fighter wave. Intense dodging.' },
{ time: 81, enemies: ['drone','drone','fighter','drone','drone'], formation: 'diamond', position: 'center', note: 'Fighter in center, drones around.' },
```

### Phase: Intensity (90–150s)

```typescript
// Tanks appear. Multiple threat types simultaneously.
{ time: 90, enemies: ['tank'], formation: 'line', position: 'center', note: 'First tank. Solo introduction. Learn the telegraph.' },
{ time: 96, enemies: ['drone','drone','drone','drone','drone'], formation: 'random', position: 'wide', note: 'Drones while tank memory is fresh.' },
{ time: 102, enemies: ['fighter','fighter','fighter'], formation: 'v', position: 'left', note: 'Fighter V from the left.' },
{ time: 108, enemies: ['tank','drone','drone','drone','drone'], formation: 'line', position: 'right', note: 'Tank with drone escort.' },
{ time: 114, enemies: ['fighter','fighter','drone','drone','drone','drone'], formation: 'surround', position: 'wide', note: 'Surrounded. Peak threat.' },
{ time: 120, enemies: ['tank','fighter','fighter'], formation: 'line', position: 'center', note: 'Tank + fighters. Must prioritize.' },
{ time: 126, enemies: ['drone','drone','drone','drone','drone','drone','drone'], formation: 'random', position: 'wide', note: 'Dense drone swarm. Use charged shot.' },

// Peak — relentless waves every ~4s
{ time: 130, enemies: ['fighter','drone','drone','fighter'], formation: 'diamond', position: 'wide', note: 'Mixed peak wave.' },
{ time: 134, enemies: ['tank','drone','drone'], formation: 'line', position: 'left', note: 'Tank pressing from the left.' },
{ time: 138, enemies: ['fighter','fighter','fighter','fighter'], formation: 'v', position: 'center', note: 'All-fighter peak wave.' },
{ time: 142, enemies: ['tank','fighter','drone','drone','drone'], formation: 'surround', position: 'wide', note: 'Peak surround. Maximum pressure.' },
{ time: 146, enemies: ['drone','drone','drone','drone','drone','drone'], formation: 'random', position: 'wide', note: 'Dense drone swarm.' },
{ time: 150, enemies: ['tank','tank'], formation: 'line', position: 'wide', note: 'Double tank finale.' },
```

### Phase: Breather (155–162s)

```typescript
// Brief calm. Musical shift. Boss incoming.
{ time: 155, enemies: ['drone','drone','drone'], formation: 'line', position: 'center', note: 'Light wave. Let player breathe.' },
{ time: 162, enemies: ['fighter'], formation: 'line', position: 'center', note: 'Single fighter. Last dodge before the boss.' },
```

### Phase: Boss (~165s+)

Boss is not a wave — it activates automatically once every wave has spawned and
the field is clear (see `Boss.tsx`), roughly ~165s into the level.

The boss (`Void Carrier`) manages its own drone spawns during Phase 1.

### Phase: Victory

No waves. Boss explosion, score tally, restart prompt.

## Design Notes

- **Total regular waves: 26** (manageable to implement and tune)
- **Enemy count per wave: 1–7** (stays within entity budget)
- **Spacing between waves: 4–6 seconds** (enough time to clear + breathe; tightens to ~4s at the peak)
- **Fighters attack in bounded bursts** — they fire ~3 shots over ~8s, then leave
  the screen instead of stacking up forever.
- **Drone rams cost 1 HP** (like any bullet) — a touch is survivable, not a
  one-hit death.
- **Shooter drones only appear from 45s on** — the warm-up is pure
  movement-and-shooting practice.
- **Formations are suggestions** — implement a simple offset pattern for each, don't overthink placement math
- **Pickup drops are probabilistic (40%)** — no need to script them. Players will get roughly 3 upgrade chances per full run.
