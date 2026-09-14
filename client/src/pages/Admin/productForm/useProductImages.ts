import { useState } from 'react'
import type { ProductImageDraft } from './types'

const buildImageOrder = (drafts: ProductImageDraft[]): string[] => {
  let newImageIndex = 0
  return drafts.map((draft) => (draft.file ? `new:${newImageIndex++}` : `existing:${draft.url}`))
}

interface UseProductImagesOptions {
  syncFormImages: (drafts: ProductImageDraft[], imageOrder: string[]) => void
  clearImageError: () => void
  reportImageError: (message: string) => void
}

export function useProductImages({ syncFormImages, clearImageError, reportImageError }: UseProductImagesOptions) {
  const [imageDrafts, setImageDrafts] = useState<ProductImageDraft[]>([])

  const resetDrafts = (drafts: ProductImageDraft[]) => {
    setImageDrafts(drafts)
    syncFormImages(drafts, buildImageOrder(drafts))
  }

  const syncImageDrafts = (nextDrafts: ProductImageDraft[]) => {
    const imageOrder = buildImageOrder(nextDrafts)
    setImageDrafts(nextDrafts)
    syncFormImages(nextDrafts, imageOrder)
    clearImageError()
  }

  const chooseImages = (files: File[], previews: string[], errorMessage: string | null) => {
    if (errorMessage) {
      reportImageError(errorMessage)
      return
    }
    syncImageDrafts([
      ...imageDrafts,
      ...files.map((file, index) => ({ id: `new-${Date.now()}-${index}`, url: previews[index], file })),
    ])
  }

  const removeImage = (index: number) => {
    const draft = imageDrafts[index]
    if (draft?.file) URL.revokeObjectURL(draft.url)
    syncImageDrafts(imageDrafts.filter((_, draftIndex) => draftIndex !== index))
  }

  const moveImage = (index: number, direction: -1 | 1) => {
    const nextIndex = index + direction
    if (nextIndex < 0 || nextIndex >= imageDrafts.length) return
    const nextDrafts = [...imageDrafts]
    ;[nextDrafts[index], nextDrafts[nextIndex]] = [nextDrafts[nextIndex], nextDrafts[index]]
    syncImageDrafts(nextDrafts)
  }

  return { imageDrafts, resetDrafts, chooseImages, removeImage, moveImage }
}