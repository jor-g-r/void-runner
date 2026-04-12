import { create } from "zustand";
import type { EnemyData, GamePhase, ProjectileData } from "../types";

let nextProjectileId = 0;

interface ShakeRequest {
  intensity: number;
  duration: number;
}

interface GameState {
  phase: GamePhase;
  score: number;
  time: number;

  playerHP: number;
  playerMaxHP: number;
  playerPosition: [number, number];
  energy: number;
  upgrades: string[];
  isInvulnerable: boolean;
  invulnerableTimer: number;
  chargeLevel: number;
  barrelRollCooldown: number;
  isBarrelRolling: boolean;
  barrelRollTimer: number;

  enemies: EnemyData[];
  playerProjectiles: ProjectileData[];
  enemyProjectiles: ProjectileData[];

  // Screen shake
  shakeRequest: ShakeRequest | null;

  tick: (delta: number) => void;
  setPlayerPosition: (pos: [number, number]) => void;
  firePlayerProjectile: (x: number, y: number) => void;
  fireChargedShot: (x: number, y: number) => void;
  fireEnemyProjectile: (pos: [number, number, number], vel: [number, number, number]) => void;
  spawnEnemy: (enemy: EnemyData) => void;
  damagePlayer: () => void;
  addScore: (points: number) => void;
  requestShake: (intensity: number, duration: number) => void;
  clearShake: () => void;
  startBarrelRoll: () => void;
  startGame: () => void;
  reset: () => void;
}

const INITIAL_STATE = {
  phase: "title" as GamePhase,
  score: 0,
  time: 0,
  playerHP: 3,
  playerMaxHP: 3,
  playerPosition: [0, 0] as [number, number],
  energy: 0,
  upgrades: [] as string[],
  isInvulnerable: false,
  invulnerableTimer: 0,
  chargeLevel: 0,
  barrelRollCooldown: 0,
  isBarrelRolling: false,
  barrelRollTimer: 0,
  enemies: [] as EnemyData[],
  playerProjectiles: [] as ProjectileData[],
  enemyProjectiles: [] as ProjectileData[],
  shakeRequest: null as ShakeRequest | null,
};

export const useGameStore = create<GameState>((set) => ({
  ...INITIAL_STATE,

  tick: (rawDelta) =>
    set((state) => {
      const delta = Math.min(rawDelta, 0.1);

      // Update player projectiles
      const playerProj = state.playerProjectiles
        .map((p) => ({
          ...p,
          position: [
            p.position[0] + p.velocity[0] * delta,
            p.position[1] + p.velocity[1] * delta,
            p.position[2] + p.velocity[2] * delta,
          ] as [number, number, number],
          lifetime: p.lifetime - delta,
        }))
        .filter((p) => p.lifetime > 0);

      // Update enemy projectiles
      const enemyProj = state.enemyProjectiles
        .map((p) => ({
          ...p,
          position: [
            p.position[0] + p.velocity[0] * delta,
            p.position[1] + p.velocity[1] * delta,
            p.position[2] + p.velocity[2] * delta,
          ] as [number, number, number],
          lifetime: p.lifetime - delta,
        }))
        .filter((p) => p.lifetime > 0);

      // Update invulnerability timer
      const invulnerableTimer = Math.max(0, state.invulnerableTimer - delta);
      const barrelRollCooldown = Math.max(0, state.barrelRollCooldown - delta);
      const barrelRollTimer = Math.max(0, state.barrelRollTimer - delta);

      return {
        time: state.time + delta,
        playerProjectiles: playerProj,
        enemyProjectiles: enemyProj,
        isInvulnerable: invulnerableTimer > 0 || barrelRollTimer > 0,
        invulnerableTimer,
        barrelRollCooldown,
        barrelRollTimer,
        isBarrelRolling: barrelRollTimer > 0,
      };
    }),

  setPlayerPosition: (pos) => set({ playerPosition: pos }),

  firePlayerProjectile: (x, y) =>
    set((state) => ({
      playerProjectiles: [
        ...state.playerProjectiles,
        {
          id: `pp-${nextProjectileId++}`,
          active: true,
          position: [x, y, -2] as [number, number, number],
          velocity: [0, 0, -200] as [number, number, number],
          lifetime: 2,
          owner: "player" as const,
        },
      ],
    })),

  fireChargedShot: (x, y) =>
    set((state) => ({
      playerProjectiles: [
        ...state.playerProjectiles,
        {
          id: `pp-${nextProjectileId++}`,
          active: true,
          position: [x, y, -2] as [number, number, number],
          velocity: [0, 0, -150] as [number, number, number],
          lifetime: 3,
          owner: "player" as const,
          isCharged: true,
          radius: 1.5,
        },
      ],
      chargeLevel: 0,
    })),

  fireEnemyProjectile: (pos, vel) =>
    set((state) => ({
      enemyProjectiles: [
        ...state.enemyProjectiles,
        {
          id: `ep-${nextProjectileId++}`,
          active: true,
          position: [...pos] as [number, number, number],
          velocity: [...vel] as [number, number, number],
          lifetime: 4,
          owner: "enemy" as const,
        },
      ],
    })),

  spawnEnemy: (enemy) =>
    set((state) => ({
      enemies: [...state.enemies, enemy],
    })),

  damagePlayer: () =>
    set((state) => {
      if (state.isInvulnerable) return {};
      const newHP = state.playerHP - 1;
      return {
        playerHP: newHP,
        isInvulnerable: true,
        invulnerableTimer: 1.5,
        phase: newHP <= 0 ? "gameover" : state.phase,
        shakeRequest: { intensity: 0.15, duration: 0.3 },
      };
    }),

  addScore: (points) =>
    set((state) => ({
      score: state.score + points,
    })),

  requestShake: (intensity, duration) =>
    set({ shakeRequest: { intensity, duration } }),

  clearShake: () => set({ shakeRequest: null }),

  startBarrelRoll: () =>
    set((state) => {
      if (state.barrelRollCooldown > 0 || state.isBarrelRolling) return {};
      return {
        isBarrelRolling: true,
        barrelRollTimer: 0.4,
        barrelRollCooldown: 2,
      };
    }),

  startGame: () => {
    nextProjectileId = 0;
    set({ ...INITIAL_STATE, phase: "playing" });
  },

  reset: () => {
    nextProjectileId = 0;
    set({ ...INITIAL_STATE });
  },
}));
