export interface CustomerStory {
  id: string
  type: 'testimonial' | 'review'
  authorName: string
  content: string
  rating: number | null
  verifiedPurchase: boolean
  createdAt: string
}

export interface PublicCustomerStories {
  items: CustomerStory[]
  sources: {
    testimonials: number
    reviews: number
  }
}

export interface HomepageFeaturedMetrics {
  used: number
  max: number
  remaining: number
}