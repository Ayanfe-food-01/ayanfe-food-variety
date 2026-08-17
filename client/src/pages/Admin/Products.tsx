import { useEffect, useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ActionMenu, ActionMenuButton, ActionMenuLink } from '../../components/admin/ActionMenu'
import { FeaturedStatus, getFeaturedActionLabel } from '../../components/admin/FeaturedStatus'
import { useToast } from '../../components/ui/Toast'
import { SelectField } from '../../components/ui/SelectField'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { ApiError } from '../../services/api'
import {
  getAdminCategories,
  getAdminProducts,
  deleteAdminProduct,
  updateAdminProductFeatured,
  updateAdminProductStatus,
  type AdminProductsPage,
  type AdminProductsQuery,
} from '../../services/adminService'
import type { Category } from '../../types/category'
import { ProductPrice } from '../../components/products/ProductPrice'
import { ResponsiveDataTable } from '../../components/ui/ResponsiveDataTable'
import { formatPrice } from '../../utils/formatPrice'
import { formatDate as formatCompatibleDate } from '../../utils/dateFormat'

const pageSize = 10

const formatDate = (value: string) =>
  formatCompatibleDate(value)

interface ProductActionsProps {
  product: AdminProductsPage['products'][number]
  isBusy: boolean
  onToggleStatus: () => void
  onToggleFeatured: () => void
  onDelete: () => void
}

function ProductActions({ product, isBusy, onToggleStatus, onToggleFeatured, onDelete }: ProductActionsProps) {
  return (
    <ActionMenu ariaLabel={`Actions for ${product.name}`} isBusy={isBusy} fixedPosition>
      {(close) => (
        <>
          <ActionMenuLink to={`/admin/products/${product.id}`} onClick={close}>View</ActionMenuLink>
          <ActionMenuLink to={`/admin/products/${product.id}/edit`} onClick={close}>Edit</ActionMenuLink>
          <ActionMenuButton tone="accent" onClick={() => { close(); onToggleStatus() }}>{product.isActive ? 'Deactivate' : 'Activate'}</ActionMenuButton>
           <ActionMenuButton onClick={() => { close(); onToggleFeatured() }}>{getFeaturedActionLabel(product.isFeatured)}</ActionMenuButton>
          <ActionMenuButton tone="danger" onClick={() => { close(); onDelete() }}>Delete</ActionMenuButton>
        </>
      )}
    </ActionMenu>
  )
}

