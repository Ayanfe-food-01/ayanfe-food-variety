import { formatPrice } from '../../utils/formatPrice'
import type { WholesalePackage } from '../../types/product'

interface WholesalePricingProps {
  status: 'loading' | 'ready' | 'error' | 'idle'
  packages: WholesalePackage[]
  selectedPackageId: string | null
  onSelectPackage: (packageId: string) => void
  unit: string
}

export function WholesalePricing({
  status,
  packages,
  selectedPackageId,
  onSelectPackage,
  unit,
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

  return (
    <div className="wholesale-pricing" role="region" aria-label="Wholesale packaging">
      <div className="wholesale-pricing-head">
        <span className="wholesale-badge">Wholesale</span>
      </div>
      <p className="wholesale-price-line">Choose a package (carton/case) to see the wholesale price.</p>
      <div className="mt-3 flex flex-col gap-2">
        {packages.map((pkg) => {
          const perUnit = pkg.unitsPerPackage > 0 ? pkg.price / pkg.unitsPerPackage : null
          const isSelected = pkg.packageId === selectedPackageId
          return (
            <button
              key={pkg.packageId}
              type="button"
              onClick={() => onSelectPackage(pkg.packageId)}
              aria-pressed={isSelected}
              className={`flex items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left transition-colors ${
                isSelected
                  ? 'border-green bg-green/5'
                  : 'border-line bg-white hover:border-green/40'
              }`}
            >
              <span>
                <span className="block text-sm font-bold text-green-dark">{pkg.name}</span>
                <span className="block text-xs text-muted">
                  {pkg.unitsPerPackage} {pkg.unitsPerPackage === 1 ? 'unit' : 'units'} per package
                </span>
              </span>
              <span className="text-right">
                <span className="block text-sm font-bold text-green-dark">{formatPrice(pkg.price)}</span>
                <span className="block text-xs text-muted">
                  {perUnit !== null ? `${formatPrice(perUnit)} / ${unit}` : ''}
                </span>
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
