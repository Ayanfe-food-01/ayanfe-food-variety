import { Prisma } from '@prisma/client'
import { prisma } from '../../lib/prisma.js'
import { HttpError } from '../../utils/http.js'
import type { Banner, BannerInput, PublicBanner, StoredBannerImage } from './banner.types.js'

type BannerRecord = {
  id: string
  title: string
  imageUrl: string
  imagePublicId: string
  promotionalText: string | null
  buttonText: string | null
  destination: string | null
  isActive: boolean
  displayOrder: number
  createdAt: Date
  updatedAt: Date
}

const toBanner = (banner: BannerRecord): Banner => ({
  id: banner.id,
  title: banner.title,
  imageUrl: banner.imageUrl,
  promotionalText: banner.promotionalText,
  buttonText: banner.buttonText,
  destination: banner.destination,
  isActive: banner.isActive,
  displayOrder: banner.displayOrder,
  createdAt: banner.createdAt.toISOString(),
  updatedAt: banner.updatedAt.toISOString(),
})

export async function getPublicBanners(): Promise<PublicBanner[]> {
  const banners = await prisma.promotionalBanner.findMany({
    where: { isActive: true },
    orderBy: [{ displayOrder: 'asc' }, { createdAt: 'asc' }],
  })
  return banners.map((banner): PublicBanner => ({
    id: banner.id,
    title: banner.title,
    imageUrl: banner.imageUrl,
    promotionalText: banner.promotionalText,
    buttonText: banner.buttonText,
    destination: banner.destination,
  }))
}

export async function listAdminBanners(): Promise<{ banners: Banner[] }> {
  const banners = await prisma.promotionalBanner.findMany({
    orderBy: [{ displayOrder: 'asc' }, { createdAt: 'desc' }],
  })
  return { banners: banners.map(toBanner) }
}

export async function getAdminBanner(id: string): Promise<BannerRecord> {
  const banner = await prisma.promotionalBanner.findUnique({ where: { id } })
  if (!banner) throw new HttpError(404, 'Banner not found.')
  return banner
}

export async function createBanner(input: BannerInput, image: StoredBannerImage): Promise<Banner> {
  try {
    return toBanner(await prisma.promotionalBanner.create({
      data: {
        ...input,
        promotionalText: input.promotionalText || null,
        buttonText: input.buttonText || null,
        destination: input.destination || null,
        imageUrl: image.url,
        imagePublicId: image.publicId,
      },
    }))
  } catch (error: unknown) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      throw new HttpError(400, 'The banner could not be created.')
    }
    throw error
  }
}

export async function updateBanner(id: string, input: BannerInput, image?: StoredBannerImage): Promise<Banner> {
  await getAdminBanner(id)
  try {
    return toBanner(await prisma.promotionalBanner.update({
      where: { id },
      data: {
        ...input,
        promotionalText: input.promotionalText || null,
        buttonText: input.buttonText || null,
        destination: input.destination || null,
        ...(image ? { imageUrl: image.url, imagePublicId: image.publicId } : {}),
      },
    }))
  } catch (error: unknown) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      throw new HttpError(404, 'Banner not found.')
    }
    throw error
  }
}

export async function updateBannerStatus(id: string, isActive: boolean): Promise<Banner> {
  try {
    return toBanner(await prisma.promotionalBanner.update({ where: { id }, data: { isActive } }))
  } catch (error: unknown) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      throw new HttpError(404, 'Banner not found.')
    }
    throw error
  }
}

export async function deleteBanner(id: string): Promise<string> {
  const banner = await getAdminBanner(id)
  try {
    await prisma.promotionalBanner.delete({ where: { id } })
    return banner.imagePublicId
  } catch (error: unknown) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      throw new HttpError(404, 'Banner not found.')
    }
    throw error
  }
}