import type { WholesalePricingTier } from '../../types/product'
import { formatPrice } from '../../utils/formatPrice'

interface WholesalePricingProps {
  optionLabel: string
  moq: number | null
  tiers: WholesalePricingTier[]
  quantity: number
  unitPrice: number | null
  isCalculating: boolean
  error: string | null
}

const tierRangeLabel = (tier: WholesalePricingTier): string => {
  if (tier.maxQuantity === null) return `${tier.minQuantity}+`
  if (tier.maxQuantity === tier.minQuantity) return String(tier.minQuantity)
  return `${tier.minQuantity} – ${tier.maxQuantity}`
}

export function WholesalePricing({
  optionLabel,
  moq,
  tiers,
  quantity,
  unitPrice,
  isCalculating,
  error,
}: WholesalePricingProps) {
  const isTierActive = (tier: WholesalePricingTier) =>
    quantity >= tier.minQuantity && (tier.maxQuantity === null || quantity <= tier.maxQuantity)

  return (
    <div className="wholesale-pricing" role="region" aria-label="Wholesale pricing">
      <div className="wholesale-pricing-head">
        <span className="wholesale-badge">Wholesale</span>
        {moq !== null && moq > 1 && <span className="wholesale-moq">Minimum order: {moq} units</span>}
      </div>
      {error ? (
        <p className="wholesale-price-line wholesale-price-error" role="status" aria-live="polite">
          {error}
        </p>
      ) : isCalculating || unitPrice === null ? (
        <p className="wholesale-price-line" aria-live="polite">
          Calculating price for {quantity} {quantity === 1 ? 'unit' : 'units'}…
        </p>
      ) : (
        <p className="wholesale-price-line">
          <strong className="wholesale-unit-price">{formatPrice(unitPrice)}</strong>
          <span className="wholesale-per">
            per {optionLabel} at {quantity} {quantity === 1 ? 'unit' : 'units'}
          </span>
        </p>
      )}
      <table className="wholesale-tier-table">
        <thead>
          <tr>
            <th scope="col">Units</th>
            <th scope="col">Unit price</th>
          </tr>
        </thead>
        <tbody>
          {tiers.map((tier) => (
            <tr key={`${tier.minQuantity}-${tier.maxQuantity ?? 'unlimited'}`} className={isTierActive(tier) ? 'is-active' : undefined}>
              <td>{tierRangeLabel(tier)}</td>
              <td>{formatPrice(tier.price)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}