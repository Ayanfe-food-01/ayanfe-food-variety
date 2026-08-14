import type { Product } from '../../types/product'
import { ProductCard } from './ProductCard'

interface ProductGridProps {
  products: Product[]
}

export function ProductGrid({ products }: ProductGridProps) {
  return (
    <div className="product-grid">
      {products.map((product) => <ProductCard key={product.id} product={product} />)}
    </div>
  )
}