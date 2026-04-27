# Void Runner

> Vaporwave / interdimensional on-rails shooter inspired by Star Fox 64.
> Built with React Three Fiber. One level, ~3.5 minutes, designed to feel great to fly.

Submission target: **Cursor Vibe Jam 2026** (deadline May 1, 2026).

---

## Pitch

You pilot a ship hurtling forward through the void. Enemies spawn ahead in formations, your guns auto-fire, and your only job is to **position, dodge, and burst** — punctuated by a charged shot, a barrel roll for i-frames, and a 2-phase boss at the end.

The aesthetic is **vaporwave / interdimensional**, not generic space: synthwave palette, geometric primitives, emissive glow, custom shader work for the lane/floor.

---

## Stack

| Layer       | Tech                                                                                |
| ----------- | ----------------------------------------------------------------------------------- |
| Rendering   | React Three Fiber 9 + Three.js 0.175 + drei                                         |
| UI          | React 19 + plain CSS overlays (HUD on top of `<Canvas>`)                            |
| State       | Zustand 5 (single flat store)                                                       |
| Build       | Vite + TypeScript (strict)                                                          |
| Audio       | Howler-style playback via `jsfxr` for SFX (serialized strings) + raw MP3s for music |
| Package mgr | pnpm (workspace, catalog)                                                           |

No backend. No database. Fully client-side, deployable as a static bundle.

### Run it

```bash
pnpm install
pnpm dev          # local dev server
pnpm build        # tsc + vite build → dist/
pnpm preview      # serve the production build
pnpm lint
```

---

## Core Loop

```
Auto-scroll forward → enemies appear → dodge fire while shooting →
destroyed enemies drop energy orbs → every 10 orbs triggers a 1-of-2
upgrade choice → escalate through scripted waves → boss → victory.
```

| Action                                    | Input                            |
| ----------------------------------------- | -------------------------------- |
| Move                                      | Mouse position OR WASD / arrows  |
| Auto-fire                                 | Always on                        |
| Charged shot                              | Hold Space (1s) → AoE blast      |
| Barrel roll (i-frames, 0.4s, 2s cooldown) | Double-tap A/D or ←/→            |
| Touch (desktop-recommended fallback)      | Virtual joystick + tap-to-charge |

---

## Design Snapshot

The full design spec lives in [`GAME_SPEC.md`](./GAME_SPEC.md). Highlights:

- **3 enemy types + 1 boss**: Drone (1 HP, popcorn), Fighter (3 HP, return fire), Tank (8 HP, telegraphed beam), Void Carrier (50 HP, 2 phases).
- **Scripted timeline** (not procedural): intro → warm-up → escalation → intensity → breather → boss → victory, totalling ~3:45.
- **7 upgrades** picked 1-of-2, max 3 per run: Rapid Fire, Wide Shot, Shield, Homing Shots, Quick Charge, Magnet, Overdrive.
- **Game feel rules**: hit flash, particle bursts, screen shake (only on destroy/damage, never per-hit), red-flash on damage, charge-glow ramp, pickup magnet.

Deeper material:

- [`docs/gamedesign/`](./docs/gamedesign/) — wave-by-wave timeline.
- [`docs/architecture/`](./docs/architecture/) — systems, state, collisions, pooling.

---

## Hard Rules (do not violate)

These are intentional constraints that keep scope tight and performance safe:

- No textures. Geometry primitives + emissive colors only.
- No shadows, no PBR materials, no reflections.
- All movement must be **delta-based** (`speed * delta`) — frame-rate independent.
- Entity budget: **<100 active entities**, **<200 particles**, **<50 draw calls**.
- Target: **60fps on mid-range hardware**.
- One level. One difficulty. No save/load. No multiplayer. No procedural gen.
- The camera does not move forward — the world moves toward the camera.

---

## Project Structure

