import type { EnemyType } from "../types";

interface EnemyStats {
  hp: number;
  speed: number;
  radius: number;
  score: number;
}

export const ENEMY_STATS: Record<EnemyType, EnemyStats> = {
  drone: {
    hp: 1,
    speed: 15,
    radius: 0.6,
    score: 100,
  },
  fighter: {
    hp: 3,
    speed: 12,
    radius: 0.8,
    score: 250,
  },
  tank: {
    hp: 8,
    speed: 8,
    radius: 1.2,
    score: 500,
  },
};
