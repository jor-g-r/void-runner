import type { EnemyData, EnemyType, Formation, SpawnSide } from "../types";
import { ENEMY_STATS } from "../data/enemies";

let nextEnemyId = 0;

export function resetTimelineIds() {
  nextEnemyId = 0;
}

function getFormationOffsets(
  count: number,
  formation: Formation,
): [number, number][] {
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
    case "left": return -4;
    case "right": return 4;
    case "center": return 0;
    case "wide": return 0;
  }
}

export function spawnWave(
  enemies: EnemyType[],
  formation: Formation,
  position: SpawnSide,
): EnemyData[] {
  const offsets = getFormationOffsets(enemies.length, formation);
  const baseX = getBaseX(position);
  const result: EnemyData[] = [];

  for (let i = 0; i < enemies.length; i++) {
    const type = enemies[i];
    const stats = ENEMY_STATS[type];
    const [ox, oy] = offsets[i] ?? [0, 0];

    const strafeFactor = type === "fighter"
      ? (Math.random() < 0.5 ? 1 : -(0.6 + Math.random() * 0.4))
      : undefined;

    result.push({
      id: `enemy-${nextEnemyId++}`,
      type,
      hp: stats.hp,
      maxHp: stats.hp,
      position: [
        baseX + ox,
        oy,
        -45 - Math.random() * 5,
      ],
      velocity: [0, 0, stats.speed],
      state: "approaching",
      stateTimer: 0,
      radius: stats.radius,
      flashTimer: 0,
      strafeFactor,
    });
  }

  return result;
}
