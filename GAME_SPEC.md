# Void Runner - Game Specification

> Star Fox 64-inspired on-rails shooter | MVP | React Three Fiber

---

## 1. Core Gameplay Loop

### Second-to-Second

```
Player ship flies forward automatically through a tunnel/corridor of space.
Enemies appear ahead in formations.
Player dodges incoming fire while positioning to shoot enemies.
Destroyed enemies drop energy pickups.
Energy fuels upgrades collected mid-run.
Repeat with escalating intensity until boss encounter.
```

### What the Player Does at All Times

| Action           | Frequency      | Input              |
|------------------|----------------|--------------------|
| Dodge            | Constant       | Mouse / WASD       |
| Shoot            | Auto-fire      | Always on          |
| Barrel Roll      | Reactive       | Double-tap A/D     |
| Collect pickups  | Opportunistic  | Fly into them      |

### What Makes It Engaging

- **Constant threat** - enemies always approaching, projectiles always incoming
- **Positioning tension** - best firing angle vs. safest dodge position are often different
- **Rhythm** - enemy waves create natural attack/breathe/attack cadence
- **Escalation** - intensity ramps smoothly until the boss fight payoff
- **Barrel roll invincibility** - a skill-expressive defensive tool with a cooldown that rewards timing

---

## 2. Controls & Movement System

### Input Scheme

```
Primary:   Mouse position → ship position (recommended default)
           Mouse is always active for aiming/position

Secondary: WASD / Arrow Keys → ship position (alternative/simultaneous)

Barrel Roll: Double-tap A or D (or Left/Right arrow)
             Grants ~0.4s invincibility, 2s cooldown
             Ship does a full 360 roll animation

Shooting:  AUTO-FIRE always on. No manual trigger needed.
           Spacebar = charged shot (hold 1s, release for AoE blast)
```

### Movement Constraints

```
Bounds:       Rectangular area, roughly 70% of viewport
              Ship cannot leave this box
              Soft resistance at edges (not a hard stop — lerp back gently)

Smoothing:    Ship position lerps toward target at factor 0.12–0.15 per frame
              This gives "floaty but responsive" Star Fox feel
              CRITICAL: Too snappy = twitchy. Too slow = unresponsive.
              Tune this value first.

Tilt:         Ship banks visually when moving horizontally (rotation.z)
              Ship pitches slightly when moving vertically (rotation.x)
              Pure cosmetic — no gameplay effect
              Lerp tilt at 0.08 for smooth visual lag behind movement

Speed:        Forward auto-scroll is constant (no player control)
              ~30 units/sec base speed (tune to feel)
```

### Shooting Behavior

```
Auto-fire:    Twin lasers, 8 shots/sec
              Projectiles are fast (200 units/sec), thin beams
              Lifetime: 2 seconds then despawn
              Damage: 1 per hit

Charged Shot: Hold spacebar, visible charge indicator on ship (glow ramp)
              Full charge at 1.0s
              Release: large energy ball, AoE radius 3 units
              Damage: 5 (one-shots most enemies)
              Cooldown: 0.5s before next charge can begin
```

---

## 3. Enemy Design (MVP Scope)

### 3 Core + 1 Boss = 4 Enemy Types Total

#### Type 1: Drone (Fodder)

```
HP:          1
Speed:       Approaches player at medium speed
Behavior:    Flies in straight lines or gentle sine-wave patterns
Spawns:      In formations of 3–7 (V-shape, line, diamond)
Threat:      Low — dies in one hit
Purpose:     Satisfying to mow down. Popcorn enemies.
Visual:      Small, glowing, simple geometry (octahedron or small box)
```

#### Type 2: Fighter (Standard)

```
HP:          3
Speed:       Medium, can strafe laterally
Behavior:    Approaches, stops at mid-range, fires 2-shot bursts at player
             Strafes left/right between bursts
Spawns:      In pairs or trios, mixed with drones
Threat:      Medium — requires dodging return fire
Purpose:     Creates the dodge-and-shoot tension
Visual:      Slightly larger, angular, different color (red tint)
```

