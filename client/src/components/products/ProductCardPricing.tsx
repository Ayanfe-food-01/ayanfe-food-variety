import { ProductPrice } from './ProductPrice'
import { ProductRating } from './ProductRating'
import { formatPrice } from '../../utils/formatPrice'
import type { Product } from '../../types/product'

interface ProductCardPricingProps {
  product: Product
  showsWholesale: boolean
  wholesaleFrom: number | null
}

export function ProductCardPricing({ product, showsWholesale, wholesaleFrom }: ProductCardPricingProps) {
  if (showsWholesale) {
    return (
      <strong className="flex flex-col items-start gap-px mt-0.5 text-[15px] font-bold leading-[1.25] text-green-dark">
        <span className="text-[10px] font-extrabold uppercase tracking-[0.08em] text-muted">Wholesale from</span>
        <span className="text-[15px] font-extrabold text-green-dark">{formatPrice(wholesaleFrom!)}</span>
      </strong>
    )
  }

  return (
    <>
      <strong className="text-[15px] font-bold text-green-dark">
        <ProductPrice
          originalPrice={product.price}
          discountedPrice={product.discountedPrice}
          discountedClassName="text-green-dark"
          originalClassName="ml-1 text-sm font-normal text-muted"
        />
      </strong>
      <ProductRating rating={product.averageRating} count={product.reviewCount} />
    </>
  )
}
