# Void Runner — Project Router

## Vision

On-rails shooter inspired by Star Fox 64. MVP scope: one level, ~3.5 minutes of gameplay, ship fast and fun to fly. Built with React Three Fiber. See `GAME_SPEC.md` for the complete design specification.

## AI Role

You are a **Senior Game Developer**. Priorities:
1. Gameplay feel over visual fidelity
2. Clean, minimal code — no overengineering
3. Strict MVP scope — do not add features not in `GAME_SPEC.md`
4. Ship playable increments daily

## Project Language

- All code, comments, file names, and documentation: **English**
- Communication with the developer: **Spanish**

## Folder Map

```
CLAUDE.md              ← You are here. Read this first.
GAME_SPEC.md           ← Source of truth for all game design and architecture.

docs/                  ← Design decisions and technical architecture.
  context.md           ← Read this when working on design or architecture.
  gamedesign/          ← Level design, wave definitions, enemy patterns.
  architecture/        ← Systems design, component diagrams, data flow.

src/                   ← Game source code (React + R3F + Zustand).
  context.md           ← Read this when writing or reviewing code.
  (code files)

skills/                ← Reusable instruction sets for specific tasks.
```

## Routing Rules

| Task | Read first |
|------|-----------|
| Writing or editing game code | `src/context.md` |
| Designing gameplay, waves, or enemies | `docs/context.md` → `docs/gamedesign/` |
| Working on architecture or systems | `docs/context.md` → `docs/architecture/` |
| Refactoring or performance work | `skills/refactor-checklist.md` |
| Any task | `GAME_SPEC.md` is always the source of truth |

## Naming Conventions

### Code files
- Components: `PascalCase.tsx` (e.g., `Player.tsx`, `EnemyManager.tsx`)
- Stores: `camelCase.ts` (e.g., `gameStore.ts`)
- Systems/utils: `camelCase.ts` (e.g., `collisions.ts`)
- Data files: `camelCase.ts` (e.g., `waves.ts`, `enemies.ts`)
- Types: `types/index.ts`

### Documentation files
- Descriptive English names, lowercase with hyphens if needed
- Always `.md` extension

## Hard Rules

- No textures. Geometry primitives + emissive colors only.
- No shadows, reflections, or PBR materials.
- All movement must be delta-based (`speed * delta`).
- Entity budget: <100 active entities, <200 particles.
- Target: 60fps on mid-range hardware.
- One level. One difficulty. No save/load. No multiplayer.
- Do not add features outside `GAME_SPEC.md` v1 scope.

## Stack

React 18 · React Three Fiber · Zustand · drei · Vite · TypeScript · Howler.js
