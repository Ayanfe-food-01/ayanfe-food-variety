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
      <p className="wholesale-price-line" role="status" aria-live="polite">
        Loading wholesale pricing…
      </p>
    )
  }

  if (status === 'error') {
    return (
      <p className="wholesale-price-line wholesale-price-error" role="status" aria-live="polite">
        Wholesale pricing could not be loaded right now.
      </p>
    )
  }

  if (packages.length === 0) {
    return (
      <p className="wholesale-note" role="status">
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
    <div className="wholesale-pricing w-full min-w-0" role="region" aria-label="Wholesale packaging">
      <div className="wholesale-pricing-head">
        <span className="wholesale-badge">Wholesale</span>
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
          <span className="wholesale-unit-price">{formatPrice(selectedPackage.price)}</span>
          <span className="wholesale-per">
            per {selectedPackage.unitsPerPackage} {selectedPackage.unitsPerPackage === 1 ? 'unit' : 'units'}
            {selectedSizeLabel ? ` · ${selectedSizeLabel}` : ''}
          </span>
          {perUnit !== null && (
            <span className="wholesale-per">({formatPrice(perUnit)} / {unit})</span>
          )}
        </div>
      )}
    </div>
  )
}