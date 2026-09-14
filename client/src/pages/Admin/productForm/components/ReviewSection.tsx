import { FeaturedToggle } from '../../../../components/admin/FeaturedToggle'
import { SectionHeading } from './SectionHeading'

interface ReviewSectionProps {
  hidden: boolean
  productName: string
  unit: string
  selectedCategory: string
  displayPrice: string
  displayStock: string
  displayDiscount: string
  imageCount: number
  filledOptionsCount: number
  hasFilledOptions: boolean
  isActive: boolean
  isFeatured: boolean
  isSaving: boolean
  onIsActiveChange: (checked: boolean) => void
  onFeaturedChange: (checked: boolean) => void
}

export function ReviewSection({
  hidden,
  productName,
  unit,
  selectedCategory,
  displayPrice,
  displayStock,
  displayDiscount,
  imageCount,
  filledOptionsCount,
  hasFilledOptions,
  isActive,
  isFeatured,
  isSaving,
  onIsActiveChange,
  onFeaturedChange,
}: ReviewSectionProps) {
  return (
    <section aria-labelledby="product-review-heading" className={hidden ? 'hidden md:block' : ''}>
      <SectionHeading id="product-review-heading" title="Review and save" hint="Check the summary before publishing." />
      <div className="mt-5 rounded-2xl border border-line bg-cream/40 p-5 sm:p-6">
        <dl className="grid gap-x-8 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <dt className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted">Product name</dt>
            <dd className="mt-1 text-sm font-bold text-green-dark">{productName.trim() || '—'}</dd>
          </div>
          <div>
            <dt className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted">Category</dt>
            <dd className="mt-1 text-sm font-bold text-green-dark">{selectedCategory || '—'}</dd>
          </div>
          <div>
            <dt className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted">Unit / quantity</dt>
            <dd className="mt-1 text-sm font-bold text-green-dark">{unit.trim() || '—'}</dd>
          </div>
          <div>
            <dt className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted">Price</dt>
            <dd className="mt-1 text-sm font-bold text-green-dark">{displayPrice}</dd>
            {hasFilledOptions && (
              <dd className="mt-0.5 text-xs font-normal text-muted">Lowest of {filledOptionsCount} option{filledOptionsCount === 1 ? '' : 's'}.</dd>
            )}
          </div>
          <div>
            <dt className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted">Stock quantity</dt>
            <dd className="mt-1 text-sm font-bold text-green-dark">{displayStock}</dd>
          </div>
          <div>
            <dt className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted">Discount</dt>
            <dd className="mt-1 text-sm font-bold text-green-dark">{displayDiscount}</dd>
          </div>
          <div>
            <dt className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted">Product images</dt>
            <dd className="mt-1 text-sm font-bold text-green-dark">{imageCount === 0 ? '—' : `${imageCount} image${imageCount === 1 ? '' : 's'}`}</dd>
          </div>
          <div className="sm:col-span-2 lg:col-span-2">
            <dt className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted">Size options</dt>
            <dd className="mt-1 text-sm font-bold text-green-dark">
              {filledOptionsCount === 0 ? 'None' : `${filledOptionsCount} size option${filledOptionsCount === 1 ? '' : 's'}`}
            </dd>
          </div>
        </dl>
      </div>
      <div className="mt-6 space-y-4">
        <label className="flex items-center gap-3 text-sm font-bold text-green-dark">
          <input className="size-4 accent-green" type="checkbox" checked={isActive} onChange={(event) => onIsActiveChange(event.target.checked)} />
          Available / active for sale
        </label>
        <FeaturedToggle checked={isFeatured} disabled={isSaving} onChange={onFeaturedChange} />
      </div>
    </section>
  )
}