#### Type 3: Tank (Heavy)

```
HP:          8
Speed:       Slow approach
Behavior:    Moves to a position, stops, charges a visible beam (1.5s)
             Fires a wide horizontal or vertical laser sweep
             Beam is telegraphed with a red line before firing
Spawns:      Solo or with drone escorts, mid-to-late level
Threat:      High — beam does 2 damage if hit, but very avoidable
Purpose:     Changes player positioning, breaks rhythm
Visual:      Large, boxy, shield-like front plate
```

#### Boss: Void Carrier

```
HP:          50
Phases:      2 phases

Phase 1 (HP 50–25):
  - Fixed at screen center-far
  - Spawns drones from side bays (4 every 5 seconds)
  - Fires triple spread shots at player (every 2 seconds)
  - Weak point: glowing core (only takes damage when hit there)

Phase 2 (HP 25–0):
  - Drone spawning stops
  - Fires tracking missiles (2 at a time, every 3 seconds)
  - Laser sweep attack (telegraphed, dodge vertically)
  - Core exposed more frequently
  - Speed of attacks increases as HP drops

Visual: Large geometric shape, sharp angles, glowing weak point
```

### Difficulty Scaling (Within Single Run)

```
Time-based modifiers (applied gradually over level duration):
  - Enemy HP:        +0% → +30% over full level
  - Spawn rate:      starts at 1 wave/4sec → 1 wave/2sec
  - Enemy accuracy:  bullets aimed ±15° off-center → ±5°
  - Formation size:  3–5 early → 5–7 late

NO between-run difficulty scaling in MVP. One difficulty. One level.
```

---

## 4. Level Structure

### Single Level (~3–4 minutes of gameplay)

Spawning is **scripted timeline**, not procedural. This gives full control over pacing and is simpler to implement and tune.

```
Timeline (in seconds):

0:00–0:15   INTRO
            No enemies. Ship flies into the void.
            Ambient particles establish speed and depth.
            Music fades in.

0:15–0:45   WARM-UP
            Drone-only waves. 3–4 formations.
            Player learns movement and shooting.
            Pickups drop frequently.

0:45–1:30   ESCALATION
            Fighters introduced alongside drones.
            Mixed formations. Return fire begins.
            Spawn rate increases.

1:30–2:15   INTENSITY
            Tanks appear. Escorts with drones.
            Multiple simultaneous threats.
            Dense bullet patterns to dodge.
            Peak spawn rate.

2:15–2:30   BREATHER
            Brief calm. Maybe one small drone wave.
            Musical shift telegraphs boss incoming.

2:30–3:30   BOSS FIGHT
            Void Carrier encounter.
            Phase 1 → Phase 2.

3:30–3:45   VICTORY / RESULTS
            Explosion. Score tally. Restart prompt.
```

### Wave Definition Format (for implementation)

```typescript
type Wave = {
  time: number;           // seconds into level
  enemies: EnemyType[];   // what to spawn
  formation: Formation;   // 'v' | 'line' | 'diamond' | 'random'
  position: 'left' | 'center' | 'right' | 'wide';
};

// Example:
{ time: 16, enemies: ['drone','drone','drone'], formation: 'v', position: 'center' }
{ time: 48, enemies: ['fighter','drone','drone','fighter'], formation: 'line', position: 'wide' }
```

---

## 5. Feedback & Game Feel

### Hit Feedback (CRITICAL — this makes or breaks the game)