export function Products() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { showToast } = useToast()
  const [searchInput, setSearchInput] = useState(searchParams.get('search') ?? '')
  const [categories, setCategories] = useState<Category[]>([])
  const [result, setResult] = useState<AdminProductsPage | null>(null)
  const [query, setQuery] = useState<AdminProductsQuery>({
    page: Number(searchParams.get('page') ?? 1),
    pageSize,
    search: searchParams.get('search') ?? undefined,
    categoryId: searchParams.get('categoryId') ?? undefined,
    availability: (searchParams.get('availability') as AdminProductsQuery['availability']) || undefined,
  })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [productToStatus, setProductToStatus] = useState<AdminProductsPage['products'][number] | null>(null)
  const [productToDelete, setProductToDelete] = useState<AdminProductsPage['products'][number] | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    getAdminCategories().then(setCategories).catch(() => undefined)
  }, [])

  useEffect(() => {
    let current = true
    const timeoutId = window.setTimeout(() => {
      setIsLoading(true)
      setError(null)
      getAdminProducts(query)
        .then((page) => {
          if (current) setResult(page)
        })
        .catch((caught: unknown) => {
          if (current) setError(caught instanceof ApiError ? caught.message : 'Products could not be loaded.')
        })
        .finally(() => {
          if (current) setIsLoading(false)
        })
    }, 0)
    const nextParams = new URLSearchParams()
    if (query.page > 1) nextParams.set('page', String(query.page))
    if (query.search) nextParams.set('search', query.search)
    if (query.categoryId) nextParams.set('categoryId', query.categoryId)
    if (query.availability) nextParams.set('availability', query.availability)
    setSearchParams(nextParams, { replace: true })
    return () => {
      current = false
      window.clearTimeout(timeoutId)
    }
  }, [query, setSearchParams])

  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setQuery((current) => ({ ...current, search: searchInput.trim() || undefined, page: 1 }))
  }

  const updateFilter = (key: 'categoryId' | 'availability', value: string) => {
    setQuery((current) => ({ ...current, [key]: value || undefined, page: 1 }))
  }

  const requestStatusChange = (product: AdminProductsPage['products'][number]) => {
    setProductToStatus(product)
  }

  const confirmStatusChange = async () => {
    if (!productToStatus) return
    const product = productToStatus
    setUpdatingId(product.id)
    setError(null)
    try {
      await updateAdminProductStatus(product.id, !product.isActive)
      setProductToStatus(null)
      showToast(`Product ${product.isActive ? 'deactivated' : 'activated'} successfully.`, 'success')
      setQuery((current) => ({ ...current }))
    } catch (caught: unknown) {
      showToast(caught instanceof ApiError ? caught.message : 'Product availability could not be updated.', 'error')
    } finally {
      setUpdatingId(null)
    }
  }

  const toggleFeatured = async (id: string, isFeatured: boolean) => {
    setUpdatingId(id)
    setError(null)
    try {
      await updateAdminProductFeatured(id, !isFeatured)
      showToast(`Product ${isFeatured ? 'removed from' : 'marked as'} featured.`, 'success')
      setQuery((current) => ({ ...current }))
    } catch (caught: unknown) {
      showToast(caught instanceof ApiError ? caught.message : 'Featured status could not be updated.', 'error')
    } finally {
      setUpdatingId(null)
    }
  }

  const openDeleteConfirmation = (product: AdminProductsPage['products'][number]) => {
    setDeleteError(null)
    setProductToDelete(product)
  }

  const confirmDelete = async () => {
    if (!productToDelete) return
    const product = productToDelete
    setDeletingId(product.id)
    setDeleteError(null)
    try {
      await deleteAdminProduct(product.id)
      setResult((current) => {
        if (!current) return current
        return {
          ...current,
          products: current.products.filter((item) => item.id !== product.id),
          pagination: {
            ...current.pagination,
            total: Math.max(0, current.pagination.total - 1),
            totalPages: Math.max(1, Math.ceil(Math.max(0, current.pagination.total - 1) / pageSize)),
          },
        }
      })
      const nextTotal = Math.max(0, (result?.pagination.total ?? 1) - 1)
      const nextTotalPages = Math.max(1, Math.ceil(nextTotal / pageSize))
      setQuery((current) => ({ ...current, page: Math.min(current.page, nextTotalPages) }))
      setProductToDelete(null)
      showToast('Product deleted permanently.', 'success')
    } catch (caught: unknown) {
      setDeleteError(caught instanceof ApiError ? caught.message : 'Product could not be deleted.')
    } finally {
      setDeletingId(null)
    }
  }

  const currentPage = result?.pagination.page ?? query.page
  const totalPages = result?.pagination.totalPages ?? 1

  return (
    <>
      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-orange">Store operations</p>
          <h1 className="mt-2 text-4xl font-bold tracking-[-0.05em] text-green-dark sm:text-5xl">Products & inventory</h1>
          <p className="mt-3 max-w-2xl text-sm text-muted">Manage your catalog, availability, prices, and stock levels. Deactivate products to preserve history; permanent deletion is only available when no protected records exist.</p>
        </div>
        <Link className="inline-flex w-fit rounded-xl bg-green px-5 py-3 text-sm font-bold text-cream hover:bg-green-dark" to="/admin/products/new">
          Add product
        </Link>
      </div>

      <section className="mt-8 rounded-2xl border border-line bg-white p-4 shadow-sm sm:p-5" aria-label="Product filters">
        <form className="flex flex-row items-end gap-3" onSubmit={submitSearch}>
          <label className="min-w-0 flex-1 text-xs font-bold text-green-dark">
            Search products
            <input className="mt-2 w-full rounded-xl border border-line bg-cream px-4 py-3 text-sm font-normal outline-none focus:border-green focus:ring-2 focus:ring-green/10" value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder="Name or description" />
          </label>
          <button className="shrink-0 rounded-xl bg-green px-5 py-3 text-sm font-bold text-cream hover:bg-green-dark" type="submit">Search</button>
          <label className="min-w-0 flex-1 text-xs font-bold text-green-dark">
            Category
            <SelectField
              className="mt-2 w-full"
              options={[
                { value: '', label: 'All categories' },
                ...categories.map((category) => ({ value: category.id, label: category.name })),
              ]}
              onChange={(value) => updateFilter('categoryId', value)}
              value={query.categoryId ?? ''}
            />
          </label>
          <label className="min-w-0 flex-1 text-xs font-bold text-green-dark">
            Availability
            <SelectField
              className="mt-2 w-full"
              options={[
                { value: '', label: 'All products' },
                { value: 'active', label: 'Active' },
                { value: 'inactive', label: 'Inactive' },
                { value: 'out-of-stock', label: 'Out of stock' },
              ]}
              onChange={(value) => updateFilter('availability', value)}
              value={query.availability ?? ''}
            />
          </label>
        </form>
      </section>

      {error && <div className="mt-6 rounded-2xl border border-orange/25 bg-orange/5 p-4 text-sm text-orange" role="alert">{error}</div>}
      {isLoading ? (
        <div className="mt-8 rounded-2xl border border-line bg-white px-5 py-14 text-center text-sm text-muted">Loading products…</div>
      ) : result?.products.length ? (
        <>
          <div className="mt-5 flex items-center justify-between text-sm text-muted">
            <span>{result.pagination.total} {result.pagination.total === 1 ? 'product' : 'products'}</span>
            <span>Page {currentPage} of {totalPages}</span>
          </div>
           <div className="mt-3 overflow-hidden rounded-2xl border border-line bg-white shadow-sm">
              <div className="space-y-3 p-4 lg:hidden">
               {result.products.map((product) => (
                 <article className="rounded-2xl border border-line bg-cream/45 p-4" key={product.id}>
                   <div className="flex items-start gap-3">
                     <img className="size-16 shrink-0 rounded-xl object-cover" src={product.image} alt="" />
                     <div className="min-w-0 flex-1">
                       <p className="font-bold text-green-dark">{product.name}</p>
                       <p className="mt-1 break-words text-xs text-muted">{product.description}</p>
                       <p className="mt-1 text-xs text-muted">{product.category}</p>
                     </div>
                   </div>
                   <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-line pt-3 text-xs">
                     <div>
                       <dt className="uppercase tracking-[0.12em] text-muted">Price / unit</dt>
                        <dd className="mt-1 font-bold text-green-dark"><ProductPrice originalPrice={product.price} discountedPrice={product.discountedPrice} discountedClassName="text-green-dark" originalClassName="ml-1 font-normal text-muted" /> <span className="font-normal text-muted">/ {product.unit}</span></dd>
                     </div>
                     <div>
                       <dt className="uppercase tracking-[0.12em] text-muted">Stock</dt>
                       <dd className="mt-1 font-bold text-green-dark">{product.stockQuantity ?? 0}</dd>
                     </div>
                      <div>
                        <dt className="uppercase tracking-[0.12em] text-muted">Delivery fee</dt>
                        <dd className="mt-1 font-bold text-green-dark">{product.deliveryFee === 0 ? 'Free' : formatPrice(product.deliveryFee)}</dd>
                      </div>
                     <div>
                       <dt className="uppercase tracking-[0.12em] text-muted">Availability</dt>
                       <dd className="mt-1">
                         <span className={`inline-flex rounded-full px-2.5 py-1 font-bold ${product.isActive && product.isAvailable ? 'bg-sage text-green' : product.isActive ? 'bg-orange/10 text-orange' : 'bg-line text-muted'}`}>
                           {!product.isActive ? 'Inactive' : product.isAvailable ? 'Available' : 'Out of stock'}
                         </span>
                       </dd>
                     </div>
                      <div>
                        <dt className="uppercase tracking-[0.12em] text-muted">Featured</dt>
                        <dd className="mt-1">
                           <FeaturedStatus isFeatured={product.isFeatured} />
                        </dd>
                      </div>
                     <div>
                       <dt className="uppercase tracking-[0.12em] text-muted">Created</dt>
                       <dd className="mt-1 text-muted">{product.createdAt ? formatDate(product.createdAt) : '—'}</dd>
                     </div>
                   </dl>
                    <div className="mt-4 flex justify-end border-t border-line pt-3">
                      <ProductActions
                        product={product}
                        isBusy={updatingId === product.id || deletingId === product.id}
                        onToggleStatus={() => requestStatusChange(product)}
                        onToggleFeatured={() => void toggleFeatured(product.id, product.isFeatured)}
                        onDelete={() => openDeleteConfirmation(product)}
                      />
                   </div>
                 </article>
               ))}
             </div>
              <div className="hidden lg:block">
               <ResponsiveDataTable label="Products table horizontal scroll">
              <table className="w-full min-w-[900px] text-left text-sm">
                 <thead className="sticky top-0 z-10 border-b border-line bg-sage/30 text-xs uppercase tracking-[0.12em] text-muted">
                  <tr>
                     <th className="sticky left-0 z-30 border-r border-line bg-sage/30 px-4 py-4 font-bold shadow-[4px_0_8px_-6px_rgba(32,60,36,0.35)]">Product</th>
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
                  {result.products.map((product) => (
                     <tr key={product.id} className="group align-middle">
                       <td className="sticky left-0 z-10 border-r border-line bg-white px-4 py-4 shadow-[4px_0_8px_-6px_rgba(32,60,36,0.35)] group-hover:bg-cream/60">
                         <div className="flex min-w-0 items-center gap-3">
                          <img className="size-14 rounded-xl object-cover" src={product.image} alt="" />
                           <div className="min-w-0 flex-1"><p className="break-words font-bold text-green-dark">{product.name}</p><p className="mt-1 max-w-[210px] truncate text-xs text-muted">{product.description}</p></div>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-muted">{product.category}</td>
                      <td className="px-4 py-4"><span className="font-bold text-green-dark"><ProductPrice originalPrice={product.price} discountedPrice={product.discountedPrice} discountedClassName="text-green-dark" originalClassName="ml-1 font-normal text-muted" /></span><span className="mt-1 block text-xs text-muted">{product.unit}</span></td>
                       <td className="px-4 py-4 font-bold text-green-dark">{product.deliveryFee === 0 ? 'Free' : formatPrice(product.deliveryFee)}</td>
                      <td className="px-4 py-4 font-bold text-green-dark">{product.stockQuantity ?? 0}</td>
                      <td className="px-4 py-4">
                        <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${product.isActive && product.isAvailable ? 'bg-sage text-green' : product.isActive ? 'bg-orange/10 text-orange' : 'bg-line text-muted'}`}>
                          {!product.isActive ? 'Inactive' : product.isAvailable ? 'Available' : 'Out of stock'}
                        </span>
                      </td>
                       <td className="px-4 py-4">
                          <FeaturedStatus isFeatured={product.isFeatured} />
                       </td>
                      <td className="px-4 py-4 whitespace-nowrap text-xs text-muted">{product.createdAt ? formatDate(product.createdAt) : '—'}</td>
                       <td className="px-4 py-4 text-right">
                         <ProductActions
                           product={product}
                           isBusy={updatingId === product.id || deletingId === product.id}
                            onToggleStatus={() => requestStatusChange(product)}
                           onToggleFeatured={() => void toggleFeatured(product.id, product.isFeatured)}
                           onDelete={() => openDeleteConfirmation(product)}
                         />
                       </td>
                    </tr>
                  ))}
                </tbody>
              </table>
               </ResponsiveDataTable>
            </div>
          </div>
          {totalPages > 1 && <div className="mt-5 flex items-center justify-between gap-4"><button className="rounded-xl border border-line bg-white px-4 py-2.5 text-sm font-bold text-green-dark disabled:cursor-not-allowed disabled:opacity-40" type="button" disabled={currentPage <= 1} onClick={() => setQuery((current) => ({ ...current, page: currentPage - 1 }))}>Previous</button><span className="text-xs font-bold text-muted">{currentPage} / {totalPages}</span><button className="rounded-xl border border-line bg-white px-4 py-2.5 text-sm font-bold text-green-dark disabled:cursor-not-allowed disabled:opacity-40" type="button" disabled={currentPage >= totalPages} onClick={() => setQuery((current) => ({ ...current, page: currentPage + 1 }))}>Next</button></div>}
        </>
      ) : (
        <div className="mt-8 rounded-2xl border border-dashed border-green/25 bg-sage/25 px-6 py-16 text-center">
          <h2 className="text-xl font-bold text-green-dark">No products found</h2>
          <p className="mt-2 text-sm text-muted">Try a different filter or add your first product.</p>
          <Link className="mt-5 inline-flex rounded-xl bg-green px-5 py-3 text-sm font-bold text-cream" to="/admin/products/new">Add product</Link>
        </div>
      )}
      {productToStatus && (
        <ConfirmDialog
          eyebrow="Change product availability"
          title={`${productToStatus.isActive ? 'Deactivate' : 'Activate'} “${productToStatus.name}”?`}
          description={productToStatus.isActive ? 'This hides the product from customer shopping and prevents it from being selected for new orders.' : 'This makes the product available for customer shopping again when it has stock.'}
          isBusy={updatingId === productToStatus.id}
          confirmLabel={productToStatus.isActive ? 'Deactivate product' : 'Activate product'}
          busyLabel="Updating…"
          onCancel={() => setProductToStatus(null)}
          onConfirm={() => void confirmStatusChange()}
        />
      )}
      {productToDelete && (
        <ConfirmDialog
          eyebrow="Permanent deletion"
          title={`Delete “${productToDelete.name}”?`}
          description="This permanently removes the product from the catalog. This action cannot be undone. Products with order or inventory history must be deactivated instead."
          error={deleteError}
          isBusy={deletingId === productToDelete.id}
          confirmLabel="Delete permanently"
          busyLabel="Deleting…"
          onCancel={() => setProductToDelete(null)}
          onConfirm={() => void confirmDelete()}
        />
      )}
    </>
  )
}