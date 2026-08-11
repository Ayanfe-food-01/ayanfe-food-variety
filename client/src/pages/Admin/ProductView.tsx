import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { AdminLayout } from '../../components/admin/AdminLayout'
import { ApiError } from '../../services/api'
import { getAdminProduct } from '../../services/adminService'
import type { Product } from '../../types/product'

const formatPrice = (value: number) =>
  new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(value)

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
    <AdminLayout>
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
            <p className="mt-4 text-2xl font-bold text-green-dark">{formatPrice(product.price)} <span className="text-sm font-normal text-muted">/ {product.unit}</span></p>
            <p className="mt-6 text-sm leading-7 text-muted">{product.description}</p>
            <dl className="mt-8 grid gap-4 border-t border-line pt-6 sm:grid-cols-2">
              <div><dt className="text-xs font-bold uppercase tracking-[0.12em] text-muted">Stock quantity</dt><dd className="mt-1 text-lg font-bold text-green-dark">{product.stockQuantity ?? 0}</dd></div>
              <div><dt className="text-xs font-bold uppercase tracking-[0.12em] text-muted">Product ID</dt><dd className="mt-1 break-all text-xs text-muted">{product.id}</dd></div>
            </dl>
          </div>
        </section>
      )}
    </AdminLayout>
  )
}