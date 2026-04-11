# Skill: Refactor Checklist

Use this checklist when refactoring code or optimizing performance in Void Runner.

## Before Refactoring

- [ ] Confirm the game runs and plays correctly (baseline)
- [ ] Identify the specific problem (perf? readability? bug-prone?)
- [ ] Check if the change stays within MVP scope

## Performance Checks

- [ ] Entity count: are there ever >100 active entities? (check `enemies.length + projectiles.length + pickups.length`)
- [ ] Particle count: >200 active particles?
- [ ] Draw calls: open R3F devtools, verify <50 draw calls
- [ ] Are projectiles using the object pool? (no `new` in hot path)
- [ ] All movement uses `delta` from `useFrame`? (no frame-rate dependent code)
- [ ] No unnecessary re-renders: Zustand selectors are granular?

## Code Quality Checks

- [ ] No duplicated logic between components
- [ ] Enemy behavior driven by data (`enemies.ts`), not hardcoded per-type
- [ ] Wave definitions are pure data (`waves.ts`), not mixed with logic
- [ ] Types are in `types/index.ts`, not scattered
- [ ] No unused imports or dead code

## After Refactoring

- [ ] Game still runs at 60fps
- [ ] Play through full level — no regressions
- [ ] All enemy types behave correctly
- [ ] Boss fight works (both phases)
- [ ] Pickups and upgrades still function
- [ ] Sound effects still trigger
