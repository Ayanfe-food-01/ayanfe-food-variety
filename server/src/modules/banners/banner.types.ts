export interface Banner {
  id: string
  title: string
  imageUrl: string
  promotionalText: string | null
  buttonText: string | null
  destination: string | null
  isActive: boolean
  displayOrder: number
  createdAt: string
  updatedAt: string
}

export interface PublicBanner {
  id: string
  title: string
  imageUrl: string
  promotionalText: string | null
  buttonText: string | null
  destination: string | null
}

export interface BannerInput {
  title: string
  promotionalText: string
  buttonText: string
  destination: string
  isActive: boolean
  displayOrder: number
}

export interface StoredBannerImage {
  url: string
  publicId: string
}