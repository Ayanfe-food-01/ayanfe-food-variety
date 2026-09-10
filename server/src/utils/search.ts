/**
 * Reusable, entity-agnostic search helpers.
 *
 * Matching is delegated to the database (case-insensitive substring) while
 * relevance ranking is applied to the already matched candidate rows so it can
 * be reused across any entity with a different set of searchable fields.
 *
 * - buildSearchWhere   -> Prisma WHERE clause (multi-word / substring / case-insensitive)
 * - normalizeSearchQuery -> trims, collapses whitespace, enforces max length
 * - splitSearchTerms   -> turns a normalized query into words
 * - rankSearchResults  -> ranks candidate rows so exact / starts-with matches win
 */

export interface SearchFieldConfig {
  /**
   * Prisma dot-path into the record, e.g. 'name', 'category.name',
   * 'deliveryZoneCities.city.name' or 'order.customerName'.
   */
  path: string
  /**
   * Set when the first path segment is a to-many relation that must be
   * wrapped in a `some` predicate (e.g. deliveryZoneCities, deliveryZoneAreas).
   */
  toMany?: boolean
  /**
   * Whether matches in this field should receive the primary (name/title)
   * ranking bonuses: exact match, starts-with and strongest contains.
   */
  primary?: boolean
  /** Relative importance of the field used for ranking (default 1). */
  weight?: number
}

interface StringContainsFilter {
  contains: string
  mode: 'insensitive'
}

/**
 * Normalize a raw search input: trims, collapses runs of whitespace into a
 * single space and caps the length. Returns undefined when the input is not
 * text or contains no searchable characters (so callers can skip search).
 */
export function normalizeSearchQuery(raw: unknown, maxLength = 120): string | undefined {
  if (typeof raw !== 'string') return undefined
  const normalized = raw.replace(/\s+/g, ' ').trim()
  if (!normalized) return undefined
  return normalized.slice(0, maxLength)
}

/** Split a normalized query into individual search terms. */
export function splitSearchTerms(query: string): string[] {
  return query.split(' ').filter(Boolean)
}

function setAtPath(root: Record<string, unknown>, path: string[], value: unknown): Record<string, unknown> {
  let node = root
  for (const segment of path.slice(0, -1)) {
    if (segment === undefined) continue
    const existing = node[segment]
    const next = existing && typeof existing === 'object' && !Array.isArray(existing)
      ? existing as Record<string, unknown>
      : {}
    node[segment] = next
    node = next
  }
  const last = path[path.length - 1]
  if (last !== undefined) node[last] = value
  return root
}

const buildFieldFilter = (field: SearchFieldConfig, term: string): Record<string, unknown> => {
  const segments = field.path.split('.')
  const filter: StringContainsFilter = { contains: term, mode: 'insensitive' }
  const head = segments[0]
  if (head === undefined) return {}
  if (segments.length === 1) return { [head]: filter }
  const inner = setAtPath({}, segments.slice(1), filter)
  return field.toMany ? { [head]: { some: inner } } : { [head]: inner }
}

/**
 * Build a Prisma WHERE clause for a multi-word, case-insensitive substring
 * search across the given fields. Every query term must match at least one
 * field (so "premium flour" finds a row containing both words anywhere), and
 * any individual term may match in any field.
 *
 * Returns undefined when there is nothing to search for.
 */
export function buildSearchWhere<WhereInput>(
  query: string | undefined,
  fields: readonly SearchFieldConfig[],
): WhereInput | undefined {
  if (!query) return undefined
  const terms = splitSearchTerms(query)
  if (terms.length === 0) return undefined
  return {
    AND: terms.map((term) => ({
      OR: fields.map((field) => buildFieldFilter(field, term)),
    })),
  } as WhereInput
}

export interface SearchRankField<T> {
  /** Extracts one text value used for relevance from a row. */
  get: (row: T) => string | null | undefined
  /** Relative importance of the field (default 1). */
  weight?: number
}

export interface SearchRankConfig<T> {
  /**
   * Name/title-like fields honoured by the ranking priority:
   * exact match > starts-with > contains. Optional.
   */
  primary?: SearchRankField<T>[]
  /** Secondary fields (e.g. description, SKU, category) weighted lower. */
  secondary?: SearchRankField<T>[]
}

/**
 * Score a single candidate row against the query terms. Higher is better.
 *
 * Ranking priority (adapted to the configured entity):
 *   1. primary field equals a term (case-insensitive)  -> strongest
 *   2. primary field starts with a term
 *   3. primary field contains a term
 *   4. matches in secondary fields (weighted by field importance)
 */
export function scoreSearchRow<T>(row: T, terms: string[], config: SearchRankConfig<T>): number {
  const { primary = [], secondary = [] } = config
  let score = 0
  for (const term of terms) {
    const lowered = term.toLowerCase()
    let primaryHit = 0
    for (const field of primary) {
      const text = field.get(row)
      if (!text) continue
      const candidate = text.toLowerCase()
      // Bonuses are spaced apart by more than the maximum possible secondary
      // contribution (a row matching all secondary fields adds at most 2,400),
      // so exact > starts-with > contains always holds, per the ranking priority.
      if (candidate === lowered) primaryHit = Math.max(primaryHit, 12_000)
      else if (candidate.startsWith(lowered)) primaryHit = Math.max(primaryHit, 6_000)
      else if (candidate.includes(lowered)) primaryHit = Math.max(primaryHit, 3_000)
    }
    score += primaryHit
    for (const field of secondary) {
      const text = field.get(row)
      if (text?.toLowerCase().includes(lowered)) score += 1_000 * (field.weight ?? 1)
    }
  }
  return score
}

/**
 * Rank candidate rows by relevance while preserving their original order for
 * ties (Node's Array#sort is stable). Rows that did not match any term keep
 * their relative position at the end of the list.
 */
export function rankSearchResults<T>(
  rows: readonly T[],
  query: string | undefined,
  config: SearchRankConfig<T>,
): T[] {
  if (!query) return [...rows]
  const terms = splitSearchTerms(query)
  if (terms.length === 0) return [...rows]
  return [...rows].sort((a, b) => scoreSearchRow(b, terms, config) - scoreSearchRow(a, terms, config))
}