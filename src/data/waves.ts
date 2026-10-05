import type { Wave } from "../types";

export const LEVEL_WAVES: Wave[] = [
  // === INTRO (0–15s) — no enemies: ship flies into the void ===

  // === WARM-UP (15–41s) — drones only ===
  { time: 15, enemies: ["drone", "drone", "drone"], formation: "v", position: "center" },
  { time: 21, enemies: ["drone", "drone", "drone", "drone"], formation: "line", position: "left" },
  { time: 28, enemies: ["drone", "drone", "drone", "drone"], formation: "line", position: "right" },
  {
    time: 35,
    enemies: ["drone", "drone", "drone", "drone", "drone"],
    formation: "v",
    position: "center",
  },
  {
    time: 41,
    enemies: ["drone", "drone", "drone", "drone", "drone", "drone"],
    formation: "diamond",
    position: "wide",
  },

  // === ESCALATION (45–81s) — fighters join ===
  {
    time: 45,
    enemies: ["fighter", "drone", "drone", "fighter"],
    formation: "line",
    position: "wide",
  },
  {
    time: 51,
    enemies: ["drone", "drone", "drone", "drone", "drone"],
    formation: "v",
    position: "center",
  },
  { time: 57, enemies: ["fighter", "fighter"], formation: "line", position: "center" },
  {
    time: 63,
    enemies: ["drone", "drone", "drone", "drone", "drone", "drone", "drone"],
    formation: "random",
    position: "wide",
  },
  {
    time: 69,
    enemies: ["fighter", "drone", "drone", "drone", "fighter"],
    formation: "v",
    position: "left",
  },
  { time: 75, enemies: ["fighter", "fighter", "fighter"], formation: "line", position: "right" },
  {
    time: 81,
    enemies: ["drone", "drone", "fighter", "drone", "drone"],
    formation: "diamond",
    position: "center",
  },

  // === INTENSITY (90–126s) — tanks appear, dense mixed waves ===
  { time: 90, enemies: ["tank"], formation: "line", position: "center" },
  {
    time: 96,
    enemies: ["drone", "drone", "drone", "drone", "drone"],
    formation: "random",
    position: "wide",
  },
  { time: 102, enemies: ["fighter", "fighter", "fighter"], formation: "v", position: "left" },
  {
    time: 108,
    enemies: ["tank", "drone", "drone", "drone", "drone"],
    formation: "line",
    position: "right",
  },
  {
    time: 114,
    enemies: ["fighter", "fighter", "drone", "drone", "drone", "drone"],
    formation: "surround",
    position: "wide",
  },
  { time: 120, enemies: ["tank", "fighter", "fighter"], formation: "line", position: "center" },
  {
    time: 126,
    enemies: ["drone", "drone", "drone", "drone", "drone", "drone", "drone"],
    formation: "random",
    position: "wide",
  },

  // === PEAK (130–150s) — relentless waves every ~4s ===
  {
    time: 130,
    enemies: ["fighter", "drone", "drone", "fighter"],
    formation: "diamond",
    position: "wide",
  },
  { time: 134, enemies: ["tank", "drone", "drone"], formation: "line", position: "left" },
  {
    time: 138,
    enemies: ["fighter", "fighter", "fighter", "fighter"],
    formation: "v",
    position: "center",
  },
  {
    time: 142,
    enemies: ["tank", "fighter", "drone", "drone", "drone"],
    formation: "surround",
    position: "wide",
  },
  {
    time: 146,
    enemies: ["drone", "drone", "drone", "drone", "drone", "drone"],
    formation: "random",
    position: "wide",
  },
  { time: 150, enemies: ["tank", "tank"], formation: "line", position: "wide" },

  // === BREATHER (155–162s) — calm before the boss ===
  { time: 155, enemies: ["drone", "drone", "drone"], formation: "line", position: "center" },
  { time: 162, enemies: ["fighter"], formation: "line", position: "center" },
  // Boss activates automatically once this wave clears (see Boss.tsx)
];
