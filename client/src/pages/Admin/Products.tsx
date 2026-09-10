import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useToast } from '../../components/ui/Toast'
import { ProductsFilterPanel } from '../../components/admin/ProductsFilterPanel'
import { ProductsTable } from '../../components/admin/ProductsTable'
import { AdminPagination } from '../../components/admin/AdminPagination'
import { AdminTableSkeleton } from '../../components/admin/AdminTableSkeleton'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { useInitialRouteLoad } from '../../hooks/useInitialRouteLoad'
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

const pageSize = 10

const readCategoryIds = (params: URLSearchParams): string[] | undefined => {
  const categoryIds = params.get('categoryIds')?.split(',').filter(Boolean)
  if (categoryIds?.length) return categoryIds
  const legacyCategoryId = params.get('categoryId')
  return legacyCategoryId ? [legacyCategoryId] : undefined
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
    categoryIds: readCategoryIds(searchParams),
    categoryId: searchParams.get('categoryId') ?? undefined,
    availability: (searchParams.get('availability') as AdminProductsQuery['availability']) || undefined,
    stockStatus: (searchParams.get('stockStatus') as AdminProductsQuery['stockStatus']) || undefined,
    featured: (searchParams.get('featured') as AdminProductsQuery['featured']) || undefined,
    discount: (searchParams.get('discount') as AdminProductsQuery['discount']) || undefined,
    productType: (searchParams.get('productType') as AdminProductsQuery['productType']) || undefined,
    wholesale: (searchParams.get('wholesale') as AdminProductsQuery['wholesale']) || undefined,
    minPrice: searchParams.get('minPrice') ?? undefined,
    maxPrice: searchParams.get('maxPrice') ?? undefined,
    sort: (searchParams.get('sort') as AdminProductsQuery['sort']) || 'newest',
  })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([])

  useInitialRouteLoad(!isLoading)
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
          if (current) {
            setResult(page)
            setSelectedProductIds((selected) => selected.filter((id) => page.products.some((product) => product.id === id)))
          }
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
    if (query.categoryIds?.length) nextParams.set('categoryIds', query.categoryIds.join(','))
    else if (query.categoryId) nextParams.set('categoryId', query.categoryId)
    if (query.availability) nextParams.set('availability', query.availability)
    if (query.stockStatus) nextParams.set('stockStatus', query.stockStatus)
    if (query.featured) nextParams.set('featured', query.featured)
    if (query.discount) nextParams.set('discount', query.discount)
    if (query.productType) nextParams.set('productType', query.productType)
    if (query.wholesale) nextParams.set('wholesale', query.wholesale)
    if (query.minPrice) nextParams.set('minPrice', query.minPrice)
    if (query.maxPrice) nextParams.set('maxPrice', query.maxPrice)
    if (query.sort && query.sort !== 'newest') nextParams.set('sort', query.sort)
    setSearchParams(nextParams, { replace: true })
    return () => {
      current = false
      window.clearTimeout(timeoutId)
    }
  }, [query, setSearchParams])

  const updateSearch = (value: string) => {
    setQuery((current) => ({ ...current, search: value.trim() || undefined, page: 1 }))
  }

  const applyFilters = (next: Partial<AdminProductsQuery>) => {
    setQuery((current) => ({
      ...current,
      ...next,
      page: 1,
    }))
  }

  const requestStatusChange = (product: AdminProductsPage['products'][number]) => {
    setProductToStatus(product)
  }

  const toggleProductSelection = (productId: string) => {
    setSelectedProductIds((current) => current.includes(productId)
      ? current.filter((id) => id !== productId)
      : [...current, productId])
  }

  const toggleAllProductSelection = () => {
    const pageProductIds = result?.products.map((product) => product.id) ?? []
    const allSelected = pageProductIds.length > 0 && pageProductIds.every((id) => selectedProductIds.includes(id))
    setSelectedProductIds((current) => allSelected
      ? current.filter((id) => !pageProductIds.includes(id))
      : Array.from(new Set([...current, ...pageProductIds])))
  }

  const clearProductSelection = () => setSelectedProductIds([])

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
      setSelectedProductIds((current) => current.filter((id) => id !== product.id))
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
  const pageProducts = result?.products ?? []
  const allPageProductsSelected = pageProducts.length > 0 && pageProducts.every((product) => selectedProductIds.includes(product.id))
  const somePageProductsSelected = pageProducts.some((product) => selectedProductIds.includes(product.id))

  return (
    <div className="admin-products-page">
      <div className="admin-products-page-header flex min-w-0 flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-orange">Store operations</p>
          <h1 className="mt-2 text-4xl font-bold tracking-[-0.05em] text-green-dark sm:text-5xl">Products & inventory</h1>
          <p className="mt-3 max-w-2xl text-sm text-muted">Manage your catalog, availability, prices, and stock levels. Deactivate products to preserve history; permanent deletion is only available when no protected records exist.</p>
        </div>
        <Link className="admin-products-add-button inline-flex shrink-0 rounded-xl bg-green px-5 py-3 text-sm font-bold text-cream hover:bg-green-dark" to="/admin/products/new">
          Add product
        </Link>
      </div>

      {error && <div className="mt-6 rounded-2xl border border-orange/25 bg-orange/5 p-4 text-sm text-orange" role="alert">{error}</div>}
      <section className="mt-8 rounded-2xl border border-line bg-white p-4 shadow-sm sm:p-5" aria-label="Product filters">
        <ProductsFilterPanel
          categories={categories}
          query={query}
          searchInput={searchInput}
          onSearchInputChange={setSearchInput}
          onSearch={updateSearch}
          onApply={applyFilters}
          onSortChange={(sort) => setQuery((current) => ({ ...current, sort, page: 1 }))}
        />
      </section>
      <section className="admin-products-workspace mt-6 rounded-2xl border border-line bg-white shadow-sm" aria-label="Products">
        {selectedProductIds.length > 0 && (
          <div className="admin-products-selection-toolbar flex items-center justify-between gap-4 border-b border-line bg-sage/20 px-4 py-3 text-sm sm:px-5">
            <span className="font-bold text-green-dark" role="status">
              {selectedProductIds.length} product{selectedProductIds.length === 1 ? '' : 's'} selected
            </span>
            <button className="shrink-0 rounded-lg px-3 py-2 text-xs font-bold text-green-dark hover:bg-sage" type="button" onClick={clearProductSelection}>
              Clear selection
            </button>
          </div>
        )}

        {isLoading ? (
          <AdminTableSkeleton desktopColumns={9} label="Loading products" />
        ) : result?.products.length ? (
          <>
            <div className="mb-4 flex items-center justify-between px-5 pt-5 text-sm text-muted">
              <span>{result.pagination.total} {result.pagination.total === 1 ? 'product' : 'products'}</span>
              <span>Page {currentPage} of {totalPages}</span>
            </div>
            <ProductsTable
              products={result.products}
              updatingId={updatingId}
              deletingId={deletingId}
              selectedProductIds={selectedProductIds}
              allProductsSelected={allPageProductsSelected}
              someProductsSelected={somePageProductsSelected}
              onToggleSelectAll={toggleAllProductSelection}
              onToggleSelect={toggleProductSelection}
              onToggleStatus={requestStatusChange}
              onChangeStatus={requestStatusChange}
              onToggleFeatured={(product) => void toggleFeatured(product.id, product.isFeatured)}
              onDelete={openDeleteConfirmation}
            />
            {totalPages > 1 && (
              <AdminPagination
                className="border-t border-line px-5 py-4"
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={(page) => setQuery((current) => ({ ...current, page }))}
              />
            )}
          </>
        ) : (
          <div className="admin-products-empty rounded-2xl border border-dashed border-green/25 bg-sage/25 px-6 py-16 text-center">
            <h2 className="text-xl font-bold text-green-dark">No products found</h2>
            <p className="mt-2 text-sm text-muted">Try a different filter or add your first product.</p>
            <Link className="mt-5 inline-flex rounded-xl bg-green px-5 py-3 text-sm font-bold text-cream" to="/admin/products/new">Add product</Link>
          </div>
        )}
      </section>
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
    </div>
  )
}