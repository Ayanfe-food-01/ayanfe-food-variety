import { useEffect, useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useToast } from '../../components/ui/Toast'
import { ApiError } from '../../services/api'
import {
  deleteAdminCategory,
  getAdminCategories,
  type AdminCategoriesPage,
  type AdminCategoriesQuery,
  updateAdminCategoryStatus,
} from '../../services/adminService'
import type { Category } from '../../types/category'

const pageSize = 10
const formatDate = (value?: string) => value
  ? new Intl.DateTimeFormat('en-NG', { dateStyle: 'medium' }).format(new Date(value))
  : '—'

export function Categories() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { showToast } = useToast()
  const [searchInput, setSearchInput] = useState(searchParams.get('search') ?? '')
  const [result, setResult] = useState<AdminCategoriesPage | null>(null)
  const [query, setQuery] = useState<AdminCategoriesQuery>({
    page: Number(searchParams.get('page') ?? 1),
    pageSize,
    search: searchParams.get('search') ?? undefined,
    status: (searchParams.get('status') as AdminCategoriesQuery['status']) || undefined,
  })
  const [isLoading, setIsLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let current = true
    const timeoutId = window.setTimeout(() => {
      setIsLoading(true)
      setError(null)
      getAdminCategories(query)
        .then((loaded) => {
          if (current && !Array.isArray(loaded)) setResult(loaded)
        })
        .catch((caught: unknown) => {
          if (current) setError(caught instanceof ApiError ? caught.message : 'Categories could not be loaded.')
        })
        .finally(() => {
          if (current) setIsLoading(false)
        })
    }, 0)
    const nextParams = new URLSearchParams()
    if (query.page > 1) nextParams.set('page', String(query.page))
    if (query.search) nextParams.set('search', query.search)
    if (query.status) nextParams.set('status', query.status)
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

  const toggleStatus = async (category: Category) => {
    const action = category.isActive ? 'deactivate' : 'activate'
    if (!window.confirm(`Are you sure you want to ${action} “${category.name}”? Existing products will remain unchanged.`)) return
    setBusyId(category.id)
    setError(null)
    try {
      const updated = await updateAdminCategoryStatus(category.id, !category.isActive)
      showToast(`Category ${updated.isActive ? 'activated' : 'deactivated'} successfully.`, 'success')
      setQuery((current) => ({ ...current }))
    } catch (caught: unknown) {
      showToast(caught instanceof ApiError ? caught.message : 'Category status could not be updated.', 'error')
    } finally {
      setBusyId(null)
    }
  }

  const deleteCategory = async (category: Category) => {
    if (!window.confirm(`Delete “${category.name}”? This is only allowed when the category has no products.`)) return
    setBusyId(category.id)
    setError(null)
    try {
      await deleteAdminCategory(category.id)
      showToast('Category deleted successfully.', 'success')
      setQuery((current) => ({ ...current, page: Math.min(current.page, result?.pagination.totalPages ?? 1) }))
    } catch (caught: unknown) {
      showToast(caught instanceof ApiError ? caught.message : 'Category could not be deleted.', 'error')
    } finally {
      setBusyId(null)
    }
  }

  const categories = result?.categories ?? []
  const currentPage = result?.pagination.page ?? query.page
  const totalPages = result?.pagination.totalPages ?? 1

  return (
    <>
      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-orange">Catalog</p>
          <h1 className="mt-2 text-4xl font-bold tracking-[-0.05em] text-green-dark sm:text-5xl">Categories</h1>
          <p className="mt-3 text-sm text-muted">Create and control the categories available to your product catalog.</p>
        </div>
        <Link className="inline-flex w-fit rounded-xl bg-green px-5 py-3 text-sm font-bold text-cream hover:bg-green-dark" to="/admin/categories/new">Add category</Link>
      </div>

      <section className="mt-8 rounded-2xl border border-line bg-white p-4 shadow-sm sm:p-5" aria-label="Category filters">
        <form className="flex flex-col gap-3 sm:flex-row sm:items-end" onSubmit={submitSearch}>
          <label className="flex-1 text-xs font-bold text-green-dark">
            Search categories
            <input className="mt-2 w-full rounded-xl border border-line bg-cream px-4 py-3 text-sm font-normal outline-none focus:border-green focus:ring-2 focus:ring-green/10" value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder="Name, description, or slug" />
          </label>
          <button className="rounded-xl bg-green px-5 py-3 text-sm font-bold text-cream hover:bg-green-dark" type="submit">Search</button>
          <label className="text-xs font-bold text-green-dark">
            Status
            <select className="mt-2 w-full rounded-xl border border-line bg-cream px-3 py-3 text-sm font-normal outline-none focus:border-green sm:w-40" value={query.status ?? ''} onChange={(event) => setQuery((current) => ({ ...current, status: (event.target.value || undefined) as AdminCategoriesQuery['status'], page: 1 }))}>
              <option value="">All categories</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </label>
        </form>
      </section>

      {error && <div className="mt-6 rounded-2xl border border-orange/25 bg-orange/5 p-4 text-sm text-orange" role="alert">{error}</div>}
      {isLoading ? (
        <div className="mt-8 rounded-2xl border border-line bg-white px-5 py-14 text-center text-sm text-muted">Loading categories…</div>
      ) : categories.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-green/25 bg-sage/25 px-6 py-16 text-center">
          <h2 className="text-xl font-bold text-green-dark">No categories yet</h2>
          <p className="mt-2 text-sm text-muted">Create your first category to start organizing products.</p>
          <Link className="mt-5 inline-flex rounded-xl bg-green px-5 py-3 text-sm font-bold text-cream" to="/admin/categories/new">Add category</Link>
        </div>
      ) : (
        <div className="mt-8 overflow-hidden rounded-2xl border border-line bg-white shadow-sm">
          <div className="mb-4 flex items-center justify-between px-5 pt-5 text-sm text-muted">
            <span>{result?.pagination.total ?? 0} {result?.pagination.total === 1 ? 'category' : 'categories'}</span>
            <span>Page {currentPage} of {totalPages}</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px] text-left text-sm">
              <thead className="border-b border-line bg-sage/30 text-xs uppercase tracking-[0.12em] text-muted">
                <tr><th className="px-5 py-4 font-bold">Category</th><th className="px-5 py-4 font-bold">Products</th><th className="px-5 py-4 font-bold">Status</th><th className="px-5 py-4 font-bold">Created</th><th className="px-5 py-4 font-bold">Updated</th><th className="px-5 py-4 font-bold">Actions</th></tr>
              </thead>
              <tbody className="divide-y divide-line">
                {categories.map((category) => (
                  <tr key={category.id}>
                    <td className="px-5 py-4"><p className="font-bold text-green-dark">{category.name}</p><p className="mt-1 max-w-md truncate text-xs text-muted">{category.description || 'No description'}</p><p className="mt-1 text-xs text-muted">{category.slug}</p></td>
                    <td className="px-5 py-4 text-muted">{category.productCount ?? 0}</td>
                    <td className="px-5 py-4"><span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${category.isActive ? 'bg-sage text-green' : 'bg-line text-muted'}`}>{category.isActive ? 'Active' : 'Inactive'}</span></td>
                    <td className="px-5 py-4 whitespace-nowrap text-xs text-muted">{formatDate(category.createdAt)}</td>
                    <td className="px-5 py-4 whitespace-nowrap text-xs text-muted">{formatDate(category.updatedAt)}</td>
                    <td className="px-5 py-4"><div className="flex flex-wrap gap-3 text-xs font-bold"><Link className="text-green hover:text-orange" to={`/admin/categories/${category.id}/edit`}>Edit</Link><button className="text-orange disabled:opacity-50" type="button" disabled={busyId === category.id} onClick={() => void toggleStatus(category)}>{category.isActive ? 'Deactivate' : 'Activate'}</button><button className="text-muted hover:text-orange disabled:opacity-50" type="button" disabled={busyId === category.id} title={(category.productCount ?? 0) > 0 ? 'This category has products; the server will recommend deactivation.' : 'Delete category'} onClick={() => void deleteCategory(category)}>Delete</button></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && <div className="flex items-center justify-between gap-4 border-t border-line px-5 py-4"><button className="rounded-xl border border-line bg-white px-4 py-2.5 text-sm font-bold text-green-dark disabled:cursor-not-allowed disabled:opacity-40" type="button" disabled={currentPage <= 1} onClick={() => setQuery((current) => ({ ...current, page: currentPage - 1 }))}>Previous</button><span className="text-xs font-bold text-muted">{currentPage} / {totalPages}</span><button className="rounded-xl border border-line bg-white px-4 py-2.5 text-sm font-bold text-green-dark disabled:cursor-not-allowed disabled:opacity-40" type="button" disabled={currentPage >= totalPages} onClick={() => setQuery((current) => ({ ...current, page: currentPage + 1 }))}>Next</button></div>}
        </div>
      )}
    </>
  )
}