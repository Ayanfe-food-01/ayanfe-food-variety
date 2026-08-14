import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { MoreHorizontalIcon } from '../../assets/icons'
import { useToast } from '../../components/ui/Toast'
import { SelectField } from '../../components/ui/SelectField'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
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

interface CategoryActionsProps {
  category: Category
  isBusy: boolean
  onToggleStatus: () => void
  onDelete: () => void
}

function CategoryActions({ category, isBusy, onToggleStatus, onDelete }: CategoryActionsProps) {
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isOpen) return

    const closeOnOutsideClick = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) setIsOpen(false)
    }
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false)
    }
    document.addEventListener('mousedown', closeOnOutsideClick)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('mousedown', closeOnOutsideClick)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [isOpen])

  const runAction = (action: () => void) => {
    setIsOpen(false)
    action()
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        className="grid size-9 place-items-center rounded-full border border-line bg-white text-muted transition-colors hover:border-green/30 hover:bg-sage/40 hover:text-green-dark disabled:cursor-wait disabled:opacity-50"
        type="button"
        aria-label={`Actions for ${category.name}`}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        disabled={isBusy}
        onClick={() => setIsOpen((current) => !current)}
      >
        <MoreHorizontalIcon size={20} />
      </button>
      {isOpen && (
        <div className="absolute right-0 top-11 z-30 min-w-40 overflow-hidden rounded-xl border border-line bg-white p-1.5 text-left shadow-xl shadow-green-dark/10" role="menu">
          <Link
            className="block rounded-lg px-3 py-2 text-sm font-semibold text-green-dark transition-colors hover:bg-sage/50"
            role="menuitem"
            to={`/admin/categories/${category.id}/edit`}
            onClick={() => setIsOpen(false)}
          >
            Edit
          </Link>
          <button
            className="block w-full rounded-lg px-3 py-2 text-left text-sm font-semibold text-orange transition-colors hover:bg-orange/10"
            type="button"
            role="menuitem"
            onClick={() => runAction(onToggleStatus)}
          >
            {category.isActive ? 'Deactivate' : 'Activate'}
          </button>
          <button
            className="block w-full rounded-lg px-3 py-2 text-left text-sm font-semibold text-muted transition-colors hover:bg-orange/10 hover:text-orange"
            type="button"
            role="menuitem"
            onClick={() => runAction(onDelete)}
          >
            Delete
          </button>
        </div>
      )}
    </div>
  )
}

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
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
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

  const openDeleteConfirmation = (category: Category) => {
    setDeleteError(null)
    setCategoryToDelete(category)
  }

  const confirmDelete = async () => {
    if (!categoryToDelete) return
    const category = categoryToDelete
    setDeletingId(category.id)
    setDeleteError(null)
    try {
      await deleteAdminCategory(category.id)
      showToast('Category deleted successfully.', 'success')
      setCategoryToDelete(null)
      setQuery((current) => ({ ...current, page: Math.min(current.page, result?.pagination.totalPages ?? 1) }))
    } catch (caught: unknown) {
      setDeleteError(caught instanceof ApiError ? caught.message : 'Category could not be deleted.')
    } finally {
      setDeletingId(null)
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
            <SelectField
              className="mt-2 w-full sm:w-40"
              options={[
                { value: '', label: 'All categories' },
                { value: 'active', label: 'Active' },
                { value: 'inactive', label: 'Inactive' },
              ]}
              onChange={(value) => setQuery((current) => ({ ...current, status: (value || undefined) as AdminCategoriesQuery['status'], page: 1 }))}
              value={query.status ?? ''}
            />
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
        <div className="mt-8 rounded-2xl border border-line bg-white shadow-sm">
          <div className="mb-4 flex items-center justify-between px-5 pt-5 text-sm text-muted">
            <span>{result?.pagination.total ?? 0} {result?.pagination.total === 1 ? 'category' : 'categories'}</span>
            <span>Page {currentPage} of {totalPages}</span>
          </div>
          <div className="space-y-3 px-4 pb-4 md:hidden">
            {categories.map((category) => (
              <article className="relative rounded-2xl border border-line bg-cream/45 p-4" key={category.id}>
                <div className="flex items-start gap-3">
                  <div className="size-16 shrink-0 overflow-hidden rounded-xl bg-sage">
                    {category.imageUrl && <img className="size-full object-cover" src={category.imageUrl} alt="" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="pr-2 font-bold text-green-dark">{category.name}</p>
                    <p className="mt-1 break-words text-xs text-muted">{category.description || 'No description'}</p>
                    <p className="mt-1 truncate text-xs text-muted">{category.slug}</p>
                  </div>
                  <CategoryActions
                    category={category}
                    isBusy={busyId === category.id || deletingId === category.id}
                    onToggleStatus={() => void toggleStatus(category)}
                    onDelete={() => openDeleteConfirmation(category)}
                  />
                </div>
                <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-line pt-3 text-xs">
                  <div>
                    <dt className="uppercase tracking-[0.12em] text-muted">Products</dt>
                    <dd className="mt-1 font-bold text-green-dark">{category.productCount ?? 0}</dd>
                  </div>
                  <div>
                    <dt className="uppercase tracking-[0.12em] text-muted">Status</dt>
                    <dd className="mt-1">
                      <span className={`inline-flex rounded-full px-2.5 py-1 font-bold ${category.isActive ? 'bg-sage text-green' : 'bg-line text-muted'}`}>
                        {category.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </dd>
                  </div>
                  <div>
                    <dt className="uppercase tracking-[0.12em] text-muted">Created</dt>
                    <dd className="mt-1 text-muted">{formatDate(category.createdAt)}</dd>
                  </div>
                  <div>
                    <dt className="uppercase tracking-[0.12em] text-muted">Updated</dt>
                    <dd className="mt-1 text-muted">{formatDate(category.updatedAt)}</dd>
                  </div>
                </dl>
              </article>
            ))}
          </div>
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[1100px] text-left text-sm">
              <thead className="border-b border-line bg-sage/30 text-xs uppercase tracking-[0.12em] text-muted">
                <tr><th className="px-5 py-4 font-bold">Category</th><th className="px-5 py-4 font-bold">Products</th><th className="px-5 py-4 font-bold">Status</th><th className="px-5 py-4 font-bold">Created</th><th className="px-5 py-4 font-bold">Updated</th><th className="px-5 py-4 font-bold">Actions</th></tr>
              </thead>
              <tbody className="divide-y divide-line">
                {categories.map((category) => (
                  <tr key={category.id}>
                    <td className="px-5 py-4"><div className="flex min-w-[260px] items-center gap-3"><div className="size-14 shrink-0 overflow-hidden rounded-xl bg-sage">{category.imageUrl && <img className="size-full object-cover" src={category.imageUrl} alt="" />}</div><div className="min-w-0"><p className="font-bold text-green-dark">{category.name}</p><p className="mt-1 max-w-md truncate text-xs text-muted">{category.description || 'No description'}</p><p className="mt-1 text-xs text-muted">{category.slug}</p></div></div></td>
                    <td className="px-5 py-4 text-muted">{category.productCount ?? 0}</td>
                    <td className="px-5 py-4"><span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${category.isActive ? 'bg-sage text-green' : 'bg-line text-muted'}`}>{category.isActive ? 'Active' : 'Inactive'}</span></td>
                    <td className="px-5 py-4 whitespace-nowrap text-xs text-muted">{formatDate(category.createdAt)}</td>
                    <td className="px-5 py-4 whitespace-nowrap text-xs text-muted">{formatDate(category.updatedAt)}</td>
                      <td className="px-5 py-4"><CategoryActions category={category} isBusy={busyId === category.id || deletingId === category.id} onToggleStatus={() => void toggleStatus(category)} onDelete={() => openDeleteConfirmation(category)} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && <div className="flex items-center justify-between gap-4 border-t border-line px-5 py-4"><button className="rounded-xl border border-line bg-white px-4 py-2.5 text-sm font-bold text-green-dark disabled:cursor-not-allowed disabled:opacity-40" type="button" disabled={currentPage <= 1} onClick={() => setQuery((current) => ({ ...current, page: currentPage - 1 }))}>Previous</button><span className="text-xs font-bold text-muted">{currentPage} / {totalPages}</span><button className="rounded-xl border border-line bg-white px-4 py-2.5 text-sm font-bold text-green-dark disabled:cursor-not-allowed disabled:opacity-40" type="button" disabled={currentPage >= totalPages} onClick={() => setQuery((current) => ({ ...current, page: currentPage + 1 }))}>Next</button></div>}
        </div>
      )}
      {categoryToDelete && (
        <ConfirmDialog
          eyebrow="Delete category"
          title={`Delete “${categoryToDelete.name}”?`}
          description="This is only allowed when the category has no products."
          error={deleteError}
          isBusy={deletingId === categoryToDelete.id}
          confirmLabel="Delete category"
          busyLabel="Deleting…"
          onCancel={() => setCategoryToDelete(null)}
          onConfirm={() => void confirmDelete()}
        />
      )}
    </>
  )
}