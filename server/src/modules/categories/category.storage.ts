import { deleteCloudinaryImage, uploadCloudinaryImage } from '../../lib/cloudinary-image.js'

export interface StoredCategoryImage {
  url: string
  publicId: string
}

export async function uploadCategoryImage(file: Express.Multer.File): Promise<StoredCategoryImage> {
  return uploadCloudinaryImage(file, { folder: 'category-images', label: 'Category' })
}

export async function deleteCategoryImage(publicId: string | null | undefined): Promise<boolean> {
  return deleteCloudinaryImage(publicId)
}