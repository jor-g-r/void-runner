# src/ — Code Context

## Stack

- **React 18** — UI layer and component model
- **React Three Fiber (R3F)** — Three.js renderer as React components
- **@react-three/drei** — R3F helpers (OrbitControls, Text, etc.)
- **Zustand** — Flat state store, no Redux boilerplate
- **Vite** — Dev server and bundler
- **TypeScript** — Strict mode
- **Howler.js** — Audio playback

## Folder Structure

```
src/
  main.tsx                  # Entry point
  App.tsx                   # Canvas + HTML overlay

  stores/
    gameStore.ts            # Single Zustand store for ALL game state

  components/
    Game.tsx                # Top-level R3F scene orchestrator
    Player.tsx              # Ship mesh + movement + shooting
    Enemy.tsx               # Single enemy (type-driven behavior)
    EnemyManager.tsx        # Spawns/despawns enemies per timeline
    Projectile.tsx          # Reusable for player AND enemy bullets
    ProjectileManager.tsx   # Object pool + collision checks
    Pickup.tsx              # Energy orb with magnet behavior
    Boss.tsx                # Boss logic and phases
    Environment.tsx         # Stars, speed particles, fog
    Explosion.tsx           # Particle burst effect

  ui/
    HUD.tsx                 # HP, score, energy — HTML overlay
    UpgradeChoice.tsx       # Pick 1 of 2 upgrades modal
    TitleScreen.tsx         # Start screen
    GameOver.tsx            # Death + score + restart

  systems/
    collisions.ts           # Sphere-based distance checks
    timeline.ts             # Wave scheduler (reads from data/waves.ts)
    audio.ts                # Howler.js wrapper, preloads sounds

  data/
    waves.ts                # Wave[] array — the full level definition
    enemies.ts              # Enemy type stats (HP, speed, behavior)
    upgrades.ts             # Upgrade definitions (name, effect)

  types/
    index.ts                # Shared TypeScript interfaces
```

## Key Patterns

### Game Loop
- **No custom game loop.** Use R3F's `useFrame((state, delta) => { ... })` in each component.
- All movement: `position += speed * delta` (frame-rate independent).
- Each component owns its own update logic.

### State Management
- Single flat Zustand store (`gameStore.ts`).
- Entities (enemies, projectiles, pickups) are plain object arrays in the store.
- Manager components (e.g., `ProjectileManager`) read arrays and render via `.map()`.
- Mutate arrays in-place for performance where possible.

### Collisions
- Sphere-based: `distance(a, b) < radiusA + radiusB`.
- Brute force — no spatial partitioning needed at <100 entities.
- Check every frame in `ProjectileManager` and `EnemyManager`.

### Object Pooling
- Projectiles only (high spawn/despawn frequency).
- Pre-allocate ~100 objects. Activate/deactivate instead of create/destroy.
- Enemies and pickups: normal create/destroy (low frequency).

### Camera
- Fixed at origin, looking down -Z axis.
- "Forward movement" is faked: enemies/environment move toward camera.
- Player stays at ~z=0.

### Rendering
- All geometry: primitives (BoxGeometry, OctahedronGeometry, etc.).
- Materials: `MeshStandardMaterial` with `color` + `emissive`. No textures.
- No shadows. No post-processing (except optional chromatic aberration on damage).
- Keep draw calls under 50. Use `InstancedMesh` for projectiles.

## Conventions

- Components: `PascalCase.tsx`
- Stores/systems/data: `camelCase.ts`
- Types: centralized in `types/index.ts`
- No barrel exports. Import directly from the file.
- Prefer `const` arrow functions for components.
- No comments unless logic is non-obvious.
