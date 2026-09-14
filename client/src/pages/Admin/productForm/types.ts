export interface ProductImageDraft {
  id: string
  url: string
  file?: File
}

export type FormErrors = Partial<
  Record<
    'name' | 'categoryId' | 'price' | 'discountType' | 'discountValue' | 'unit' | 'description' | 'stockQuantity' | 'image',
    string
  >
>