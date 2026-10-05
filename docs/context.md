# docs/ — Design & Architecture Context

## Purpose

This directory holds game design decisions and technical architecture documents that expand on the base `GAME_SPEC.md`. Read these when you need deeper detail than the spec provides.

## Source of Truth

`GAME_SPEC.md` (project root) is always the primary reference. Documents here expand on specific sections but never contradict it. If there's a conflict, `GAME_SPEC.md` wins.

## Contents

| Path                          | Contains                                                                                          | Read when...                                                                                    |
| ----------------------------- | ------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `gamedesign/waves.md`         | Full wave timeline with typed definitions for every enemy spawn in the level                      | Implementing `EnemyManager`, `timeline.ts`, or `data/waves.ts`                                  |
| `architecture/systems.md`     | Detailed system design: game loop, state management, collisions, object pooling, entity lifecycle | Implementing core systems, debugging performance, or making architectural decisions             |
| `architecture/leaderboard.md` | Supabase-backed global top-10 scoreboard: schema, RLS, client integration                         | Touching anything under `src/lib/` or the end-of-run submit flow                                |
| `tech-debt.md`                | Known divergences between the code and the documented architecture                                | Starting any refactor, fixing a bug suspected to be architectural, or planning the next session |

## When to Consult This Directory

- You're about to implement a game system and need to understand how it fits with other systems
- You need the exact wave spawn data for the level
- You're making a decision that affects multiple components
- You want to understand _why_ a design choice was made, not just _what_ it is
