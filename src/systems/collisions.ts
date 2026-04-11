export function checkCollision(
  aPos: [number, number, number],
  aRadius: number,
  bPos: [number, number, number],
  bRadius: number,
): boolean {
  const dx = aPos[0] - bPos[0];
  const dy = aPos[1] - bPos[1];
  const dz = aPos[2] - bPos[2];
  const distSq = dx * dx + dy * dy + dz * dz;
  const radSum = aRadius + bRadius;
  return distSq < radSum * radSum;
}
