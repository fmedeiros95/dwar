export function requiredNobleCoins(
  additionalVillages: number,
  existingNobles: number,
  pendingNobles: number,
): number {
  const used = additionalVillages + existingNobles + pendingNobles;
  return ((used + 1) * (used + 2)) / 2;
}
