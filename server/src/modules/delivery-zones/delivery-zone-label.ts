// Builds the display label for a delivery zone from its covered city names.
// A zone is identified by the cities/LGAs it covers rather than a manually
// typed name, so the label is always derived from those cities. Cities are
// sorted ascending so the label is stable and deterministic.
//
//   1 city  -> "Surulere"
//   2 cities-> "Mushin, Surulere"
//   3+      -> "Mushin, Surulere +3 more"
//
// Uniqueness: because a city belongs to at most one zone, any two zones have
// disjoint city sets and therefore never produce the same label.
export function buildZoneLabel(cityNames: string[]): string {
  const sorted = [...cityNames].sort((a, b) => a.localeCompare(b))
  if (sorted.length <= 2) return sorted.join(', ')
  return `${sorted.slice(0, 2).join(', ')} +${sorted.length - 2} more`
}