```
CLAUDE.md            ← AI router (project rules, naming, stack)
GAME_SPEC.md         ← Source of truth for all design
README.md            ← You are here
index.html           ← Vite entry, includes Vibe Jam widget script

docs/
  context.md
  gamedesign/        ← waves, enemy patterns, level pacing
  architecture/      ← systems, state, data flow

public/
  audio/             ← stage-intro.mp3, stage-00.mp3 (music)
  models/            ← (optional GLB models, geometry-only)
  og-image.png

src/
  main.tsx           ← React mount
  App.tsx            ← Canvas + HTML overlays
  index.css

  stores/
    gameStore.ts     ← Single flat Zustand store, ALL game state

  components/        ← R3F scene
    Game.tsx                ← Top-level orchestrator
    Player.tsx              ← Ship, movement, shooting, barrel roll
    EnemyManager.tsx        ← Spawns + despawns per timeline
    EnemyRenderer.tsx       ← Renders all active enemies
    ProjectileManager.tsx   ← Object pool + collisions
    PickupRenderer.tsx
    Pickup.tsx
    Boss.tsx
    AsteroidManager.tsx     ← Environmental hazards / debris
    Environment.tsx         ← Stars, fog, speed lines, vaporwave lane
    Explosion.tsx
    PlayerDeathNova.tsx     ← Player-death effect
    ScorePopup.tsx
    ScreenShake.tsx
    Crosshair.tsx

  ui/                ← HTML overlays (not inside Canvas)
    HUD.tsx
    TitleScreen.tsx
    GameOver.tsx
    Victory.tsx
    UpgradeChoice.tsx
    ControlsModal.tsx
    MuteButton.tsx
    TouchControls.tsx       ← Virtual joystick for touch devices
    DesktopOnlyPrompt.tsx   ← "Best on desktop" gate w/ "Play anyway" escape

  systems/
    collisions.ts           ← Sphere-based brute-force checks
    timeline.ts             ← Wave scheduler
    audio.ts                ← jsfxr SFX + MP3 music
    platform.ts             ← Device / touch detection
    fullscreen.ts           ← Fullscreen + landscape lock
    touchInput.ts           ← Joystick + tap input
    modelUtils.ts
    vaporwaveMaterial.ts    ← Custom shader for the lane / aesthetic

  data/
    waves.ts                ← Full level definition (Wave[])
    enemies.ts              ← Enemy stat table
    upgrades.ts             ← The 7 upgrade definitions

  types/
    index.ts                ← Shared TS types
```

---

## Architecture Cheatsheet

- **Game loop**: no custom loop. Each component runs its own `useFrame((state, delta) => …)`.
- **State**: one flat Zustand store. Entity arrays (enemies, projectiles, pickups) live as plain data; manager components map them to R3F components. In-place mutation is allowed for perf.
- **Collisions**: brute-force sphere distance checks every frame. With <100 entities this is trivial; no spatial partitioning.
- **Pooling**: projectiles only (high churn). Enemies and pickups create/destroy normally.
- **Camera**: fixed at origin looking down −Z. Player at ~z=0; enemies spawn at z=−100 and approach.
- **Audio**: SFX as serialized `jsfxr` strings (so they live in source); music as MP3 files in `public/audio/`.

---

## Current Implementation State

What is wired up beyond the base spec:

- Full player loop: movement, auto-fire, charged shot, barrel roll, death sequence (`PlayerDeathNova`).
- Enemy manager + renderer, projectile manager with pooling, pickup renderer with magnet behavior.
- Boss component (Void Carrier).
- Environmental layer: starfield, speed particles, vaporwave shader lane, asteroids/debris.
- Full UI flow: Title → Controls modal → Game → Upgrade choice → Game Over / Victory.
- Audio: title/intro music + stage-00 music + jsfxr SFX, with a mute button.
- **Mobile path** (kept as fallback, gated behind `DesktopOnlyPrompt` with a "Play anyway" escape): touch joystick, fullscreen + landscape rotate, responsive UI.
- Vibe Jam 2026 widget script embedded in `index.html` (required for submission).

What is intentionally **not** included (per MVP scope):

- Multiple levels, level select, procedural gen.
- Online leaderboards, save/load, multiplayer.
- Gamepad support, settings menu, pause menu, minimap.
- Between-run progression / roguelike meta.
- Shadows, reflections, PBR materials, post-processing (beyond optional chromatic aberration on damage).

---

## Aesthetic Direction

**Vaporwave + interdimensional**, not generic sci-fi space. This affects sound, music, palette, and shader choices — synthwave gradients, neon emissives, retro-futurist UI, dreamlike rather than militaristic.

---

## Conventions

- Code, comments, filenames, docs: **English**.
- Components: `PascalCase.tsx`. Stores/systems/data: `camelCase.ts`. Types centralized in `types/index.ts`.
- No barrel exports. Direct imports.
- Comments only when the _why_ is non-obvious; no narrating _what_ the code does.
- No premature abstractions, no backwards-compat shims for code we control.

---

## Reviewing This Project

If you are an AI or human reviewer asked to assess Void Runner without reading the code, the recommended path is:

1. Read this README.
2. Read [`GAME_SPEC.md`](./GAME_SPEC.md) for the full design contract.
3. Skim [`CLAUDE.md`](./CLAUDE.md) for the rules the project is built under.
4. Open [`docs/gamedesign/`](./docs/gamedesign/) and [`docs/architecture/`](./docs/architecture/) for depth on waves and systems.

That covers vision, design, scope boundaries, current state, and architectural decisions — enough for a meaningful review without touching `src/`.
