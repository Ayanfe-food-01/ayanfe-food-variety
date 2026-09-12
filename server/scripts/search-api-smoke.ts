import { prisma, closeDatabase } from '../src/config/prisma.js'
import { validatePublicProductsQuery } from '../src/modules/products/product.validator.js'
import { getProducts } from '../src/modules/products/product.list.service.js'
import { validateAdminProductsQuery } from '../src/modules/products/product.validator.js'
import { listAdminProducts } from '../src/modules/products/admin-product.service.js'
import { validateAdminCategoriesQuery } from '../src/modules/categories/category.validator.js'
import { listAdminCategories } from '../src/modules/categories/category.service.js'
import { validateAdminDeliveryZonesQuery } from '../src/modules/delivery-zones/delivery-zone.validator.zone.js'
import { listAdminDeliveryZones } from '../src/modules/delivery-zones/delivery-zone.list.service.js'

let failures = 0

const expect = (condition: boolean, label: string) => {
  if (!condition) {
    failures += 1
    console.error(`FAIL ${label}`)
  }
}

const expectContains = (names: string[], required: readonly string[], label: string) => {
  const missing = required.filter((name) => !names.includes(name))
  if (missing.length > 0) {
    failures += 1
    console.error(`FAIL ${label}\n  missing: ${JSON.stringify(missing)}\n  returned ${names.length} result(s)`)
  }
}

const expectAbsent = (names: string[], forbidden: readonly string[], label: string) => {
  const present = forbidden.filter((name) => names.includes(name))
  if (present.length > 0) {
    failures += 1
    console.error(`FAIL ${label}\n  should not match: ${JSON.stringify(present)}`)
  }
}

