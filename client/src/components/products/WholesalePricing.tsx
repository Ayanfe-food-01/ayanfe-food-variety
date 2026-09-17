import { formatPrice } from '../../utils/formatPrice'
import type { WholesalePackage } from '../../types/product'
import { SelectField, type SelectOption } from '../ui/SelectField'

interface WholesalePricingProps {
  status: 'loading' | 'ready' | 'error' | 'idle'
  packages: WholesalePackage[]
  selectedPackageId: string | null
  onSelectPackage: (packageId: string) => void
  unit: string
  optionLabelById?: Record<string, string>
}

export function WholesalePricing({
  status,
  packages,
  selectedPackageId,
  onSelectPackage,
  unit,
  optionLabelById = {},
}: WholesalePricingProps) {
  if (status === 'loading' || status === 'idle') {
    return (
      <p className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-[13px] mb-2.5" role="status" aria-live="polite">
        Loading wholesale pricing…
      </p>
    )
  }

  if (status === 'error') {
    return (
      <p className="flex flex-wrap items-baseline gap-x-2 gap-y-1 mb-2.5 text-orange text-[13px] font-bold" role="status" aria-live="polite">
        Wholesale pricing could not be loaded right now.
      </p>
    )
  }

  if (packages.length === 0) {
    return (
      <p className="mt-2.5 text-[12px] text-muted" role="status">
        Wholesale pricing is not available for this product yet.
      </p>
    )
  }

  const selectedPackage = packages.find((pkg) => pkg.packageId === selectedPackageId) ?? null
  const selectedSizeLabel = selectedPackage?.productOptionId
    ? (optionLabelById[selectedPackage.productOptionId] ?? null)
    : null
  const perUnit = selectedPackage && selectedPackage.unitsPerPackage > 0
    ? selectedPackage.price / selectedPackage.unitsPerPackage
    : null

  const selectOptions: SelectOption[] = packages.map((pkg) => {
    const sizeLabel = pkg.productOptionId ? (optionLabelById[pkg.productOptionId] ?? null) : null
    return {
      value: pkg.packageId,
      label: `${pkg.name}${sizeLabel ? ` (${sizeLabel})` : ''} — ${formatPrice(pkg.price)}`,
    }
  })

  return (
    <div
      className="w-full min-w-0 mt-[22px] rounded-2xl border border-green/22 bg-[#fbfbf7] p-3.5"
      role="region"
      aria-label="Wholesale packaging"
    >
      <div className="flex flex-wrap items-center gap-2 mb-2.5">
        <span className="inline-flex items-center min-h-[22px] rounded-full border border-green/25 bg-sage px-2 text-[10px] font-extrabold uppercase tracking-[0.1em] text-green-dark">Wholesale</span>
      </div>
      <label
        className="block text-xs font-bold uppercase tracking-[0.14em] text-green-dark"
        htmlFor="wholesale-package"
      >
        Packaging
      </label>
      <div className="mt-2">
        <SelectField
          ariaLabel="Select a package"
          id="wholesale-package"
          onChange={onSelectPackage}
          options={selectOptions}
          placeholder="Choose a package (carton/case)"
          value={selectedPackageId ?? ''}
        />
      </div>
      {selectedPackage && (
        <div className="mt-4 flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className="text-[24px] font-extrabold tracking-[-0.02em] text-green-dark">{formatPrice(selectedPackage.price)}</span>
          <span className="text-[13px] text-muted">
            per {selectedPackage.unitsPerPackage} {selectedPackage.unitsPerPackage === 1 ? 'unit' : 'units'}
            {selectedSizeLabel ? ` · ${selectedSizeLabel}` : ''}
          </span>
          {perUnit !== null && (
            <span className="text-[13px] text-muted">({formatPrice(perUnit)} / {unit})</span>
          )}
        </div>
      )}
    </div>
  )
}