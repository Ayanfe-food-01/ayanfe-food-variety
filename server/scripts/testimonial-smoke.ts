import { prisma, closeDatabase } from '../src/lib/prisma.js'
import { HttpError } from '../src/utils/http.js'
import {
  createTestimonial,
  deleteTestimonial,
  getAdminTestimonial,
  listAdminTestimonials,
  updateTestimonial,
  updateTestimonialFeatured,
  updateTestimonialStatus,
} from '../src/modules/testimonials/testimonial.service.js'
import {
  validateAdminTestimonialsQuery,
  validateTestimonialFeaturedInput,
  validateTestimonialId,
  validateTestimonialInput,
  validateTestimonialStatusInput,
} from '../src/modules/testimonials/testimonial.validator.js'

const slug = `testimonial-smoke-${Date.now().toString(36)}`

const expectThrows = async (operation: () => Promise<unknown>, message: string): Promise<unknown> => {
  try {
    await operation()
  } catch {
    return undefined
  }
  throw new Error(message)
}

async function main() {
  const beforeCount = await prisma.testimonial.count()
  const createdIds: string[] = []

  try {
    // --- Validators ---
    const input = validateTestimonialInput({
      authorName: '  Adaeze O.  ',
      content: '  Their jollof tastes like home.  ',
      rating: '5',
      isActive: 'true',
      isFeatured: 'false',
      displayOrder: '2',
    })
    if (input.authorName !== 'Adaeze O.' || input.content !== 'Their jollof tastes like home.') {
      throw new Error('Validator did not trim author name / content.')
    }
    if (input.rating !== 5 || input.isActive !== true || input.isFeatured !== false || input.displayOrder !== 2) {
      throw new Error('Validator did not coerce rating/booleans/display order.')
    }
    const bare = validateTestimonialInput({ authorName: 'Amina', content: 'Great shop.', rating: '', displayOrder: 0 })
    if (bare.rating !== null) throw new Error('Empty rating should map to null.')
    await expectThrows(() => Promise.resolve(validateTestimonialInput({ authorName: '', content: 'x', rating: '' })), 'Empty author name was accepted.')
    await expectThrows(() => Promise.resolve(validateTestimonialInput({ authorName: 'Amina', content: '   ' })), 'Blank content was accepted.')
    await expectThrows(() => Promise.resolve(validateTestimonialInput({ authorName: 'Amina', content: 'x', rating: 0 })), 'Rating 0 was accepted.')
    await expectThrows(() => Promise.resolve(validateTestimonialInput({ authorName: 'Amina', content: 'x', rating: 6 })), 'Rating 6 was accepted.')
    await expectThrows(() => Promise.resolve(validateTestimonialInput({ authorName: 'Amina', content: 'x', rating: 3.5 })), 'Fractional rating was accepted.')
    await expectThrows(() => Promise.resolve(validateTestimonialInput({ authorName: 'Amina', content: 'x', displayOrder: -1 })), 'Negative display order was accepted.')
    await expectThrows(() => Promise.resolve(validateTestimonialId('not-a-uuid')), 'Invalid testimonial ID was accepted.')
    await expectThrows(() => Promise.resolve(validateTestimonialStatusInput({ isActive: 'maybe' })), 'Invalid status flag was accepted.')
    await expectThrows(() => Promise.resolve(validateTestimonialFeaturedInput({ isFeatured: 'yes' })), 'Invalid featured flag was accepted.')

    const page = validateAdminTestimonialsQuery({ page: '1', pageSize: '10', search: '  jollof  ', status: 'active', featured: 'featured' })
    if (page.page !== 1 || page.pageSize !== 10 || page.search !== 'jollof' || page.status !== 'active' || page.featured !== 'featured') {
      throw new Error('Query validation did not normalize filters.')
    }
    const silent = validateAdminTestimonialsQuery({ page: '1' })
    if (silent.page !== 1 || silent.search !== undefined || silent.status !== undefined || silent.featured !== undefined) {
      throw new Error('Query validation defaulted incorrectly.')
    }
    await expectThrows(() => Promise.resolve(validateAdminTestimonialsQuery({ page: '0' })), 'Page 0 was accepted.')
    await expectThrows(() => Promise.resolve(validateAdminTestimonialsQuery({ pageSize: '200' })), 'Page size over 50 was accepted.')
    await expectThrows(() => Promise.resolve(validateAdminTestimonialsQuery({ featured: 'sometimes' })), 'Invalid featured filter was accepted.')

    // --- Create ---
    const featured = await createTestimonial({
      authorName: 'Adaeze O.',
      content: 'Their jollof rice tastes just like home.',
      rating: 5,
      isActive: true,
      isFeatured: true,
      displayOrder: 1,
    })
    createdIds.push(featured.id)
    if (featured.rating !== 5 || featured.isFeatured !== true || featured.avatarUrl !== null) {
      throw new Error('Created featured testimonial did not persist as expected.')
    }

    const unrated = await createTestimonial({
      authorName: 'Chidi',
      content: 'Quick delivery and lovely packaging.',
      rating: null,
      isActive: true,
      isFeatured: false,
      displayOrder: 2,
    })
    createdIds.push(unrated.id)
    if (unrated.rating !== null || unrated.isFeatured !== false) throw new Error('Unrated testimonial persisted incorrectly.')

    const inactive = await createTestimonial({
      authorName: 'Bola',
      content: 'Delicious snacks, will buy again.',
      rating: 4,
      isActive: false,
      isFeatured: false,
      displayOrder: 0,
    })
    createdIds.push(inactive.id)
    if (inactive.isActive !== false) throw new Error('Inactive testimonial persisted as active.')

    // --- Get by id + 404 on missing ---
    const fetched = await getAdminTestimonial(featured.id)
    if (fetched.authorName !== 'Adaeze O.') throw new Error('getAdminTestimonial returned the wrong row.')
    const missing = '00000000-0000-4000-8000-000000000000'
    if (missing === featured.id) throw new Error('Test fixture id collision.')
    await expectThrows(() => getAdminTestimonial(missing), 'Missing testimonial did not 404.')

    // --- List: search, filters, pagination, ordering (displayOrder asc, then createdAt desc) ---
    const searchPage = await listAdminTestimonials({ page: 1, pageSize: 10, search: 'jollof' })
    if (searchPage.pagination.total < 1 || !searchPage.testimonials.some((item) => item.id === featured.id)) {
      throw new Error('Search by content did not surface the fixture.')
    }
    const activePage = await listAdminTestimonials({ page: 1, pageSize: 10, status: 'active' })
    const activeIds = activePage.testimonials.map((item) => item.id)
    if (!activeIds.includes(featured.id) || !activeIds.includes(unrated.id) || activeIds.includes(inactive.id)) {
      throw new Error('Active filter returned the wrong rows.')
    }
    const inactivePage = await listAdminTestimonials({ page: 1, pageSize: 10, status: 'inactive' })
    if (inactivePage.pagination.total < 1 || !inactivePage.testimonials.some((item) => item.id === inactive.id)) {
      throw new Error('Inactive filter did not surface the fixture.')
    }
    const featuredPage = await listAdminTestimonials({ page: 1, pageSize: 10, featured: 'featured' })
    if (featuredPage.pagination.total < 1 || !featuredPage.testimonials.some((item) => item.id === featured.id)) {
      throw new Error('Featured filter did not surface the fixture.')
    }
    const notFeaturedPage = await listAdminTestimonials({ page: 1, pageSize: 10, featured: 'not-featured' })
    if (notFeaturedPage.pagination.total < 2 || !notFeaturedPage.testimonials.some((item) => item.id === unrated.id)) {
      throw new Error('Not-featured filter did not surface the fixture.')
    }

    const ordered = await listAdminTestimonials({ page: 1, pageSize: 100 })
    const fixturePositions = [
      ordered.testimonials.findIndex((item) => item.id === inactive.id),
      ordered.testimonials.findIndex((item) => item.id === featured.id),
      ordered.testimonials.findIndex((item) => item.id === unrated.id),
    ]
    if (fixturePositions.some((position) => position < 0)) throw new Error('Ordering fixtures were not listed.')
    if (!(fixturePositions[0] < fixturePositions[1] && fixturePositions[1] < fixturePositions[2])) {
      throw new Error(`Display order is wrong: ${ordered.testimonials.map((item) => item.id).join(',')}`)
    }

    const pageOne = await listAdminTestimonials({ page: 1, pageSize: 2 })
    const pageTwo = await listAdminTestimonials({ page: 2, pageSize: 2 })
    if (pageTwo.pagination.total !== pageOne.pagination.total) throw new Error('Pagination totals disagree.')
    if (pageOne.testimonials.some((item) => pageTwo.testimonials.some((other) => other.id === item.id))) {
      throw new Error('Pagination returned overlapping rows.')
    }

    // --- Update text fields + featured/status toggles ---
    const updated = await updateTestimonial(unrated.id, {
      authorName: 'Chidi O.',
      content: 'Quick delivery, lovely packaging, great taste.',
      rating: 5,
      isActive: true,
      isFeatured: true,
      displayOrder: 2,
    })
    if (updated.authorName !== 'Chidi O.' || updated.rating !== 5 || updated.isFeatured !== true) {
      throw new Error('updateTestimonial did not apply changes.')
    }

    const featuredOff = await updateTestimonialFeatured(unrated.id, false)
    if (featuredOff.isFeatured !== false) throw new Error('Featured toggle did not turn off.')
    const statusOff = await updateTestimonialStatus(unrated.id, false)
    if (statusOff.isActive !== false) throw new Error('Status toggle did not deactivate.')
    const statusOn = await updateTestimonialStatus(unrated.id, true)
    if (statusOn.isActive !== true) throw new Error('Status toggle did not reactivate.')

    // --- Avatar: set, then remove via the removal flag ---
    const baseFields = { authorName: unrated.authorName, content: unrated.content, rating: unrated.rating, displayOrder: unrated.displayOrder, isActive: true, isFeatured: false }
    const withAvatar = await updateTestimonial(unrated.id, baseFields, { url: 'https://example.test/avatar.png', publicId: 'smoke-avatar' })
    if (withAvatar.avatarUrl !== 'https://example.test/avatar.png' || withAvatar.avatarPublicId !== 'smoke-avatar') {
      throw new Error('Avatar replacement did not persist.')
    }
    const cleared = await updateTestimonial(unrated.id, baseFields, undefined, true)
    if (cleared.avatarUrl !== null || cleared.avatarPublicId !== null) {
      throw new Error('Avatar removal flag did not clear the image.')
    }

    // --- Delete + post-delete 404 ---
    const deletedPublicId = await deleteTestimonial(unrated.id)
    if (deletedPublicId !== null) throw new Error('Avatar-less testimonial should delete with no image id.')
    createdIds.splice(createdIds.indexOf(unrated.id), 1)
    await expectThrows(() => getAdminTestimonial(unrated.id), 'Deleted testimonial is still readable.')

    // --- Rows left behind are exactly what we created and still exist ---
    const afterCount = await prisma.testimonial.count()
    if (afterCount !== beforeCount + 2) throw new Error('Fixture count mismatch after cleanup.')

    console.log('Testimonial service smoke test passed.')
  } finally {
    await prisma.testimonial.deleteMany({ where: { id: { in: createdIds } } })
  }
}

main()
  .catch((error: unknown) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    await closeDatabase()
  })