async function main() {
  console.info('Search API smoke test')
  const slug = `search-${Date.now().toString(36)}`
  const cleanup: Array<() => Promise<unknown>> = []
  let floursId = ''
  let snacksId = ''

  try {
    // --- fixtures -----------------------------------------------------------
    const flours = await prisma.category.create({ data: { name: `Flours ${slug}`, slug: `${slug}-flours`, imageUrl: '' } })
    const snacks = await prisma.category.create({ data: { name: `Snacks ${slug}`, slug: `${slug}-snacks`, imageUrl: '' } })
    floursId = flours.id
    snacksId = snacks.id
    cleanup.push(() => prisma.category.deleteMany({ where: { id: { in: [flours.id, snacks.id] } } }))

    const makeProduct = (name: string, categoryId: string, description: string) => prisma.product.create({
      data: {
        categoryId,
        name,
        slug: `${slug}-${name.toLowerCase().replace(/\s+/g, '-')}`,
        description,
        price: '1500.00',
        unit: 'kg',
        image: '',
        stockQuantity: 100,
      },
    })

    const plantainFlour = await makeProduct('Organic Premium Plantain Flour', flours.id, 'Stone-ground plantain flour.')
    const plantainChips = await makeProduct('Premium Plantain Chips', snacks.id, 'Crispy plantain snacks.')
    const plainPlantainFlour = await makeProduct('Plantain Flour', flours.id, 'Plain plantain flour.')
    const flourPower = await makeProduct('Flour Power Snack', snacks.id, 'Energy snack from flour.')
    const yamChips = await makeProduct('Yam Chips', snacks.id, 'Fried yam slices.')
    const productIds = [plantainFlour.id, plantainChips.id, plainPlantainFlour.id, flourPower.id, yamChips.id]
    cleanup.push(() => prisma.product.deleteMany({ where: { id: { in: productIds } } }))

    // Two separate states/LGAs so the "one bin per LGA" zone-coverage trigger is satisfied.
    const stateLagos = await prisma.state.create({ data: { name: `Lagos ${slug}` } })
    cleanup.push(() => prisma.state.deleteMany({ where: { id: stateLagos.id } }))
    const surulere = await prisma.city.create({ data: { stateId: stateLagos.id, name: `Surulere ${slug}` } })
    cleanup.push(() => prisma.city.deleteMany({ where: { id: surulere.id } }))
    const stateOgun = await prisma.state.create({ data: { name: `Ogun ${slug}` } })
    cleanup.push(() => prisma.state.deleteMany({ where: { id: stateOgun.id } }))
    const abeokuta = await prisma.city.create({ data: { stateId: stateOgun.id, name: `Abeokuta ${slug}` } })
    cleanup.push(() => prisma.city.deleteMany({ where: { id: abeokuta.id } }))
    const lawanson = await prisma.area.create({ data: { cityId: abeokuta.id, name: `Lawanson ${slug}` } })
    cleanup.push(() => prisma.area.deleteMany({ where: { id: lawanson.id } }))
    const zone = await prisma.deliveryZone.create({ data: { fee: '1500.00', sortOrder: 0 } })
    cleanup.push(() => prisma.deliveryZone.deleteMany({ where: { id: zone.id } }))
    await prisma.deliveryZoneCity.create({ data: { deliveryZoneId: zone.id, cityId: surulere.id } })
    await prisma.deliveryZoneArea.create({ data: { deliveryZoneId: zone.id, areaId: lawanson.id } })

    // --- public product search ----------------------------------------------
    const sellPlantainFlour = 'Organic Premium Plantain Flour'
    const sellPlantainChips = 'Premium Plantain Chips'
    const sellPlainPlantainFlour = 'Plantain Flour'
    const sellFlourPower = 'Flour Power Snack'
    const sellYamChips = 'Yam Chips'
    const allFixtures = [sellPlantainFlour, sellPlantainChips, sellPlainPlantainFlour, sellFlourPower, sellYamChips]

    const publicSearch = async (search: string, sort = 'relevance', category?: string) => {
      const query = validatePublicProductsQuery({ search, sort, category, page: '1', limit: '50' })
      const page = await getProducts(query)
      return { names: page.products.map((product) => product.name), total: page.pagination.total }
    }

    const plantain = await publicSearch('plantain')
    expectPlantain(plantain, 'search: lowercase word finds products anywhere in the name')

    const upper = await publicSearch('PLANTAIN')
    expectPlantain(upper, 'search: uppercase is case-insensitive')

    const mixed = await publicSearch('pLaNtAiN')
    expectPlantain(mixed, 'search: mixed case matches')

    const midWord = await publicSearch('anta')
    expectContains(midWord.names, [sellPlantainFlour, sellPlantainChips, sellPlainPlantainFlour], 'search: substring in the middle of a word matches')

    const notAtStart = await publicSearch('ganic')
    expectContains(notAtStart.names, [sellPlantainFlour], 'search: term that begins mid-word still matches (ganic in Organic)')
    expectAbsent(notAtStart.names, [sellPlantainChips], 'search: mid-word term does not over-match')

    const multiWord = await publicSearch('premium flour')
    expectContains(multiWord.names, [sellPlantainFlour], 'search: two non-contiguous terms match a row containing both')
    expectAbsent(multiWord.names, [sellPlantainChips, sellPlainPlantainFlour], 'search: multi-word AND requires every term to be present')

    const multiWordSpread = await publicSearch('plantain flour')
    expectContains(multiWordSpread.names, [sellPlantainFlour, sellPlainPlantainFlour], 'search: multi-word matches both words anywhere in content')
    expectAbsent(multiWordSpread.names, [sellPlantainChips, sellYamChips], 'search: multi-word rules out missing terms')

    const spaced = await publicSearch('  plantain    flour  ')
    expectContains(spaced.names, [sellPlantainFlour, sellPlainPlantainFlour], 'search: leading/trailing/internal whitespace is normalized')

    const combinedCategory = await publicSearch('plantain', 'relevance', `${snacks.slug}`)
    expectContains(combinedCategory.names, [sellPlantainChips], 'search: term + category filter still narrows correctly')
    expectAbsent(combinedCategory.names, [sellPlantainFlour, sellPlainPlantainFlour], 'search: category filter excludes other categories')

    const noResults = await publicSearch('zebra')
    expect(noResults.total === 0 && noResults.names.length === 0, 'search: no matches returns empty results')

    const newest = await publicSearch('plantain', 'newest')
    expectContains(newest.names, [sellPlantainFlour, sellPlantainChips, sellPlainPlantainFlour], 'search: works under newest sort too')

    const flourRanking = await publicSearch('flour', 'relevance')
    expect(flourRanking.names[0] === sellFlourPower, `rank: name starts-with query ranks first (got ${flourRanking.names[0]})`)
    expectContains(flourRanking.names, [sellPlantainFlour, sellPlainPlantainFlour, sellFlourPower], 'rank: all occurrences of "flour" are returned')

    // --- admin product search ------------------------------------------------
    const adminQuery = validateAdminProductsQuery({ search: 'premium flour', page: '1', pageSize: '10' })
    const adminProducts = await listAdminProducts(adminQuery)
    expectContains(adminProducts.products.map((product) => product.name), [sellPlantainFlour], 'admin: multi-word search across name/description/category')

    // --- admin category search ----------------------------------------------
    const categoryQuery = validateAdminCategoriesQuery({ search: 'snac', page: '1', pageSize: '10' })
    const categories = await listAdminCategories(categoryQuery)
    expect(categories.categories.some((category) => category.id === snacks.id), 'category: partial-word search finds Snacks')

    // --- fixture search terms are fully searchable by unique partial slugs ----
    const fixtureSearch = await publicSearch(slug)
    expect(fixtureSearch.total >= allFixtures.length, 'search: unique fixture prefix matches its products')

    // --- admin delivery zone search (city + area, incl. multi-word) ----------
    const zoneSearch = async (search: string) => {
      const query = validateAdminDeliveryZonesQuery({ search, page: '1', pageSize: '10' })
      const result = await listAdminDeliveryZones(query)
      return result.zones.some((candidate) => candidate.id === zone.id)
    }
    const surulereLabel = surulere.name
    const lawansonLabel = lawanson.name
    expect(await zoneSearch('surulere'), 'zone: matches by covered city name')
    expect(await zoneSearch('SURULERE'), 'zone: city search is case-insensitive')
    expect(await zoneSearch('lawanson'), 'zone: matches by covered area name')
    expect(await zoneSearch(`${surulereLabel.split(' ')[0]} ${lawansonLabel.split(' ')[0]}`),
      'zone: multi-word search finds zone spanning city + area terms')
    expect(!await zoneSearch('no-such-place'), 'zone: unrelated term returns no match')

    if (failures === 0) {
      console.info('Search API smoke test passed.')
    } else {
      console.error(`Search API smoke test failed: ${failures} assertion(s).`)
      process.exitCode = 1
    }
  } finally {
    for (const cleanupStep of cleanup.reverse()) {
      await cleanupStep().catch(() => undefined)
    }
    await closeDatabase()
  }
}

const expectPlantain = (result: { names: string[]; total: number }, label: string) => {
  expect(result.total >= 3, `${label}: total >= 3`)
  expectContains(result.names, ['Organic Premium Plantain Flour', 'Premium Plantain Chips', 'Plantain Flour'], label)
  expectAbsent(result.names, ['Yam Chips', 'Flour Power Snack'], label)
}

main().catch((error: unknown) => {
  console.error(error)
  process.exit(1)
})