import type { ReactNode } from 'react'

const formatPrice = (price: number) =>
  new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0,
  }).format(price)

interface ProductPriceProps {
  originalPrice: number
  discountedPrice: number
  className?: string
  discountedClassName?: string
  originalClassName?: string
}

export function ProductPrice({
  originalPrice,
  discountedPrice,
  className = '',
  discountedClassName = '',
  originalClassName = '',
}: ProductPriceProps): ReactNode {
  const hasDiscount = discountedPrice < originalPrice

  if (!hasDiscount) return <span className={className}>{formatPrice(originalPrice)}</span>

  return (
    <span className={className}>
      <span className={discountedClassName}>{formatPrice(discountedPrice)}</span>{' '}
      <del className={originalClassName}>{formatPrice(originalPrice)}</del>
    </span>
  )
}