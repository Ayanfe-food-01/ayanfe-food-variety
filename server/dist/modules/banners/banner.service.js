import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { HttpError } from '../../utils/http.js';
const toBanner = (banner) => ({
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
});
export async function getPublicBanners() {
    const banners = await prisma.promotionalBanner.findMany({
        where: { isActive: true },
        orderBy: [{ displayOrder: 'asc' }, { createdAt: 'asc' }],
    });
    return banners.map((banner) => ({
        id: banner.id,
        title: banner.title,
        imageUrl: banner.imageUrl,
        promotionalText: banner.promotionalText,
        buttonText: banner.buttonText,
        destination: banner.destination,
    }));
}
export async function listAdminBanners() {
    const banners = await prisma.promotionalBanner.findMany({
        orderBy: [{ displayOrder: 'asc' }, { createdAt: 'desc' }],
    });
    return { banners: banners.map(toBanner) };
}
export async function getAdminBanner(id) {
    const banner = await prisma.promotionalBanner.findUnique({ where: { id } });
    if (!banner)
        throw new HttpError(404, 'Banner not found.');
    return banner;
}
export async function createBanner(input, image) {
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
        }));
    }
    catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
            throw new HttpError(400, 'The banner could not be created.');
        }
        throw error;
    }
}
export async function updateBanner(id, input, image) {
    await getAdminBanner(id);
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
        }));
    }
    catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
            throw new HttpError(404, 'Banner not found.');
        }
        throw error;
    }
}
export async function updateBannerStatus(id, isActive) {
    try {
        return toBanner(await prisma.promotionalBanner.update({ where: { id }, data: { isActive } }));
    }
    catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
            throw new HttpError(404, 'Banner not found.');
        }
        throw error;
    }
}
export async function deleteBanner(id) {
    const banner = await getAdminBanner(id);
    try {
        await prisma.promotionalBanner.delete({ where: { id } });
        return banner.imagePublicId;
    }
    catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
            throw new HttpError(404, 'Banner not found.');
        }
        throw error;
    }
}
