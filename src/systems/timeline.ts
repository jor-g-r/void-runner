import type { EnemyData, EnemyType, Formation, SpawnSide } from "../types";
import { ENEMY_STATS } from "../data/enemies";

let nextEnemyId = 0;

export function resetTimelineIds() {
  nextEnemyId = 0;
}

function getFormationOffsets(count: number, formation: Formation): [number, number][] {
  const offsets: [number, number][] = [];

  switch (formation) {
    case "v":
      for (let i = 0; i < count; i++) {
        const side = i % 2 === 0 ? 1 : -1;
        const row = Math.floor((i + 1) / 2);
        offsets.push([side * row * 1.5, -row * 0.5]);
      }
      break;

    case "line":
      for (let i = 0; i < count; i++) {
        offsets.push([(i - (count - 1) / 2) * 2, 0]);
      }
      break;

    case "diamond":
      offsets.push([0, 1.5]);
      offsets.push([-1.5, 0]);
      offsets.push([1.5, 0]);
      offsets.push([0, -1.5]);
      for (let i = 4; i < count; i++) {
        offsets.push([(Math.random() - 0.5) * 3, (Math.random() - 0.5) * 3]);
      }
      break;

    case "surround":
      for (let i = 0; i < count; i++) {
        const angle = (i / count) * Math.PI * 2;
        offsets.push([Math.cos(angle) * 4, Math.sin(angle) * 2]);
      }
      break;

    case "random":
    default:
      for (let i = 0; i < count; i++) {
        offsets.push([(Math.random() - 0.5) * 8, (Math.random() - 0.5) * 4]);
      }
      break;
  }

  return offsets;
}

function getBaseX(position: SpawnSide): number {
  switch (position) {
    case "left":
      return -3;
    case "right":
      return 3;
    case "center":
      return 0;
    case "wide":
      return 0;
  }
}

// Player BOUNDS_X = 8.2; clamp enemies inside that minus a small margin so
// the player can always position to hit them with a straight shot.
const ENEMY_MAX_X = 7;
const ENEMY_MAX_Y = 4;

export function spawnWave(
  enemies: EnemyType[],
  formation: Formation,
  position: SpawnSide,
): EnemyData[] {
  const offsets = getFormationOffsets(enemies.length, formation);
  const baseX = getBaseX(position);
  const result: EnemyData[] = [];

  // Count fighters and track their order so we can spread them across
  // distinct attack lanes (prevents the "both converge on player" bug).
  const fighterCount = enemies.filter((t) => t === "fighter").length;
  let fighterIdx = 0;

  // Per-wave swoop angle for drones. All drones in a wave share a base
  // direction (with small jitter) so the swoop reads as a unified strike
  // team rather than random entries from everywhere.
  const waveSwoopAngle = Math.random() * Math.PI * 2;

  for (let i = 0; i < enemies.length; i++) {
    const type = enemies[i];
    const stats = ENEMY_STATS[type];
    const [ox, oy] = offsets[i] ?? [0, 0];

    let strafeOffsetX: number | undefined;
    let strafeOffsetY: number | undefined;
    let strafePhase: number | undefined;
    if (type === "fighter") {
      const laneT = fighterCount > 1 ? fighterIdx / (fighterCount - 1) : Math.random();
      strafeOffsetX = (laneT - 0.5) * 8 + (Math.random() - 0.5) * 1.2;
      strafeOffsetY = (Math.random() - 0.5) * 2.5;
      strafePhase = Math.random() * Math.PI * 2;
      fighterIdx++;
    }

    const formationX = Math.max(-ENEMY_MAX_X, Math.min(ENEMY_MAX_X, baseX + ox));
    const formationY = Math.max(-ENEMY_MAX_Y, Math.min(ENEMY_MAX_Y, oy));

    // Drones swoop in from a point off to the side before settling into
    // the formation at z = -15 (comfortable fire range). Everyone else
    // spawns directly at their formation position and approaches.
    let position: [number, number, number];
    let state: EnemyData["state"];
    let entryOriginX: number | undefined;
    let entryOriginY: number | undefined;
    let entryOriginZ: number | undefined;
    let formationTargetX: number | undefined;
    let formationTargetY: number | undefined;
    let formationTargetZ: number | undefined;

    if (type === "drone") {
      const angle = waveSwoopAngle + (Math.random() - 0.5) * 0.5;
      const radius = 16 + Math.random() * 4;
      entryOriginX = formationX + Math.cos(angle) * radius;
      entryOriginY = formationY + Math.sin(angle) * radius;
      entryOriginZ = -55 - Math.random() * 5;
      formationTargetX = formationX;
      formationTargetY = formationY;
      formationTargetZ = -15 - Math.random() * 2;
      position = [entryOriginX, entryOriginY, entryOriginZ];
      state = "entering";
    } else {
      position = [formationX, formationY, -45 - Math.random() * 5];
      state = "approaching";
    }

    // 20% of drones are shooters. Cooldown is tight (0.2–0.8s after entering
    // formation) because drones only live ~2s post-swoop before despawning
    // past the player — any longer and most shooter-drones never fire.
    const canShoot = type === "drone" && Math.random() < 0.2;
    const shootCooldown = canShoot ? 0.2 + Math.random() * 0.6 : undefined;

    result.push({
      id: `enemy-${nextEnemyId++}`,
      type,
      hp: stats.hp,
      maxHp: stats.hp,
      position,
      velocity: [0, 0, stats.speed],
      state,
      stateTimer: 0,
      radius: stats.radius,
      flashTimer: 0,
      strafeOffsetX,
      strafeOffsetY,
      strafePhase,
      entryOriginX,
      entryOriginY,
      entryOriginZ,
      formationTargetX,
      formationTargetY,
      formationTargetZ,
      canShoot: canShoot || undefined,
      shootCooldown,
    });
  }

  return result;
}
