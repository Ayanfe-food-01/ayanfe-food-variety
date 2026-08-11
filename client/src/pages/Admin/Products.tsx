import { useEffect, useState, type FormEvent } from 'react'
import { Link, useLocation, useSearchParams } from 'react-router-dom'
import { ApiError } from '../../services/api'
import {
  getAdminCategories,
  getAdminProducts,
  updateAdminProductStatus,
  type AdminProductsPage,
  type AdminProductsQuery,
} from '../../services/adminService'
import type { Category } from '../../types/category'

const pageSize = 10

const formatPrice = (value: number) =>
  new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(value)

const formatDate = (value: string) =>
  new Intl.DateTimeFormat('en-NG', { dateStyle: 'medium' }).format(new Date(value))

export function Products() {
  const [searchParams, setSearchParams] = useSearchParams()
  const location = useLocation()
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
  const [message, setMessage] = useState<string | null>(() => {
    const state = location.state
    return state && typeof state === 'object' && 'message' in state && typeof state.message === 'string'
      ? state.message
      : null
  })
  const [updatingId, setUpdatingId] = useState<string | null>(null)

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

  const toggleStatus = async (id: string, isActive: boolean) => {
    const action = isActive ? 'deactivate' : 'activate'
    if (!window.confirm(`Are you sure you want to ${action} this product?`)) return
    setUpdatingId(id)
    setMessage(null)
    setError(null)
    try {
      await updateAdminProductStatus(id, !isActive)
      setMessage(`Product ${isActive ? 'deactivated' : 'activated'} successfully.`)
      setQuery((current) => ({ ...current }))
    } catch (caught: unknown) {
      setError(caught instanceof ApiError ? caught.message : 'Product availability could not be updated.')
    } finally {
      setUpdatingId(null)
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
          <p className="mt-3 text-sm text-muted">Manage your catalog, availability, prices, and stock levels.</p>
        </div>
        <Link className="inline-flex w-fit rounded-xl bg-green px-5 py-3 text-sm font-bold text-cream hover:bg-green-dark" to="/admin/products/new">
          Add product
        </Link>
      </div>

      <section className="mt-8 rounded-2xl border border-line bg-white p-4 shadow-sm sm:p-5" aria-label="Product filters">
        <form className="flex flex-col gap-3 lg:flex-row" onSubmit={submitSearch}>
          <label className="flex-1 text-xs font-bold text-green-dark">
            Search products
            <input className="mt-2 w-full rounded-xl border border-line bg-cream px-4 py-3 text-sm font-normal outline-none focus:border-green focus:ring-2 focus:ring-green/10" value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder="Name or description" />
          </label>
          <button className="rounded-xl bg-green px-5 py-3 text-sm font-bold text-cream hover:bg-green-dark lg:self-end" type="submit">Search</button>
          <label className="text-xs font-bold text-green-dark">
            Category
            <select className="mt-2 w-full rounded-xl border border-line bg-cream px-3 py-3 text-sm font-normal outline-none focus:border-green sm:w-44" value={query.categoryId ?? ''} onChange={(event) => updateFilter('categoryId', event.target.value)}>
              <option value="">All categories</option>
              {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
            </select>
          </label>
          <label className="text-xs font-bold text-green-dark">
            Availability
            <select className="mt-2 w-full rounded-xl border border-line bg-cream px-3 py-3 text-sm font-normal outline-none focus:border-green sm:w-44" value={query.availability ?? ''} onChange={(event) => updateFilter('availability', event.target.value)}>
              <option value="">All products</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="out-of-stock">Out of stock</option>
            </select>
          </label>
        </form>
      </section>

      {error && <div className="mt-6 rounded-2xl border border-orange/25 bg-orange/5 p-4 text-sm text-orange" role="alert">{error}</div>}
      {message && <div className="mt-6 rounded-2xl border border-green/25 bg-sage/40 p-4 text-sm font-semibold text-green" role="status">{message}</div>}

      {isLoading ? (
        <div className="mt-8 rounded-2xl border border-line bg-white px-5 py-14 text-center text-sm text-muted">Loading products…</div>
      ) : result?.products.length ? (
        <>
          <div className="mt-5 flex items-center justify-between text-sm text-muted">
            <span>{result.pagination.total} {result.pagination.total === 1 ? 'product' : 'products'}</span>
            <span>Page {currentPage} of {totalPages}</span>
          </div>
          <div className="mt-3 overflow-hidden rounded-2xl border border-line bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left text-sm">
                <thead className="border-b border-line bg-sage/30 text-xs uppercase tracking-[0.12em] text-muted">
                  <tr>
                    <th className="px-4 py-4 font-bold">Product</th>
                    <th className="px-4 py-4 font-bold">Category</th>
                    <th className="px-4 py-4 font-bold">Price / unit</th>
                    <th className="px-4 py-4 font-bold">Stock</th>
                    <th className="px-4 py-4 font-bold">Availability</th>
                    <th className="px-4 py-4 font-bold">Created</th>
                    <th className="px-4 py-4 font-bold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {result.products.map((product) => (
                    <tr key={product.id} className="align-middle">
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <img className="size-14 rounded-xl object-cover" src={product.image} alt="" />
                          <div><p className="font-bold text-green-dark">{product.name}</p><p className="mt-1 max-w-[210px] truncate text-xs text-muted">{product.description}</p></div>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-muted">{product.category}</td>
                      <td className="px-4 py-4"><span className="font-bold text-green-dark">{formatPrice(product.price)}</span><span className="mt-1 block text-xs text-muted">{product.unit}</span></td>
                      <td className="px-4 py-4 font-bold text-green-dark">{product.stockQuantity ?? 0}</td>
                      <td className="px-4 py-4">
                        <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${product.isActive && product.isAvailable ? 'bg-sage text-green' : product.isActive ? 'bg-orange/10 text-orange' : 'bg-line text-muted'}`}>
                          {!product.isActive ? 'Inactive' : product.isAvailable ? 'Available' : 'Out of stock'}
                        </span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-xs text-muted">{product.createdAt ? formatDate(product.createdAt) : '—'}</td>
                      <td className="px-4 py-4">
                        <div className="flex flex-wrap gap-2 text-xs font-bold">
                          <Link className="text-green hover:text-orange" to={`/admin/products/${product.id}`}>View</Link>
                          <Link className="text-green hover:text-orange" to={`/admin/products/${product.id}/edit`}>Edit</Link>
                          <button className="text-orange disabled:opacity-50" type="button" disabled={updatingId === product.id} onClick={() => void toggleStatus(product.id, product.isActive)}>{product.isActive ? 'Deactivate' : 'Activate'}</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
    </>
  )
}