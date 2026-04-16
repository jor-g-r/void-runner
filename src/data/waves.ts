import type { Wave } from "../types";

export const LEVEL_WAVES: Wave[] = [
  // === WARM-UP (5–30s) — Drones only ===
  { time: 5, enemies: ["drone", "drone", "drone"], formation: "v", position: "center" },
  { time: 10, enemies: ["drone", "drone", "drone", "drone"], formation: "line", position: "left" },
  { time: 15, enemies: ["drone", "drone", "drone", "drone"], formation: "line", position: "right" },
  {
    time: 20,
    enemies: ["drone", "drone", "drone", "drone", "drone"],
    formation: "v",
    position: "center",
  },
  {
    time: 26,
    enemies: ["drone", "drone", "drone", "drone", "drone", "drone"],
    formation: "diamond",
    position: "wide",
  },

  // === ESCALATION (32–72s) — Fighters join ===
  {
    time: 32,
    enemies: ["fighter", "drone", "drone", "fighter"],
    formation: "line",
    position: "wide",
  },
  {
    time: 38,
    enemies: ["drone", "drone", "drone", "drone", "drone"],
    formation: "v",
    position: "center",
  },
  { time: 43, enemies: ["fighter", "fighter"], formation: "line", position: "center" },
  {
    time: 49,
    enemies: ["drone", "drone", "drone", "drone", "drone", "drone", "drone"],
    formation: "random",
    position: "wide",
  },
  {
    time: 55,
    enemies: ["fighter", "drone", "drone", "drone", "fighter"],
    formation: "v",
    position: "left",
  },
  { time: 61, enemies: ["fighter", "fighter", "fighter"], formation: "line", position: "right" },
  {
    time: 67,
    enemies: ["drone", "drone", "fighter", "drone", "drone"],
    formation: "diamond",
    position: "center",
  },

  // === INTENSITY (74–135s) — Tanks appear, dense mixed waves ===
  { time: 74, enemies: ["tank"], formation: "line", position: "center" },
  {
    time: 80,
    enemies: ["drone", "drone", "drone", "drone", "drone"],
    formation: "random",
    position: "wide",
  },
  { time: 86, enemies: ["fighter", "fighter", "fighter"], formation: "v", position: "left" },
  {
    time: 92,
    enemies: ["tank", "drone", "drone", "drone", "drone"],
    formation: "line",
    position: "right",
  },
  {
    time: 98,
    enemies: ["fighter", "fighter", "drone", "drone", "drone", "drone"],
    formation: "surround",
    position: "wide",
  },
  { time: 104, enemies: ["tank", "fighter", "fighter"], formation: "line", position: "center" },
  {
    time: 110,
    enemies: ["drone", "drone", "drone", "drone", "drone", "drone", "drone"],
    formation: "random",
    position: "wide",
  },

  // Peak intensity — relentless waves every ~4s
  {
    time: 115,
    enemies: ["fighter", "drone", "drone", "fighter"],
    formation: "diamond",
    position: "wide",
  },
  { time: 119, enemies: ["tank", "drone", "drone"], formation: "line", position: "left" },
  {
    time: 123,
    enemies: ["fighter", "fighter", "fighter", "fighter"],
    formation: "v",
    position: "center",
  },
  {
    time: 127,
    enemies: ["tank", "fighter", "drone", "drone", "drone"],
    formation: "surround",
    position: "wide",
  },
  {
    time: 131,
    enemies: ["drone", "drone", "drone", "drone", "drone", "drone"],
    formation: "random",
    position: "wide",
  },
  { time: 135, enemies: ["tank", "tank"], formation: "line", position: "wide" },

  // === BREATHER (140–148s) — calm before the boss ===
  { time: 140, enemies: ["drone", "drone", "drone"], formation: "line", position: "center" },
  { time: 148, enemies: ["fighter"], formation: "line", position: "center" },
  // Boss activates automatically once this wave clears (see Boss.tsx)
];
