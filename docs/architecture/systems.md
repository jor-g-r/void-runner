# Systems Architecture

## System Overview

```
┌─────────────────────────────────────────────────┐
│                    App.tsx                        │
│  ┌──────────────────┐  ┌─────────────────────┐  │
│  │   R3F Canvas      │  │   HTML Overlay      │  │
│  │  ┌──────────────┐ │  │  ┌───────────────┐  │  │
│  │  │  Game.tsx     │ │  │  │ HUD.tsx       │  │  │
│  │  │  ├ Player     │ │  │  │ UpgradeChoice │  │  │
│  │  │  ├ EnemyMgr   │ │  │  │ TitleScreen   │  │  │
│  │  │  ├ ProjMgr    │ │  │  │ GameOver      │  │  │
│  │  │  ├ Boss       │ │  │  └───────────────┘  │  │
│  │  │  ├ Pickups    │ │  └─────────────────────┘  │
│  │  │  └ Environ.   │ │                           │
│  │  └──────────────┘ │                           │
│  └──────────────────┘                            │
│                                                   │
│              ┌──────────────┐                     │
│              │  gameStore   │ (Zustand)            │
│              └──────────────┘                     │
└─────────────────────────────────────────────────┘
```

## 1. Game Loop (useFrame)

R3F provides the game loop. No custom `requestAnimationFrame`.

### Per-frame execution order (by component mount order)

```
1. Timeline.ts    → check time, spawn waves
2. Player.tsx     → read input, update position, fire projectiles
3. EnemyManager   → update enemy positions, fire enemy projectiles
4. ProjManager    → update projectile positions, check collisions
5. Boss.tsx       → update boss behavior (when active)
6. Pickups        → drift toward player if within magnet radius
7. Environment    → update star positions (visual only)
```

Each component calls `useFrame((state, delta) => { ... })` independently.

## 2. State Management (Zustand)

### Store Shape

```typescript
interface GameState {
  // Flow
  phase: 'title' | 'playing' | 'upgrading' | 'gameover' | 'victory';
  score: number;
  time: number;

  // Player
  playerHP: number;
  playerMaxHP: number;
  playerPosition: [number, number];
  energy: number;
  upgrades: string[];
  isInvulnerable: boolean;
  chargeLevel: number;
  barrelRollCooldown: number;

  // Entities
  enemies: EnemyData[];
  playerProjectiles: ProjectileData[];
  enemyProjectiles: ProjectileData[];
  pickups: PickupData[];

  // Actions
  tick: (delta: number) => void;
  spawnEnemy: (spawn: EnemySpawn) => void;
  removeEnemy: (id: string) => void;
  damageEnemy: (id: string, amount: number) => void;
  damagePlayer: () => void;
  firePlayerProjectile: (pos: [number, number, number]) => void;
  fireEnemyProjectile: (pos: [number, number, number], vel: [number, number, number]) => void;
  removeProjectile: (id: string, type: 'player' | 'enemy') => void;
  spawnPickup: (pos: [number, number, number]) => void;
  collectPickup: (id: string) => void;
  addScore: (points: number) => void;
  applyUpgrade: (id: string) => void;
  startGame: () => void;
  reset: () => void;
}
```

### Key Principle

- **Flat store.** No nested objects for sub-states.
- **Selectors for performance.** Components subscribe to only what they need:
  ```typescript
  const score = useGameStore(s => s.score);
  const enemies = useGameStore(s => s.enemies);
  ```
- **In-place mutation** for entity arrays (Zustand allows this with `set`).

## 3. Collision System

### Strategy: Brute-force sphere checks

```typescript
function checkCollision(
  a: { position: [number, number, number]; radius: number },
  b: { position: [number, number, number]; radius: number }
): boolean {
  const dx = a.position[0] - b.position[0];
  const dy = a.position[1] - b.position[1];
  const dz = a.position[2] - b.position[2];
  const distSq = dx * dx + dy * dy + dz * dz;
  const radSum = a.radius + b.radius;
  return distSq < radSum * radSum;
}
```

### Collision pairs checked per frame

| A | B | Result |
|---|---|--------|
| Player projectile | Enemy | Damage enemy, destroy projectile |
| Enemy projectile | Player | Damage player (if not invulnerable) |
| Player | Pickup | Collect pickup, add energy |

### Collision radii

