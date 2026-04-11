# Level 1 — Wave Design

## Overview

Single level, ~3.5 minutes. Scripted timeline — every wave is manually placed for full control over pacing.

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

| Phase | Time | Duration | Content |
|-------|------|----------|---------|
| Intro | 0:00–0:15 | 15s | No enemies. Atmosphere. |
| Warm-up | 0:15–0:45 | 30s | Drones only. Learn to shoot. |
| Escalation | 0:45–1:30 | 45s | Fighters join. Return fire. |
| Intensity | 1:30–2:15 | 45s | Tanks appear. Peak density. |
| Breather | 2:15–2:30 | 15s | Brief calm before boss. |
| Boss | 2:30–3:30 | 60s | Void Carrier fight. |
| Victory | 3:30–3:45 | 15s | Explosion + score tally. |

## Wave Type Definition

```typescript
type EnemyType = 'drone' | 'fighter' | 'tank';
type Formation = 'v' | 'line' | 'diamond' | 'random' | 'surround';
type SpawnSide = 'left' | 'center' | 'right' | 'wide';

interface Wave {
  time: number;           // seconds into level
  enemies: EnemyType[];   // what to spawn
  formation: Formation;   // spatial arrangement
  position: SpawnSide;    // horizontal bias
  note?: string;          // design intent (not used in code)
}
```

## Complete Wave List

### Phase: Intro (0–15s)
No waves. Environment particles and music fade in.

### Phase: Warm-up (15–45s)

```typescript
// First contact — simple, centered, easy kills
{ time: 16, enemies: ['drone','drone','drone'], formation: 'v', position: 'center', note: 'First enemies. Player learns to shoot.' },
{ time: 22, enemies: ['drone','drone','drone','drone'], formation: 'line', position: 'left', note: 'Teach lateral movement.' },
{ time: 28, enemies: ['drone','drone','drone','drone'], formation: 'line', position: 'right', note: 'Mirror — move to other side.' },
{ time: 34, enemies: ['drone','drone','drone','drone','drone'], formation: 'v', position: 'center', note: 'Larger V. Satisfying volley.' },
{ time: 40, enemies: ['drone','drone','drone','drone','drone','drone'], formation: 'diamond', position: 'wide', note: 'Spread formation. First real positioning.' },
```

### Phase: Escalation (45–90s)

```typescript
// Fighters introduced. Player must dodge return fire.
{ time: 46, enemies: ['fighter','drone','drone','fighter'], formation: 'line', position: 'wide', note: 'First fighters. Flanking drones.' },
{ time: 53, enemies: ['drone','drone','drone','drone','drone'], formation: 'v', position: 'center', note: 'Breather wave — easy drones.' },
{ time: 58, enemies: ['fighter','fighter'], formation: 'line', position: 'center', note: 'Two fighters together. Concentrated fire.' },
{ time: 65, enemies: ['drone','drone','drone','drone','drone','drone','drone'], formation: 'random', position: 'wide', note: 'Chaos wave. Lots of targets.' },
{ time: 72, enemies: ['fighter','drone','drone','drone','fighter'], formation: 'v', position: 'left', note: 'Fighters at tips of V.' },
{ time: 78, enemies: ['fighter','fighter','fighter'], formation: 'line', position: 'right', note: 'All-fighter wave. Intense dodging.' },
{ time: 85, enemies: ['drone','drone','fighter','drone','drone'], formation: 'diamond', position: 'center', note: 'Fighter in center, drones around.' },
```

### Phase: Intensity (90–135s)

```typescript
// Tanks appear. Multiple threat types simultaneously.
{ time: 91, enemies: ['tank'], formation: 'line', position: 'center', note: 'First tank. Solo introduction. Learn the telegraph.' },
{ time: 98, enemies: ['drone','drone','drone','drone','drone'], formation: 'random', position: 'wide', note: 'Drones while tank memory is fresh.' },
{ time: 103, enemies: ['fighter','fighter','fighter'], formation: 'v', position: 'left', note: 'Fighter V from the left.' },
{ time: 108, enemies: ['tank','drone','drone','drone','drone'], formation: 'line', position: 'right', note: 'Tank with drone escort.' },
{ time: 115, enemies: ['fighter','fighter','drone','drone','drone','drone'], formation: 'surround', position: 'wide', note: 'Surrounded. Peak threat.' },
{ time: 122, enemies: ['tank','fighter','fighter'], formation: 'line', position: 'center', note: 'Tank + fighters. Must prioritize.' },
{ time: 128, enemies: ['drone','drone','drone','drone','drone','drone','drone'], formation: 'random', position: 'wide', note: 'Dense drone swarm. Use charged shot.' },
```

### Phase: Breather (135–150s)

```typescript
// Brief calm. Musical shift. Boss incoming.
{ time: 137, enemies: ['drone','drone','drone'], formation: 'line', position: 'center', note: 'Light wave. Let player breathe.' },
// No more waves until boss at 150s.
```

### Phase: Boss (150–210s)

Boss spawns at `time: 150`. Not a wave — triggered as a special event in `timeline.ts`.

The boss (`Void Carrier`) manages its own drone spawns during Phase 1.

### Phase: Victory (210–225s)

No waves. Boss explosion, score tally, restart prompt.

## Design Notes

- **Total regular waves: 18** (manageable to implement and tune)
- **Enemy count per wave: 1–7** (stays within entity budget)
- **Spacing between waves: 5–8 seconds** (enough time to clear + breathe)
- **Formations are suggestions** — implement a simple offset pattern for each, don't overthink placement math
- **Pickup drops are probabilistic (40%)** — no need to script them. Players will get roughly 3 upgrade chances per full run.
