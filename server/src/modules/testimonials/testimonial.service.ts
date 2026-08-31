import { Prisma } from '@prisma/client'
import { prisma } from '../../lib/prisma.js'
import { HttpError } from '../../utils/http.js'
import {
  assertHomepageFeaturedCapacity,
  getHomepageFeaturedMetrics,
} from '../customer-stories/customer-stories.service.js'
import type {
  AdminTestimonialQuery,
  StoredTestimonialImage,
  Testimonial,
  TestimonialInput,
} from './testimonial.types.js'

type TestimonialRecord = {
  id: string
  authorName: string
  content: string
  rating: number | null
  avatarUrl: string | null
  avatarPublicId: string | null
  isActive: boolean
  isFeatured: boolean
  displayOrder: number
  createdAt: Date
  updatedAt: Date
}

const toTestimonial = (testimonial: TestimonialRecord): Testimonial => ({
  id: testimonial.id,
  authorName: testimonial.authorName,
  content: testimonial.content,
  rating: testimonial.rating,
  avatarUrl: testimonial.avatarUrl,
  avatarPublicId: testimonial.avatarPublicId,
  isActive: testimonial.isActive,
  isFeatured: testimonial.isFeatured,
  displayOrder: testimonial.displayOrder,
  createdAt: testimonial.createdAt.toISOString(),
  updatedAt: testimonial.updatedAt.toISOString(),
})

export async function listAdminTestimonials(query: AdminTestimonialQuery) {
  const where: Prisma.TestimonialWhereInput = {
    ...(query.search
      ? {
          OR: [
            { authorName: { contains: query.search, mode: 'insensitive' } },
            { content: { contains: query.search, mode: 'insensitive' } },
          ],
        }
      : {}),
    ...(query.status ? { isActive: query.status === 'active' } : {}),
    ...(query.featured ? { isFeatured: query.featured === 'featured' } : {}),
  }

  const [total, testimonials] = await prisma.$transaction([
    prisma.testimonial.count({ where }),
    prisma.testimonial.findMany({
      where,
      orderBy: [{ displayOrder: 'asc' }, { createdAt: 'desc' }],
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
  ])

  return {
    testimonials: testimonials.map(toTestimonial),
    pagination: {
      page: query.page,
      pageSize: query.pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
    },
    featured: await getHomepageFeaturedMetrics(),
  }
}

export async function getAdminTestimonial(id: string): Promise<Testimonial> {
  const testimonial = await prisma.testimonial.findUnique({ where: { id } })
  if (!testimonial) throw new HttpError(404, 'Testimonial not found.')
  return toTestimonial(testimonial)
}

export async function createTestimonial(input: TestimonialInput, image?: StoredTestimonialImage): Promise<Testimonial> {
  if (input.isActive && input.isFeatured) {
    await assertHomepageFeaturedCapacity()
  }
  try {
    return toTestimonial(await prisma.testimonial.create({
      data: {
        ...input,
        rating: input.rating,
        avatarUrl: image?.url ?? null,
        avatarPublicId: image?.publicId ?? null,
      },
    }))
  } catch (error: unknown) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      throw new HttpError(400, 'The testimonial could not be created.')
    }
    throw error
  }
}

export async function updateTestimonial(
  id: string,
  input: TestimonialInput,
  image?: StoredTestimonialImage,
  removeAvatar = false,
): Promise<Testimonial> {
  const existing = await getAdminTestimonial(id)
  const wasDisplayed = existing.isActive && existing.isFeatured
  const willBeDisplayed = input.isActive && input.isFeatured
  if (willBeDisplayed && !wasDisplayed) {
    await assertHomepageFeaturedCapacity()
  }
  try {
    return toTestimonial(await prisma.testimonial.update({
      where: { id },
      data: {
        ...input,
        rating: input.rating,
        ...(image
          ? { avatarUrl: image.url, avatarPublicId: image.publicId }
          : removeAvatar
            ? { avatarUrl: null, avatarPublicId: null }
            : {}),
      },
    }))
  } catch (error: unknown) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      throw new HttpError(404, 'Testimonial not found.')
    }
    throw error
  }
}

export async function updateTestimonialStatus(id: string, isActive: boolean): Promise<Testimonial> {
  const existing = await getAdminTestimonial(id)
  const wasDisplayed = existing.isActive && existing.isFeatured
  const willBeDisplayed = isActive && existing.isFeatured
  if (willBeDisplayed && !wasDisplayed) {
    await assertHomepageFeaturedCapacity()
  }
  try {
    return toTestimonial(await prisma.testimonial.update({ where: { id }, data: { isActive } }))
  } catch (error: unknown) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      throw new HttpError(404, 'Testimonial not found.')
    }
    throw error
  }
}

export async function updateTestimonialFeatured(id: string, isFeatured: boolean): Promise<Testimonial> {
  const existing = await getAdminTestimonial(id)
  if (isFeatured && !existing.isActive) {
    throw new HttpError(409, 'Only active testimonials can be featured on the homepage.')
  }
  const wasDisplayed = existing.isActive && existing.isFeatured
  const willBeDisplayed = isFeatured && existing.isActive
  if (willBeDisplayed && !wasDisplayed) {
    await assertHomepageFeaturedCapacity()
  }
  try {
    return toTestimonial(await prisma.testimonial.update({ where: { id }, data: { isFeatured } }))
  } catch (error: unknown) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      throw new HttpError(404, 'Testimonial not found.')
    }
    throw error
  }
}

export async function deleteTestimonial(id: string): Promise<string | null> {
  const testimonial = await getAdminTestimonial(id)
  try {
    await prisma.testimonial.delete({ where: { id } })
    return testimonial.avatarPublicId
  } catch (error: unknown) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      throw new HttpError(404, 'Testimonial not found.')
    }
    throw error
  }
}