```
When player laser hits enemy:
  - Enemy flashes white for 1 frame (emissive spike)
  - Small particle burst at hit point (4–6 particles, fast fade)
  - Subtle hit sound (short, punchy, varied pitch ±10%)
  - Camera: zero shake for regular hits (too frequent)

When enemy is destroyed:
  - Explosion particle burst (15–20 particles, orange/yellow)
  - Brief screen shake (intensity: 0.05, duration: 0.1s)
  - Satisfying explosion sound
  - Enemy mesh scales to 0 over 0.1s then despawns
  - Drop pickup with 40% probability

When player takes damage:
  - Screen flash red (overlay, 0.15s)
  - Strong screen shake (intensity: 0.15, duration: 0.3s)
  - Ship flickers/blinks for 0.5s invincibility window
  - Chromatic aberration spike (if using postprocessing)
  - Warning sound

When barrel roll activates:
  - Motion blur in roll direction
  - Audio whoosh
  - Faint trail effect behind ship
```

### Visual Clarity

```
Player projectiles:    Bright cyan/blue, thin, fast
Enemy projectiles:     Bright red/orange, slightly larger, slower
Pickups:               Green glow, gentle bob animation, attract to player within radius
Enemy telegraph:       Red warning line 0.8s before beam attacks
Background:            Dark, minimal — stars and subtle nebula fog ONLY
                       Do not let background compete with gameplay elements
```

### Juice Checklist

```
[x] Screen shake (destroy, damage)
[x] Hit flash (white emissive)
[x] Particle explosions
[x] Ship tilt on movement
[x] Projectile trails (subtle glow)
[x] Pickup magnet (drift toward player when close)
[x] Score popup (+100 floating text, fade up and out)
[x] Charge shot glow ramp on ship
[x] Engine glow/trail on player ship (always on, subtle)
[x] Speed lines / particles rushing past camera (depth cue)
```

---

## 6. Upgrade System (Lightweight)

### Design Philosophy

Pickups drop from enemies. Collect enough to trigger an upgrade choice. No shop. No currencies. No inventory.

### Flow

```
Energy orbs drop from destroyed enemies (40% chance).
Every 10 orbs collected → upgrade choice appears.
Choice: pick 1 of 2 random upgrades (brief pause, overlay UI).
Max 3 upgrades per run (at 10, 20, 30 orbs).
Upgrades stack where applicable.
All upgrades reset on death/restart.
```

### Upgrade Pool (7 Total)

| #  | Name            | Effect                                      |
|----|-----------------|---------------------------------------------|
| 1  | Rapid Fire      | Fire rate +40% (8 → ~11 shots/sec)          |
| 2  | Wide Shot       | Adds 2 angled side lasers (±15°)            |
| 3  | Shield          | Absorbs 1 extra hit before taking damage     |
| 4  | Homing Shots    | Projectiles gently curve toward nearest enemy |
| 5  | Quick Charge    | Charged shot charges in 0.5s instead of 1s   |
| 6  | Magnet          | Pickup attract radius 3x larger              |
| 7  | Overdrive       | +20% auto-scroll speed, +25% score multiplier |

### Implementation Note

```
Upgrades are flags/multipliers on the player state object.
No upgrade has complex logic. Each is 3–10 lines of code max.
```

---

## 7. Technical Architecture

### Stack

```
React 18 + React Three Fiber (R3F) + Zustand + drei
Vite for bundling
No backend. No database. Fully client-side.
```

### Project Structure

```
src/
  main.tsx                  # Entry point, mount React
  App.tsx                   # Canvas + HUD overlay
  
  stores/
    gameStore.ts            # Zustand: ALL game state lives here
  
  components/
    Game.tsx                # Top-level R3F scene, orchestrates game
    Player.tsx              # Ship mesh + movement + shooting logic
    Enemy.tsx               # Single enemy instance (type-driven)
    EnemyManager.tsx        # Spawns/despawns enemies per timeline
    Projectile.tsx          # Reusable for player AND enemy bullets
    ProjectileManager.tsx   # Object pool, collision checks
    Pickup.tsx              # Energy orb with magnet behavior
    Boss.tsx                # Boss-specific logic and phases
    Environment.tsx         # Stars, particles, fog — pure visual
    Explosion.tsx           # Particle burst effect (reusable)
    
  ui/
    HUD.tsx                 # HP, score, energy — HTML overlay on canvas
    UpgradeChoice.tsx       # Upgrade selection modal
    TitleScreen.tsx         # Start screen
    GameOver.tsx            # Death + score + restart
    
  systems/
    collisions.ts           # Sphere-based collision detection
    timeline.ts             # Level wave definitions + scheduler
    audio.ts                # Sound effect triggers (Howler.js or Web Audio)
    
  data/
    waves.ts                # Wave[] array defining the full level
    enemies.ts              # Enemy stat definitions
    upgrades.ts             # Upgrade definitions

  types/
    index.ts                # Shared TypeScript types
```

