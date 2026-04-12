export interface UpgradeDef {
  id: string;
  name: string;
  description: string;
}

export const UPGRADES: UpgradeDef[] = [
  { id: "rapidFire", name: "RAPID FIRE", description: "Fire rate +40%" },
  { id: "wideShot", name: "WIDE SHOT", description: "+2 angled side lasers" },
  { id: "shield", name: "SHIELD", description: "+1 max HP, heal 1 HP" },
  { id: "homingShots", name: "HOMING", description: "Shots curve toward enemies" },
  { id: "quickCharge", name: "QUICK CHARGE", description: "Charge shot 2x faster" },
  { id: "magnet", name: "MAGNET", description: "Pickup attract range 3x" },
  { id: "overdrive", name: "OVERDRIVE", description: "Score +25%" },
];
