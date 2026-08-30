import { deleteCloudinaryImage, uploadCloudinaryImage } from '../../lib/cloudinary-image.js'
import type { StoredTestimonialImage } from './testimonial.types.js'

export function uploadTestimonialAvatar(file: Express.Multer.File): Promise<StoredTestimonialImage> {
  return uploadCloudinaryImage(file, { folder: 'testimonial-avatars', label: 'Testimonial avatar' })
}

export function deleteTestimonialAvatar(publicId: string | null | undefined): Promise<boolean> {
  return deleteCloudinaryImage(publicId)
}