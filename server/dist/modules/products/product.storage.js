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
