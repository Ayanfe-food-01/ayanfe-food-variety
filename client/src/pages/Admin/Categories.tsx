import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { ApiError } from '../../services/api'
import { getAdminCategories, updateAdminCategoryStatus } from '../../services/adminService'
import type { Category } from '../../types/category'

export function Categories() {
  const location = useLocation()
  const [categories, setCategories] = useState<Category[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(() => {
    const state = location.state
    return state && typeof state === 'object' && 'message' in state && typeof state.message === 'string'
      ? state.message
      : null
  })
  const [error, setError] = useState<string | null>(null)

  const load = async () => {
    setIsLoading(true)
    setError(null)
    try {
      setCategories(await getAdminCategories())
    } catch (caught: unknown) {
      setError(caught instanceof ApiError ? caught.message : 'Categories could not be loaded.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const toggleStatus = async (category: Category) => {
    setUpdatingId(category.id)
    setMessage(null)
    setError(null)
    try {
      const updated = await updateAdminCategoryStatus(category.id, !category.isActive)
      setCategories((current) => current.map((item) => item.id === updated.id ? updated : item))
      setMessage(`Category ${updated.isActive ? 'activated' : 'deactivated'} successfully.`)
    } catch (caught: unknown) {
      setError(caught instanceof ApiError ? caught.message : 'Category status could not be updated.')
    } finally {
      setUpdatingId(null)
    }
  }

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

      {error && <div className="mt-6 rounded-2xl border border-orange/25 bg-orange/5 p-4 text-sm text-orange" role="alert">{error}</div>}
      {message && <div className="mt-6 rounded-2xl border border-green/25 bg-sage/40 p-4 text-sm font-semibold text-green" role="status">{message}</div>}

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
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-left text-sm">
              <thead className="border-b border-line bg-sage/30 text-xs uppercase tracking-[0.12em] text-muted">
                <tr><th className="px-5 py-4 font-bold">Category</th><th className="px-5 py-4 font-bold">Slug</th><th className="px-5 py-4 font-bold">Status</th><th className="px-5 py-4 font-bold">Actions</th></tr>
              </thead>
              <tbody className="divide-y divide-line">
                {categories.map((category) => (
                  <tr key={category.id}>
                    <td className="px-5 py-4"><p className="font-bold text-green-dark">{category.name}</p>{category.description && <p className="mt-1 max-w-md truncate text-xs text-muted">{category.description}</p>}</td>
                    <td className="px-5 py-4 text-muted">{category.slug}</td>
                    <td className="px-5 py-4"><span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${category.isActive ? 'bg-sage text-green' : 'bg-line text-muted'}`}>{category.isActive ? 'Active' : 'Inactive'}</span></td>
                    <td className="px-5 py-4"><button className="text-xs font-bold text-orange disabled:opacity-50" type="button" disabled={updatingId === category.id} onClick={() => void toggleStatus(category)}>{category.isActive ? 'Deactivate' : 'Activate'}</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  )
}