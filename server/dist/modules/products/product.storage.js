import { prisma } from '../../lib/prisma.js';
import { deleteCloudinaryImage, publicIdFromCloudinaryUrl, uploadCloudinaryImage } from '../../lib/cloudinary-image.js';
export async function uploadProductImage(file) {
    return (await uploadCloudinaryImage(file, { folder: 'product-images', label: 'Product' })).url;
}
/**
 * Product image cleanup is best effort. Product updates must not fail after
 * the database has been updated just because a remote cleanup request failed.
 */
export async function deleteProductImage(imageUrl) {
    return deleteCloudinaryImage(publicIdFromCloudinaryUrl(imageUrl, 'product-images'));
}
export async function deleteProductImageIfUnused(imageUrl, excludedProductId) {
    const [legacyReference, imageReference] = await Promise.all([
        prisma.product.findFirst({
            where: {
                image: imageUrl,
                ...(excludedProductId ? { id: { not: excludedProductId } } : {}),
            },
            select: { id: true },
        }),
        prisma.productImage.findFirst({
            where: {
                url: imageUrl,
                ...(excludedProductId ? { productId: { not: excludedProductId } } : {}),
            },
            select: { id: true },
        }),
    ]);
    if (legacyReference || imageReference)
        return false;
    return deleteProductImage(imageUrl);
}
