import { deleteCloudinaryImage, uploadCloudinaryImage } from '../../lib/cloudinary-image.js';
export function uploadBrandingLogo(file) {
    return uploadCloudinaryImage(file, { folder: 'branding', label: 'Logo' });
}
export function uploadBrandingFavicon(file) {
    return uploadCloudinaryImage(file, {
        folder: 'branding',
        label: 'Favicon',
        allowedTypes: ['jpg', 'png', 'webp'],
        requireSquare: true,
    });
}
export function deleteBrandingImage(publicId) {
    return deleteCloudinaryImage(publicId);
}
