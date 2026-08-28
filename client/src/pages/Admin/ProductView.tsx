import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ApiError } from '../../services/api'
import { getAdminProduct } from '../../services/adminService'
import { ProductPrice } from '../../components/products/ProductPrice'
import { formatPrice } from '../../utils/formatPrice'
import type { Product } from '../../types/product'

export function ProductView() {
  const { id } = useParams<{ id: string }>()
  const [product, setProduct] = useState<Product | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(() => id ? null : 'Product ID is invalid.')

  useEffect(() => {
    if (!id) return
    getAdminProduct(id)
      .then(setProduct)
      .catch((caught: unknown) => setError(caught instanceof ApiError ? caught.message : 'Product could not be loaded.'))
      .finally(() => setIsLoading(false))
  }, [id])

  return (
    <>
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div><p className="text-xs font-bold uppercase tracking-[0.16em] text-orange">Catalog</p><h1 className="mt-2 text-4xl font-bold tracking-[-0.05em] text-green-dark sm:text-5xl">Product details</h1></div>
        <div className="flex gap-4 text-sm font-bold text-green"><Link to="/admin/products">Back to products</Link>{product && <Link to={`/admin/products/${product.id}/edit`}>Edit product</Link>}</div>
      </div>
      {isLoading && <div className="mt-8 rounded-2xl border border-line bg-white px-5 py-14 text-center text-sm text-muted">Loading product…</div>}
      {error && <div className="mt-8 rounded-2xl border border-orange/25 bg-orange/5 p-4 text-sm text-orange" role="alert">{error}</div>}
      {product && (
        <section className="mt-8 grid gap-8 rounded-2xl border border-line bg-white p-6 shadow-sm sm:p-8 lg:grid-cols-[minmax(0,360px)_1fr]">
          <img className="aspect-square w-full rounded-2xl bg-sage object-cover" src={product.image} alt={product.name} />
          <div>
            <div className="flex flex-wrap items-center gap-2 text-xs font-bold uppercase tracking-[0.12em] text-orange"><span>{product.category}</span><span className="text-line">•</span><span>{product.isActive ? product.isAvailable ? 'Available' : 'Out of stock' : 'Inactive'}</span></div>
            <h2 className="mt-3 text-3xl font-bold tracking-[-0.04em] text-green-dark">{product.name}</h2>
            <p className="mt-4 text-2xl font-bold text-green-dark"><ProductPrice originalPrice={product.price} discountedPrice={product.discountedPrice} discountedClassName="text-green-dark" originalClassName="ml-2 text-base font-normal text-muted" /> <span className="text-sm font-normal text-muted">/ {product.unit}</span></p>
            {product.discountType && <p className="mt-2 text-xs font-semibold text-orange">{product.discountType === 'PERCENTAGE' ? `${product.discountValue}% discount` : `NGN ${product.discountValue} discount`}</p>}
            {product.options && product.options.length > 0 && (
              <div className="mt-6">
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted">Quantity / size options</p>
                <ul className="mt-3 space-y-2">
                  {product.options.map((option) => (
                    <li className="flex items-center justify-between gap-3 rounded-xl border border-line bg-cream/40 px-4 py-2.5 text-sm" key={option.id}>
                      <span className="font-bold text-green-dark">{option.label}</span>
                      <span className="text-xs text-muted">{formatPrice(option.price)} · {option.stockQuantity} in stock</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <p className="mt-6 text-sm leading-7 text-muted">{product.description}</p>
            <dl className="mt-8 grid gap-4 border-t border-line pt-6 sm:grid-cols-2">
              <div><dt className="text-xs font-bold uppercase tracking-[0.12em] text-muted">Stock quantity</dt><dd className="mt-1 text-lg font-bold text-green-dark">{product.stockQuantity ?? 0}</dd></div>
              <div><dt className="text-xs font-bold uppercase tracking-[0.12em] text-muted">Product ID</dt><dd className="mt-1 break-all text-xs text-muted">{product.id}</dd></div>
            </dl>
          </div>
        </section>
      )}
    </>
  )
}