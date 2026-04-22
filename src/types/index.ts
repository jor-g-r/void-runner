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
  state: "entering" | "approaching" | "attacking" | "strafing" | "charging";
  stateTimer: number;
  radius: number;
  flashTimer: number;
  // Per-fighter attack lane. Absolute X/Y offsets from the player (not
  // multipliers) so fighters hold distinct lanes even when the player is at
  // center — avoids the convergence bug. `strafePhase` desynchronizes the
  // Y sine wave so each fighter oscillates at a different time.
  strafeOffsetX?: number;
  strafeOffsetY?: number;
  strafePhase?: number;
  // Swoop-in entrance. `position` starts at the entry origin; the manager
  // eases position toward (formationTargetX/Y/Z) over ENTRY_DURATION, then
  // flips state to "approaching" so normal forward motion takes over.
  entryOriginX?: number;
  entryOriginY?: number;
  entryOriginZ?: number;
  formationTargetX?: number;
  formationTargetY?: number;
  formationTargetZ?: number;
  // Drone firing: only ~20% of drones spawn with `canShoot`, and they fire
  // once their `shootCooldown` reaches 0 (post-entrance only).
  canShoot?: boolean;
  shootCooldown?: number;
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

export interface AsteroidData {
  id: string;
  position: [number, number, number];
  velocity: [number, number, number];
  radius: number;
  rotation: [number, number, number];
  rotationSpeed: [number, number, number];
}
