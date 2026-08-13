import { deleteCloudinaryImage, uploadCloudinaryImage } from '../../lib/cloudinary-image.js';
export async function uploadCategoryImage(file) {
    return uploadCloudinaryImage(file, { folder: 'category-images', label: 'Category' });
}
export async function deleteCategoryImage(publicId) {
    return deleteCloudinaryImage(publicId);
}