### Game Loop Strategy

```
DO NOT build a custom game loop. R3F already gives you one via useFrame().

useFrame((state, delta) => {
  // This runs every frame at 60fps (or monitor refresh rate)
  // delta = time since last frame in seconds
  // Use delta for all movement: position += speed * delta
});

Each component manages its own update logic in its own useFrame().
Order of operations is handled by component mount order.
```

### State Management (Zustand)

```typescript
// gameStore.ts — single flat store, no nesting

interface GameState {
  // Game flow
  phase: 'title' | 'playing' | 'upgrading' | 'gameover' | 'victory';
  score: number;
  time: number;             // seconds elapsed in level
  
  // Player
  playerHP: number;         // starts at 3
  playerMaxHP: number;
  playerPosition: [number, number]; // x, y within bounds
  energy: number;           // pickup counter
  upgrades: string[];       // active upgrade IDs
  isInvulnerable: boolean;
  
  // Entities (arrays of plain objects, NOT React state)
  enemies: EnemyData[];
  playerProjectiles: ProjectileData[];
  enemyProjectiles: ProjectileData[];
  pickups: PickupData[];
  
  // Actions
  spawnEnemy: (data: EnemySpawn) => void;
  damageEnemy: (id: string, amount: number) => void;
  damagePlayer: () => void;
  addScore: (points: number) => void;
  collectPickup: (id: string) => void;
  applyUpgrade: (id: string) => void;
  reset: () => void;
}
```

### Critical Architecture Decisions

**Collision Detection: Sphere-based, brute force**
```
Every frame, check:
  - Player projectiles vs. enemies
  - Enemy projectiles vs. player
  - Player vs. pickups
  - Player vs. enemy projectiles

Use simple distance checks: if dist(a, b) < radiusA + radiusB → hit.
With <100 entities on screen, this is trivially fast. No spatial partitioning needed.
```

**Object Pooling: Projectiles only**
```
Projectiles spawn/despawn at high frequency.
Pre-allocate a pool of ~100 projectile objects.
On "spawn": activate a pooled object, set position/velocity.
On "despawn": deactivate (visible=false), return to pool.
This avoids GC pressure from rapid allocations.

Enemies and pickups: just create/destroy normally. Low frequency.
```

**Entity Management: Zustand arrays, R3F renders**
```
Entities live as plain data in Zustand.
A manager component (e.g., ProjectileManager) reads the array.
Maps each entry to a <Projectile> R3F component via .map().
useFrame in each component reads its data from the store and updates position.

Key: mutate Zustand arrays in-place where possible for perf.
Use immer middleware if immutability causes issues.
```

**Camera**
```
Camera is fixed, looking forward down the Z axis.
"Forward movement" is faked: enemies and environment move TOWARD the camera.
Player ship stays at roughly z=0, enemies spawn at z=-100 and approach.
This is simpler than moving the camera and avoids coordinate headaches.
```

**Audio**
```
Use Howler.js (small, reliable, handles Web Audio quirks).
Preload ~8 sounds: shoot, hit, explode, damage, pickup, charge, roll, boss-intro.
Vary pitch randomly on hit/shoot sounds to avoid repetition fatigue.
```

### Performance Targets

```
Target: 60fps on mid-range hardware
Entity budget: <100 active entities at any time
Particle budget: <200 active particles
Draw calls: keep under 50 (use instanced meshes for projectiles)
Geometry: all enemies are simple primitives or low-poly (<200 tri)
No textures needed for MVP — use MeshStandardMaterial with colors + emissive
```

