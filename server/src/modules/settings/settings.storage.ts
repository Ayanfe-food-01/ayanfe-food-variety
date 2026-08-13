import { deleteCloudinaryImage, publicIdFromCloudinaryUrl, uploadCloudinaryImage } from '../../lib/cloudinary-image.js'

export function uploadHeroImage(file: Express.Multer.File) {
  return uploadCloudinaryImage(file, { folder: 'hero-images', label: 'Hero' })
}

export function deleteHeroImage(imageUrl: string | null | undefined): Promise<boolean> {
  return deleteCloudinaryImage(publicIdFromCloudinaryUrl(imageUrl ?? '', 'hero-images'))
}