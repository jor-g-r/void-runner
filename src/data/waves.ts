import type { Wave } from "../types";

export const LEVEL_WAVES: Wave[] = [
  // === WARM-UP (5–30s) — Drones only ===
  { time: 5, enemies: ["drone", "drone", "drone"], formation: "v", position: "center" },
  { time: 10, enemies: ["drone", "drone", "drone", "drone"], formation: "line", position: "left" },
  { time: 15, enemies: ["drone", "drone", "drone", "drone"], formation: "line", position: "right" },
  { time: 20, enemies: ["drone", "drone", "drone", "drone", "drone"], formation: "v", position: "center" },
  { time: 26, enemies: ["drone", "drone", "drone", "drone", "drone", "drone"], formation: "diamond", position: "wide" },

  // === ESCALATION (32–72s) — Fighters join ===
  { time: 32, enemies: ["fighter", "drone", "drone", "fighter"], formation: "line", position: "wide" },
  { time: 38, enemies: ["drone", "drone", "drone", "drone", "drone"], formation: "v", position: "center" },
  { time: 43, enemies: ["fighter", "fighter"], formation: "line", position: "center" },
  { time: 49, enemies: ["drone", "drone", "drone", "drone", "drone", "drone", "drone"], formation: "random", position: "wide" },
  { time: 55, enemies: ["fighter", "drone", "drone", "drone", "fighter"], formation: "v", position: "left" },
  { time: 61, enemies: ["fighter", "fighter", "fighter"], formation: "line", position: "right" },
  { time: 67, enemies: ["drone", "drone", "fighter", "drone", "drone"], formation: "diamond", position: "center" },

  // === INTENSITY (74–115s) — Tanks appear ===
  { time: 74, enemies: ["tank"], formation: "line", position: "center" },
  { time: 80, enemies: ["drone", "drone", "drone", "drone", "drone"], formation: "random", position: "wide" },
  { time: 86, enemies: ["fighter", "fighter", "fighter"], formation: "v", position: "left" },
  { time: 92, enemies: ["tank", "drone", "drone", "drone", "drone"], formation: "line", position: "right" },
  { time: 98, enemies: ["fighter", "fighter", "drone", "drone", "drone", "drone"], formation: "surround", position: "wide" },
  { time: 104, enemies: ["tank", "fighter", "fighter"], formation: "line", position: "center" },
  { time: 110, enemies: ["drone", "drone", "drone", "drone", "drone", "drone", "drone"], formation: "random", position: "wide" },

  // === BREATHER (116–120s) ===
  { time: 116, enemies: ["drone", "drone", "drone"], formation: "line", position: "center" },
];

// Boss spawns at this time (handled separately)
export const BOSS_SPAWN_TIME = 125;
export const LEVEL_END_TIME = 140;
