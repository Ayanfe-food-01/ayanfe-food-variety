import { deleteCloudinaryImage, uploadCloudinaryImage } from '../../lib/cloudinary-image.js'
import type { StoredBrandingImage } from './settings.types.js'

export function uploadBrandingLogo(file: Express.Multer.File): Promise<StoredBrandingImage> {
  return uploadCloudinaryImage(file, { folder: 'branding', label: 'Logo' })
}

export function uploadBrandingFavicon(file: Express.Multer.File): Promise<StoredBrandingImage> {
  return uploadCloudinaryImage(file, {
    folder: 'branding',
    label: 'Favicon',
    allowedTypes: ['jpg', 'png', 'webp'],
    requireSquare: true,
  })
}

export function deleteBrandingImage(publicId: string | null | undefined): Promise<boolean> {
  return deleteCloudinaryImage(publicId)
}