---

## 8. MVP Scope Definition

### v1 INCLUDES

```
[x] One complete level (~3.5 minutes)
[x] Player ship with movement + auto-fire + charged shot + barrel roll
[x] 3 enemy types + 1 boss
[x] Scripted wave timeline
[x] Collision detection
[x] HP system (player has 3 HP)
[x] Score system
[x] Energy pickups + upgrade choices (7 upgrades)
[x] HUD (HP, score, energy count)
[x] Title screen → Game → Game Over / Victory loop
[x] Screen shake, hit flash, particles, explosions
[x] Background star field + speed particles
[x] Sound effects (8 sounds)
[x] One music track (or looping ambient — find a free asset)
[x] Ship visual tilt on movement
[x] Restart without page reload
```

### v1 EXPLICITLY EXCLUDES

```
[ ] Multiple levels / level select
[ ] Procedural generation
[ ] Online leaderboards
[ ] Save/load system
[ ] Multiplayer
[ ] Mobile/touch controls
[ ] Controller/gamepad support
[ ] Dialogue / story / cutscenes
[ ] Multiple ships / ship selection
[ ] Complex 3D models (everything is primitives)
[ ] Shadows, reflections, PBR materials
[ ] Settings menu (audio, controls, graphics)
[ ] Pause menu (can add easily later)
[ ] Minimap or radar
[ ] Multiple weapons / weapon switching
[ ] Between-run progression (roguelike meta)
```

---

## 9. Development Order (Suggested)

Build in this order. Each step produces something playable/testable.

```
Day 1:  Scaffolding + Player Movement
        - Vite + R3F + Zustand setup
        - Canvas with starfield background
        - Player ship (box geometry) with mouse-follow movement
        - Ship tilt animation
        - Auto-fire projectiles flying forward
        → TEST: ship moves, shoots, feels good

Day 2:  Enemies + Collisions
        - Drone enemy type (approaches, dies in 1 hit)
        - Basic collision detection
        - Explosion particles on enemy death
        - Hit flash effect
        - Score counter
        - Hardcoded test spawns
        → TEST: shoot things, they explode, score goes up

Day 3:  Combat Depth
        - Fighter enemy (shoots back)
        - Tank enemy (beam telegraph)
        - Player damage + HP system
        - Enemy projectiles + collision with player
        - Barrel roll (invincibility frames)
        - Screen shake + damage feedback
        - Charged shot
        → TEST: real back-and-forth combat feels good

Day 4:  Level Flow + Pickups
        - Wave timeline system
        - Full level scripted (all waves defined)
        - Energy pickups + collection
        - Upgrade choice UI (pick 1 of 2)
        - Implement all 7 upgrades
        - HUD (HP, score, energy)
        → TEST: full level plays start to finish

Day 5:  Boss + Polish
        - Boss encounter (2 phases)
        - Title screen + game over + victory screens
        - Sound effects integration
        - Music track
        - Particle polish pass
        - Difficulty tuning pass
        - Bug fixing
        → TEST: complete game loop, title → play → end → restart
```

---

## 10. Key Design Principles

```
1. FEEL FIRST    — Before adding content, make the ship feel incredible to fly.
                   Spend real time on lerp values, tilt, and shot feedback.

2. LESS IS MORE  — 3 good enemy types > 10 half-baked ones.
                   One polished level > 5 empty ones.

3. FAKE IT       — The ship doesn't move forward. The world moves backward.
                   Explosions are 20 particles, not physics simulations.
                   "Polish" is 5 lines of screen shake code, not a VFX system.

4. DATA-DRIVEN   — Enemies and waves are defined in plain arrays.
                   Tuning = editing numbers, not refactoring code.

5. PLAYTEST EARLY — Get the ship moving on Day 1. Shoot things on Day 2.
                    Never go more than a few hours without playing your own game.
```
