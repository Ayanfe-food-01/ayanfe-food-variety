import { CloseIcon } from '../../../../assets/icons'
import { ImageUploadField } from '../../../../components/admin/ImageUploadField'
import { SectionHeading } from './SectionHeading'
import type { ProductImageDraft } from '../types'

interface ImagesSectionProps {
  hidden: boolean
  productName: string
  imageDrafts: ProductImageDraft[]
  error?: string
  onChoose: (files: File[], previews: string[], errorMessage: string | null) => void
  onRemove: (index: number) => void
  onMove: (index: number, direction: -1 | 1) => void
}

export function ImagesSection({ hidden, productName, imageDrafts, error, onChoose, onRemove, onMove }: ImagesSectionProps) {
  return (
    <section aria-labelledby="product-images-heading" className={hidden ? 'hidden md:block' : ''}>
      <SectionHeading id="product-images-heading" title="Product images" hint="Upload photos and set the display order." />
      <div className="mt-5 space-y-5">
        <ImageUploadField
          label="Product images"
          helperText="Add up to 10 JPG, PNG, WEBP, or HEIC/HEIF images. The first image is the primary product image."
          alt="Product image preview"
          error={error}
          multiple
          onChange={() => undefined}
          onMultipleChange={onChoose}
        />
        {imageDrafts.length > 0 && (
          <div className="rounded-2xl border border-line bg-cream/40 p-4" aria-label="Product image order">
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="m-0 text-sm font-bold text-green-dark">Image order</p>
              <p className="m-0 text-xs text-muted">{imageDrafts.length}/10 images</p>
            </div>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(6.5rem,1fr))] gap-3">
              {imageDrafts.map((draft, index) => (
                <div className="relative overflow-hidden rounded-xl border border-line bg-white" key={draft.id}>
                  <img className="aspect-square w-full object-cover" src={draft.url} alt={`${productName || 'Product'} image ${index + 1}`} />
                  <button
                    className="absolute right-1.5 top-1.5 z-10 grid size-6 place-items-center rounded-full border border-white/40 bg-green-dark/75 text-white shadow-sm transition-colors hover:bg-orange"
                    type="button"
                    aria-label={`Remove product image ${index + 1}`}
                    onClick={() => onRemove(index)}
                  >
                    <CloseIcon size={12} />
                  </button>
                  <div className="flex items-center justify-between gap-1 border-t border-line p-2">
                    <span className="min-w-0 truncate text-[11px] font-bold text-green-dark">{index === 0 ? 'Primary' : `Image ${index + 1}`}</span>
                  </div>
                  <div className="flex gap-1 px-2 pb-2">
                    <button
                      className="flex-1 rounded-md border border-line px-1 py-1 text-xs font-bold text-green-dark disabled:opacity-30"
                      type="button"
                      aria-label="Move image left"
                      disabled={index === 0}
                      onClick={() => onMove(index, -1)}
                    >
                      ←
                    </button>
                    <button
                      className="flex-1 rounded-md border border-line px-1 py-1 text-xs font-bold text-green-dark disabled:opacity-30"
                      type="button"
                      aria-label="Move image right"
                      disabled={index === imageDrafts.length - 1}
                      onClick={() => onMove(index, 1)}
                    >
                      →
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  )
}