| Entity | Radius |
|--------|--------|
| Player ship | 0.8 |
| Drone | 0.6 |
| Fighter | 0.8 |
| Tank | 1.2 |
| Boss weak point | 1.5 |
| Player projectile | 0.2 |
| Enemy projectile | 0.3 |
| Pickup | 0.5 (collect), 5.0 (magnet attract) |

## 4. Object Pool (Projectiles)

```typescript
interface PooledProjectile {
  id: string;
  active: boolean;
  position: [number, number, number];
  velocity: [number, number, number];
  lifetime: number;
  owner: 'player' | 'enemy';
}

// Pre-allocate on game start
const POOL_SIZE = 100;
const pool: PooledProjectile[] = Array.from({ length: POOL_SIZE }, (_, i) => ({
  id: `proj-${i}`,
  active: false,
  position: [0, 0, 0],
  velocity: [0, 0, 0],
  lifetime: 0,
  owner: 'player',
}));
```

### Spawn: find first inactive, activate it.
### Despawn: set `active = false`.
### Render: only `.filter(p => p.active)` in the component.

## 5. Entity Data Shapes

```typescript
interface EnemyData {
  id: string;
  type: 'drone' | 'fighter' | 'tank';
  hp: number;
  maxHp: number;
  position: [number, number, number];
  velocity: [number, number, number];
  state: 'approaching' | 'attacking' | 'strafing' | 'charging';
  stateTimer: number;
  radius: number;
  flashTimer: number;      // >0 means showing hit flash
}

interface PickupData {
  id: string;
  position: [number, number, number];
  collected: boolean;
}

interface BossData {
  hp: number;
  maxHp: number;
  phase: 1 | 2;
  position: [number, number, number];
  attackTimer: number;
  spawnTimer: number;
  weakPointExposed: boolean;
}
```

## 6. Input System

```typescript
// Mouse: track normalized position (-1 to 1) on both axes
// Convert to world-space bounds for player target position
// Player.tsx lerps toward target each frame

// Keyboard: WASD adds offset to target position
// Double-tap A/D detection for barrel roll (track last tap time)

// Spacebar: track hold duration for charged shot
```

No input abstraction layer needed. Handle directly in `Player.tsx`.

## 7. Audio System

```typescript
// audio.ts — thin Howler.js wrapper

const sounds = {
  shoot:    new Howl({ src: ['/sounds/shoot.wav'], volume: 0.3 }),
  hit:      new Howl({ src: ['/sounds/hit.wav'], volume: 0.4 }),
  explode:  new Howl({ src: ['/sounds/explode.wav'], volume: 0.5 }),
  damage:   new Howl({ src: ['/sounds/damage.wav'], volume: 0.6 }),
  pickup:   new Howl({ src: ['/sounds/pickup.wav'], volume: 0.4 }),
  charge:   new Howl({ src: ['/sounds/charge.wav'], volume: 0.3 }),
  roll:     new Howl({ src: ['/sounds/roll.wav'], volume: 0.4 }),
  boss:     new Howl({ src: ['/sounds/boss.wav'], volume: 0.5 }),
};

function playSound(name: keyof typeof sounds) {
  const s = sounds[name];
  // Vary pitch ±10% for organic feel
  s.rate(0.9 + Math.random() * 0.2);
  s.play();
}
```

## 8. Screen Shake System

```typescript
// Implemented in Game.tsx or a CameraShake component
// Uses drei's <CameraShake> or manual offset on a camera group

interface ShakeState {
  intensity: number;  // 0 = none
  duration: number;   // remaining seconds
  decay: number;      // how fast it fades
}

// On enemy destroy: { intensity: 0.05, duration: 0.1, decay: 10 }
// On player damage: { intensity: 0.15, duration: 0.3, decay: 5 }
// Apply as random offset to camera group position each frame
// Reduce intensity by decay * delta each frame
```

## 9. Upgrade Application

Upgrades are multipliers/flags on the player state. Applied in gameplay logic:

```
Rapid Fire    → multiply fire rate timer by 0.6
Wide Shot     → spawn 2 extra projectiles at ±15° angle
Shield        → increment playerMaxHP by 1, heal 1 HP
Homing Shots  → in projectile update, steer toward nearest enemy
Quick Charge  → multiply charge time threshold by 0.5
Magnet        → multiply pickup attract radius by 3
Overdrive     → multiply scroll speed by 1.2, multiply score by 1.25
```

No upgrade system or manager needed. Just check `upgrades.includes('rapidFire')` where relevant.
