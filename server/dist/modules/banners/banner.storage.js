import { deleteCloudinaryImage, uploadCloudinaryImage } from '../../lib/cloudinary-image.js';
export function uploadBannerImage(file) {
    return uploadCloudinaryImage(file, { folder: 'promotional-banners', label: 'Banner' });
}
export function deleteBannerImage(publicId) {
    return deleteCloudinaryImage(publicId);
}
