export type GamePhase = "title" | "playing" | "upgrading" | "gameover" | "victory";

export type EnemyType = "drone" | "fighter" | "tank";
export type Formation = "v" | "line" | "diamond" | "random" | "surround";
export type SpawnSide = "left" | "center" | "right" | "wide";

export interface ProjectileData {
  id: string;
  active: boolean;
  position: [number, number, number];
  velocity: [number, number, number];
  lifetime: number;
  owner: "player" | "enemy";
  isCharged?: boolean;
  radius?: number;
}

export interface EnemyData {
  id: string;
  type: EnemyType;
  hp: number;
  maxHp: number;
  position: [number, number, number];
  velocity: [number, number, number];
  state: "approaching" | "attacking" | "strafing" | "charging";
  stateTimer: number;
  radius: number;
  flashTimer: number;
  strafeFactor?: number; // 1 = chase player, -1 = mirror, fractional = offset
}

export interface PickupData {
  id: string;
  position: [number, number, number];
}

export interface Wave {
  time: number;
  enemies: EnemyType[];
  formation: Formation;
  position: SpawnSide;
}
