/**
 * Reusable, entity-agnostic client-side search helpers.
 *
 * These mirror the server-side matching semantics (case-insensitive
 * substring, multi-word AND) so any client-filtered list behaves exactly
 * like a server search. Long-running lists should still be searched through
 * the API; these helpers are for small in-memory collections.
 */

/** Trims and collapses runs of whitespace into a single space. */
export function normalizeSearchQuery(raw: string): string {
  return raw.replace(/\s+/g, ' ').trim()
}

/** Splits a query into individual search terms. */
export function getSearchTerms(query: string): string[] {
  return normalizeSearchQuery(query).split(' ').filter(Boolean)
}

/**
 * True when every term of the query appears (case-insensitively, as a
 * substring) in at least one of the given text values. Mirrors the
 * server-side multi-word AND behaviour.
 */
export function matchesQuery(texts: readonly (string | null | undefined)[], query: string): boolean {
  const terms = getSearchTerms(query)
  if (terms.length === 0) return false
  const haystacks = texts.filter((text): text is string => Boolean(text)).map((text) => text.toLowerCase())
  return terms.every((term) => {
    const needle = term.toLowerCase()
    return haystacks.some((haystack) => haystack.includes(needle))
  })
}

/**
 * Filters a list in place-order while keeping every matched item's original
 * position (stable). Returns a new array; the input is unchanged.
 */
export function filterSearchable<T>(
  rows: readonly T[],
  query: string,
  getSearchText: (row: T) => readonly (string | null | undefined)[],
): T[] {
  const terms = getSearchTerms(query)
  if (terms.length === 0) return [...rows]
  return rows.filter((row) => matchesQuery(getSearchText(row), terms.join(' ')))
}