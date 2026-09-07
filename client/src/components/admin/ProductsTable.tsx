import { useEffect, useRef } from 'react'
import { FeaturedStatus } from './FeaturedStatus'
import { ProductActions } from './ProductActions'
import type { AdminProductsPage } from '../../services/adminService'
import { ProductPrice } from '../products/ProductPrice'
import { ResponsiveDataTable } from '../ui/ResponsiveDataTable'
import { formatPrice } from '../../utils/formatPrice'
import { formatDate } from '../../utils/dateFormat'

interface ProductsTableProps {
  products: AdminProductsPage['products']
  updatingId: string | null
  deletingId: string | null
  selectedProductIds: string[]
  allProductsSelected: boolean
  someProductsSelected: boolean
  onToggleSelectAll: () => void
  onToggleSelect: (productId: string) => void
  onToggleStatus: (product: AdminProductsPage['products'][number]) => void
  onChangeStatus: (product: AdminProductsPage['products'][number]) => void
  onToggleFeatured: (product: AdminProductsPage['products'][number]) => void
  onDelete: (product: AdminProductsPage['products'][number]) => void
}

export function ProductsTable({
  products,
  updatingId,
  deletingId,
  selectedProductIds,
  allProductsSelected,
  someProductsSelected,
  onToggleSelectAll,
  onToggleSelect,
  onToggleStatus,
  onChangeStatus,
  onToggleFeatured,
  onDelete,
}: ProductsTableProps) {
  const selectAllRef = useRef<HTMLInputElement>(null)
  const mobileSelectAllRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = someProductsSelected && !allProductsSelected
    }
    if (mobileSelectAllRef.current) {
      mobileSelectAllRef.current.indeterminate = someProductsSelected && !allProductsSelected
    }
  }, [allProductsSelected, someProductsSelected])

  return (
    <div className="admin-products-table min-w-0 overflow-hidden">
      <div className="space-y-3 p-4 lg:hidden">
        <label className="admin-products-mobile-selection flex items-center gap-2 text-xs font-bold text-green-dark">
          <input
            ref={mobileSelectAllRef}
            className="admin-products-checkbox size-4"
            type="checkbox"
            checked={allProductsSelected}
            onChange={onToggleSelectAll}
            aria-label="Select all products on this page"
          />
          <span>Select all products on this page</span>
        </label>
        {products.map((product) => (
          <article className="rounded-2xl border border-line bg-cream/45 p-4" key={product.id}>
            <div className="flex items-start gap-3">
              <input
                className="admin-products-checkbox mt-1 size-4 shrink-0"
                type="checkbox"
                checked={selectedProductIds.includes(product.id)}
                onChange={() => onToggleSelect(product.id)}
                aria-label={`Select ${product.name}`}
              />
              <img className="size-16 shrink-0 rounded-xl object-cover" src={product.image} alt="" />
              <div className="min-w-0 flex-1">
                <p className="font-bold text-green-dark">{product.name}</p>
                <p className="mt-1 break-words text-xs text-muted">{product.description}</p>
                <p className="mt-1 text-xs text-muted">{product.category}</p>
              </div>
            </div>
            <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-line pt-3 text-xs">
              <div><dt className="uppercase tracking-[0.12em] text-muted">Price / unit</dt><dd className="mt-1 font-bold text-green-dark"><ProductPrice originalPrice={product.price} discountedPrice={product.discountedPrice} discountedClassName="text-green-dark" originalClassName="ml-1 font-normal text-muted" /> <span className="font-normal text-muted">/ {product.unit}</span></dd></div>
              <div><dt className="uppercase tracking-[0.12em] text-muted">Stock</dt><dd className="mt-1 font-bold text-green-dark">{product.stockQuantity ?? 0}</dd></div>
              <div><dt className="uppercase tracking-[0.12em] text-muted">Status</dt><dd className="mt-1"><ProductStatusSelect product={product} isBusy={updatingId === product.id} onChange={() => onChangeStatus(product)} /></dd></div>
              <div><dt className="uppercase tracking-[0.12em] text-muted">Delivery fee</dt><dd className="mt-1 font-bold text-green-dark">{product.deliveryFee === 0 ? 'Free' : formatPrice(product.deliveryFee)}</dd></div>
              <div><dt className="uppercase tracking-[0.12em] text-muted">Availability</dt><dd className="mt-1"><AvailabilityPill product={product} /></dd></div>
              <div><dt className="uppercase tracking-[0.12em] text-muted">Featured</dt><dd className="mt-1"><FeaturedStatus isFeatured={product.isFeatured} /></dd></div>
              <div><dt className="uppercase tracking-[0.12em] text-muted">Created</dt><dd className="mt-1 text-muted">{product.createdAt ? formatDate(product.createdAt) : '—'}</dd></div>
            </dl>
            <div className="mt-4 flex justify-end border-t border-line pt-3">
              <ProductActions product={product} isBusy={updatingId === product.id || deletingId === product.id} onToggleStatus={() => onToggleStatus(product)} onToggleFeatured={() => onToggleFeatured(product)} onDelete={() => onDelete(product)} />
            </div>
          </article>
        ))}
      </div>

      <div className="hidden lg:block">
        <ResponsiveDataTable label="Products table horizontal scroll">
          <table className="w-full min-w-[1180px] whitespace-nowrap text-left text-sm">
            <thead className="sticky top-0 z-10 border-b border-line bg-sage/30 text-xs uppercase tracking-[0.12em] text-muted">
              <tr>
                <th className="w-12 px-4 py-4 font-bold">
                  <input
                    ref={selectAllRef}
                    className="admin-products-checkbox size-4"
                    type="checkbox"
                    checked={allProductsSelected}
                    onChange={onToggleSelectAll}
                    aria-label="Select all products on this page"
                  />
                </th>
                <th className="px-4 py-4 font-bold">Product</th>
                <th className="px-4 py-4 font-bold">Category</th>
                <th className="px-4 py-4 font-bold">Price / unit</th>
                <th className="px-4 py-4 font-bold">Delivery fee</th>
                <th className="px-4 py-4 font-bold">Stock</th>
                <th className="px-4 py-4 font-bold">Availability</th>
                <th className="px-4 py-4 font-bold">Featured</th>
                <th className="px-4 py-4 font-bold">Created</th>
                <th className="px-4 py-4 font-bold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {products.map((product) => (
                <tr key={product.id} className="group align-middle">
                  <td className="px-4 py-4">
                    <input
                      className="admin-products-checkbox size-4"
                      type="checkbox"
                      checked={selectedProductIds.includes(product.id)}
                      onChange={() => onToggleSelect(product.id)}
                      aria-label={`Select ${product.name}`}
                    />
                  </td>
                  <td className="w-[300px] max-w-[300px] overflow-hidden px-4 py-4">
                    <div className="flex min-w-[260px] max-w-[276px] items-center gap-3">
                      <img className="size-14 rounded-xl object-cover" src={product.image} alt="" />
                      <div className="min-w-0 flex-1"><p className="block min-w-0 truncate font-bold text-green-dark">{product.name}</p><p className="mt-1 block min-w-0 truncate text-xs text-muted">{product.description}</p></div>
                    </div>
                  </td>
                  <td className="max-w-[190px] px-4 py-4 text-muted"><span className="block max-w-[150px] min-w-0 truncate">{product.category}</span></td>
                  <td className="px-4 py-4"><span className="font-bold text-green-dark"><ProductPrice originalPrice={product.price} discountedPrice={product.discountedPrice} discountedClassName="text-green-dark" originalClassName="ml-1 font-normal text-muted" /></span><span className="mt-1 block text-xs text-muted">{product.unit}</span></td>
                  <td className="px-4 py-4 font-bold text-green-dark">{product.deliveryFee === 0 ? 'Free' : formatPrice(product.deliveryFee)}</td>
                  <td className="px-4 py-4 font-bold text-green-dark">{product.stockQuantity ?? 0}</td>
                  <td className="px-4 py-4"><ProductStatusSelect product={product} isBusy={updatingId === product.id} onChange={() => onChangeStatus(product)} /></td>
                  <td className="px-4 py-4"><AvailabilityPill product={product} /></td>
                  <td className="px-4 py-4"><FeaturedStatus isFeatured={product.isFeatured} /></td>
                  <td className="whitespace-nowrap px-4 py-4 text-xs text-muted">{product.createdAt ? formatDate(product.createdAt) : '—'}</td>
                  <td className="px-4 py-4 text-right"><ProductActions product={product} isBusy={updatingId === product.id || deletingId === product.id} onToggleStatus={() => onToggleStatus(product)} onToggleFeatured={() => onToggleFeatured(product)} onDelete={() => onDelete(product)} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </ResponsiveDataTable>
      </div>
    </div>
  )
}

function AvailabilityPill({ product }: { product: AdminProductsPage['products'][number] }) {
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 font-bold ${product.isActive && product.isAvailable ? 'bg-sage text-green' : product.isActive ? 'bg-orange/10 text-orange' : 'bg-line text-muted'}`}>
      {!product.isActive ? 'Inactive' : product.isAvailable ? 'Available' : 'Out of stock'}
    </span>
  )
}

function ProductStatusSelect({
  product,
  isBusy,
  onChange,
}: {
  product: AdminProductsPage['products'][number]
  isBusy: boolean
  onChange: () => void
}) {
  return (
    <label className="inline-flex">
      <span className="sr-only">Status for {product.name}</span>
      <select
        className={`admin-products-status-select ${product.isActive ? 'is-active' : 'is-inactive'}`}
        value={product.isActive ? 'active' : 'inactive'}
        disabled={isBusy}
        onChange={onChange}
        aria-label={`Status for ${product.name}`}
      >
        <option value="active">Active</option>
        <option value="inactive">Inactive</option>
      </select>
    </label>
  )
}