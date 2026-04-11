import { create } from "zustand";
import type { GamePhase, ProjectileData } from "../types";

let nextProjectileId = 0;

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
  chargeLevel: number;
  barrelRollCooldown: number;

  playerProjectiles: ProjectileData[];

  tick: (delta: number) => void;
  setPlayerPosition: (pos: [number, number]) => void;
  firePlayerProjectile: (x: number, y: number) => void;
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
  chargeLevel: 0,
  barrelRollCooldown: 0,
  playerProjectiles: [] as ProjectileData[],
};

export const useGameStore = create<GameState>((set) => ({
  ...INITIAL_STATE,

  tick: (rawDelta) =>
    set((state) => {
      const delta = Math.min(rawDelta, 0.1);
      const projectiles = state.playerProjectiles
        .map((p) => ({
          ...p,
          position: [
            p.position[0],
            p.position[1],
            p.position[2] + p.velocity[2] * delta,
          ] as [number, number, number],
          lifetime: p.lifetime - delta,
        }))
        .filter((p) => p.lifetime > 0);

      return {
        time: state.time + delta,
        playerProjectiles: projectiles,
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

  startGame: () => set({ ...INITIAL_STATE, phase: "playing" }),

  reset: () => {
    nextProjectileId = 0;
    set({ ...INITIAL_STATE });
  },
}));
