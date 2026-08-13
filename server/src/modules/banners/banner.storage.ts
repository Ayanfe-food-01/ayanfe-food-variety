import { deleteCloudinaryImage, uploadCloudinaryImage } from '../../lib/cloudinary-image.js'
import type { StoredBannerImage } from './banner.types.js'

export function uploadBannerImage(file: Express.Multer.File): Promise<StoredBannerImage> {
  return uploadCloudinaryImage(file, { folder: 'promotional-banners', label: 'Banner' })
}

export function deleteBannerImage(publicId: string | null | undefined): Promise<boolean> {
  return deleteCloudinaryImage(publicId)
}