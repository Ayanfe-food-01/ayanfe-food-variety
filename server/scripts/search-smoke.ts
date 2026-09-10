import {
  buildSearchWhere,
  normalizeSearchQuery,
  rankSearchResults,
  scoreSearchRow,
  splitSearchTerms,
} from '../src/utils/search.js'

let failures = 0

const assertEqual = (actual: unknown, expected: unknown, label: string) => {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    failures += 1
    console.error(`FAIL ${label}\n  expected: ${JSON.stringify(expected)}\n  actual:   ${JSON.stringify(actual)}`)
  }
}

const assertTrue = (value: boolean, label: string) => {
  if (!value) {
    failures += 1
    console.error(`FAIL ${label}`)
  }
}

async function main() {
  console.info('Reusable search utility smoke test')

  // --- normalizeSearchQuery -------------------------------------------------
  assertEqual(normalizeSearchQuery(undefined, 120), undefined, 'normalize: undefined -> undefined')
  assertEqual(normalizeSearchQuery(42, 120), undefined, 'normalize: non-string -> undefined')
  assertEqual(normalizeSearchQuery('   ', 120), undefined, 'normalize: whitespace only -> undefined')
  assertEqual(normalizeSearchQuery('  Premium   Flour  ', 120), 'Premium Flour', 'normalize: trims + collapses whitespace')
  assertEqual(normalizeSearchQuery('Organic PLanTain', 120), 'Organic PLanTain', 'normalize: preserves mixed case')
  assertEqual(normalizeSearchQuery('x'.repeat(200), 120), 'x'.repeat(120), 'normalize: caps length')

  // --- splitSearchTerms -----------------------------------------------------
  assertEqual(splitSearchTerms('premium flour'), ['premium', 'flour'], 'split: basic')
  assertEqual(splitSearchTerms('  a   b  '), ['a', 'b'], 'split: collapses spaces')

  // --- buildSearchWhere -----------------------------------------------------
  assertEqual(buildSearchWhere(undefined, [{ path: 'name' }]), undefined, 'where: no query -> undefined')
  assertEqual(buildSearchWhere('', [{ path: 'name' }]), undefined, 'where: empty query -> undefined')

  const flat = buildSearchWhere('premium flour', [{ path: 'name', primary: true }]) as {
    AND: Array<{ OR: Array<Record<string, unknown>> }>
  }
  assertTrue(flat !== undefined, 'where: multi-term query builds')
  assertEqual(flat?.AND.length, 2, 'where: one AND clause per term')
  assertEqual(
    flat?.AND[0]?.OR[0],
    { name: { contains: 'premium', mode: 'insensitive' } },
    'where: term maps to contains + insensitive on scalar field',
  )

  const nested = buildSearchWhere('flour', [
    { path: 'category.name', weight: 1 },
    { path: 'category.slug', weight: 0.8 },
  ]) as { AND: Array<{ OR: Array<Record<string, unknown>> }> }
  assertEqual(
    nested?.AND[0]?.OR,
    [
      { category: { name: { contains: 'flour', mode: 'insensitive' } } },
      { category: { slug: { contains: 'flour', mode: 'insensitive' } } },
    ],
    'where: nested relation paths merge into one object',
  )

  const toMany = buildSearchWhere('lagos', [
    { path: 'deliveryZoneCities.city.name', toMany: true },
    { path: 'deliveryZoneAreas.area.name', toMany: true },
  ]) as { AND: Array<{ OR: Array<Record<string, unknown>> }> }
  assertEqual(
    toMany?.AND[0]?.OR[0],
    { deliveryZoneCities: { some: { city: { name: { contains: 'lagos', mode: 'insensitive' } } } } },
    'where: to-many relation wrapped in some',
  )

  // --- ranking --------------------------------------------------------------
  interface Product { name: string; description: string; categoryName: string }
  const rows: Product[] = [
    { name: 'Organic Premium Plantain Flour', description: 'Stone-ground plantain flour.', categoryName: 'Flours' },
    { name: 'Premium Plantain Chips', description: 'Crispy snacks.', categoryName: 'Snacks' },
    { name: 'Plantain Flour', description: 'Plain plantain flour.', categoryName: 'Flours' },
    { name: 'Baking Flour', description: 'Premium organic all-purpose flour.', categoryName: 'Baking' },
    { name: 'Yam Chips', description: 'Fried yam.', categoryName: 'Snacks' },
  ]
  const config = {
    primary: [{ get: (row: Product) => row.name }],
    secondary: [
      { get: (row: Product) => row.categoryName, weight: 1 },
      { get: (row: Product) => row.description, weight: 0.4 },
    ],
  }
  const term = 'plantain'
  const scores = rows.map((row) => scoreSearchRow(row, [term], config))
  assertTrue(scores[2] > scores[0] && scores[0] > scores[1], 'rank: starts-with > contains > secondary-miss')
  assertTrue(scores[4] === 0, 'rank: unrelated row scores 0')

  const secondaryOnly = rows.map((row) => scoreSearchRow(row, ['stone-ground'], config))
  assertTrue(secondaryOnly[0] === 1000 * 0.4 && secondaryOnly.slice(1).every((value) => value === 0),
    'rank: secondary-only (description) match scores by weight')

  const ranked = rankSearchResults(rows, 'plantain flour', config)
  assertEqual(ranked.map((row) => row.name), [
    'Plantain Flour',
    'Organic Premium Plantain Flour',
    'Baking Flour',
    'Premium Plantain Chips',
    'Yam Chips',
  ], 'rank: both terms in primary outrank single term; secondary row above unrelated')

  const exact = rankSearchResults(rows, 'Plantain Flour', config)
  assertEqual(exact[0]?.name, 'Plantain Flour', 'rank: exact primary match wins')

  const startsWith = rankSearchResults(rows, 'premium', config)
  assertEqual(startsWith.slice(0, 2)?.map((row) => row.name), ['Premium Plantain Chips', 'Organic Premium Plantain Flour'],
    'rank: primary starts-with beats primary contains beats secondary contains')

  if (failures === 0) {
    console.info('Search utility smoke test passed.')
  } else {
    console.error(`Search utility smoke test failed: ${failures} assertion(s).`)
    process.exit(1)
  }
}

main().catch((error: unknown) => {
  console.error(error)
  process.exit(1)
})