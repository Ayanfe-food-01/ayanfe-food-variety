import { ReviewStatus } from '@prisma/client'
import { prisma } from '../../lib/prisma.js'
import { HttpError } from '../../utils/http.js'
import type {
  CustomerStory,
  HomepageFeaturedMetrics,
  PublicCustomerStories,
} from './customer-stories.types.js'

export const MAX_FEATURED_HOMEPAGE_ITEMS = 30

export async function getHomepageFeaturedMetrics(): Promise<HomepageFeaturedMetrics> {
  const [testimonials, reviews] = await Promise.all([
    prisma.testimonial.count({ where: { isActive: true, isFeatured: true } }),
    prisma.review.count({ where: { isActive: true, isFeatured: true, status: ReviewStatus.APPROVED } }),
  ])
  const used = testimonials + reviews
  return { used, max: MAX_FEATURED_HOMEPAGE_ITEMS, remaining: Math.max(0, MAX_FEATURED_HOMEPAGE_ITEMS - used) }
}

export async function assertHomepageFeaturedCapacity(): Promise<void> {
  const { used } = await getHomepageFeaturedMetrics()
  if (used >= MAX_FEATURED_HOMEPAGE_ITEMS) {
    throw new HttpError(
      409,
      `The homepage is at its featured limit (${MAX_FEATURED_HOMEPAGE_ITEMS} items). Unfeature another story before adding this one.`,
    )
  }
}

export async function getPublicCustomerStories(): Promise<PublicCustomerStories> {
  const [testimonials, reviews] = await Promise.all([
    prisma.testimonial.findMany({
      where: { isActive: true, isFeatured: true },
      orderBy: [{ displayOrder: 'asc' }, { createdAt: 'desc' }],
      select: { id: true, authorName: true, content: true, rating: true, displayOrder: true, createdAt: true },
    }),
    prisma.review.findMany({
      where: { isActive: true, isFeatured: true, status: ReviewStatus.APPROVED },
      orderBy: [{ displayOrder: 'asc' }, { createdAt: 'desc' }],
      select: {
        id: true,
        rating: true,
        content: true,
        verifiedPurchase: true,
        displayOrder: true,
        createdAt: true,
        user: { select: { name: true } },
      },
    }),
  ])

  const entries: Array<{ displayOrder: number; createdAt: string; story: CustomerStory }> = [
    ...testimonials.map((testimonial) => ({
      displayOrder: testimonial.displayOrder,
      createdAt: testimonial.createdAt.toISOString(),
      story: {
        id: `testimonial:${testimonial.id}`,
        type: 'testimonial' as const,
        authorName: testimonial.authorName,
        content: testimonial.content,
        rating: testimonial.rating,
        verifiedPurchase: false,
        createdAt: testimonial.createdAt.toISOString(),
      },
    })),
    ...reviews.map((review) => ({
      displayOrder: review.displayOrder,
      createdAt: review.createdAt.toISOString(),
      story: {
        id: `review:${review.id}`,
        type: 'review' as const,
        authorName: review.user?.name ?? 'Verified Customer',
        content: review.content,
        rating: review.rating,
        verifiedPurchase: review.verifiedPurchase,
        createdAt: review.createdAt.toISOString(),
      },
    })),
  ]

  entries.sort(
    (a, b) => a.displayOrder - b.displayOrder || b.createdAt.localeCompare(a.createdAt),
  )

  const visible = entries.slice(0, MAX_FEATURED_HOMEPAGE_ITEMS)

  return {
    items: visible.map((entry) => entry.story),
    sources: {
      testimonials: visible.filter((entry) => entry.story.type === 'testimonial').length,
      reviews: visible.filter((entry) => entry.story.type === 'review').length,
    },
  }
}