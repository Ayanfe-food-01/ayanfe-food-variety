// Builds the display label for a delivery zone from its covered city names.
// A zone is identified by the cities/LGAs (and optionally specific areas within
// them) it covers rather than a manually typed name, so the label is always
// derived from that coverage. Entries are sorted ascending so the label is
// stable and deterministic.
//
//   1 entry           -> "Surulere"
//   2 entries         -> "Mushin, Surulere"
//   3+ entries        -> "Mushin, Surulere +3 more"
//
// Uniqueness: because a city and an area each belong to at most one zone, any
// two zones have disjoint coverage and therefore never produce the same label.
export function buildZoneLabel(entries: string[]): string {
  const sorted = [...entries].sort((a, b) => a.localeCompare(b))
  if (sorted.length <= 2) return sorted.join(', ')
  return `${sorted.slice(0, 2).join(', ')} +${sorted.length - 2} more`
}

// A zone's covered cities and areas as raw Prisma shapes. An area entry is
// shown as "Area, City" (e.g. "Guess, Agege") so it is clear at a glance which
// zones cover a whole LGA and which cover only part of one. Areas belonging to
// the same city are grouped so the LGA appears once ("Ketu, Mile 12, Kosofe").
export interface ZoneCoverage {
  deliveryZoneCities?: Array<{ city: { name: string } }>
  deliveryZoneAreas?: Array<{ area: { name: string; city: { name: string } } }>
}

// Derives the deterministic label for a zone from its full coverage (whole
// cities plus any area-specific entries).
export function zoneCoverageLabel(zone: ZoneCoverage): string {
  const cityEntries = (zone.deliveryZoneCities ?? []).map((entry) => entry.city.name)
  const areasByCity = new Map<string, string[]>()
  for (const entry of zone.deliveryZoneAreas ?? []) {
    const names = areasByCity.get(entry.area.city.name) ?? []
    names.push(entry.area.name)
    areasByCity.set(entry.area.city.name, names)
  }
  const areaEntries = [...areasByCity.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([city, names]) => `${names.sort((a, b) => a.localeCompare(b)).join(', ')}, ${city}`)
  return buildZoneLabel([...cityEntries, ...areaEntries])
}
