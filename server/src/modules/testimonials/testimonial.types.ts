export interface Testimonial {
  id: string
  authorName: string
  content: string
  rating: number | null
  avatarUrl: string | null
  avatarPublicId: string | null
  isActive: boolean
  isFeatured: boolean
  displayOrder: number
  createdAt: string
  updatedAt: string
}

export interface TestimonialInput {
  authorName: string
  content: string
  rating: number | null
  isActive: boolean
  isFeatured: boolean
  displayOrder: number
}

export interface StoredTestimonialImage {
  url: string
  publicId: string
}

export interface AdminTestimonialQuery {
  page: number
  pageSize: number
  search?: string
  status?: 'active' | 'inactive'
  featured?: 'featured' | 'not-featured'
}