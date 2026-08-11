import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ApiError } from '../../services/api'
import { createAdminCategory, type CategoryInput } from '../../services/adminService'

const initialForm: CategoryInput = { name: '', description: '', isActive: true }

export function CategoryForm() {
  const navigate = useNavigate()
  const [form, setForm] = useState(initialForm)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    if (!form.name.trim()) {
      setError('Category name is required.')
      return
    }
    setIsSaving(true)
    try {
      await createAdminCategory({ ...form, name: form.name.trim(), description: form.description.trim() })
      navigate('/admin/categories', { replace: true, state: { message: 'Category created successfully.' } })
    } catch (caught: unknown) {
      setError(caught instanceof ApiError ? caught.message : 'Category could not be created.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <>
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div><p className="text-xs font-bold uppercase tracking-[0.16em] text-orange">Catalog</p><h1 className="mt-2 text-4xl font-bold tracking-[-0.05em] text-green-dark sm:text-5xl">Add category</h1><p className="mt-3 text-sm text-muted">Create a category that can be assigned to new products.</p></div>
        <Link className="text-sm font-bold text-green hover:text-orange" to="/admin/categories">Back to categories</Link>
      </div>
      <div className="mt-8 max-w-3xl rounded-2xl border border-line bg-white p-6 shadow-sm sm:p-8">
        <form className="space-y-5" onSubmit={submit}>
          <label className="block text-sm font-bold text-green-dark">Category name<input className="mt-2 w-full rounded-xl border border-line px-4 py-3 font-normal outline-none focus:border-green focus:ring-2 focus:ring-green/10" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} maxLength={120} required /></label>
          <label className="block text-sm font-bold text-green-dark">Description <span className="font-normal text-muted">(optional)</span><textarea className="mt-2 min-h-28 w-full resize-y rounded-xl border border-line px-4 py-3 font-normal outline-none focus:border-green focus:ring-2 focus:ring-green/10" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} maxLength={500} /></label>
          <label className="flex items-center gap-3 text-sm font-bold text-green-dark"><input className="size-4 accent-green" type="checkbox" checked={form.isActive} onChange={(event) => setForm({ ...form, isActive: event.target.checked })} />Active and available for products</label>
          {error && <p className="text-sm font-medium text-orange" role="alert">{error}</p>}
          <div className="flex flex-wrap gap-3"><button className="rounded-xl bg-green px-5 py-3 text-sm font-bold text-cream hover:bg-green-dark disabled:opacity-50" type="submit" disabled={isSaving}>{isSaving ? 'Creating category…' : 'Create category'}</button><Link className="rounded-xl border border-line px-5 py-3 text-sm font-bold text-green-dark" to="/admin/categories">Cancel</Link></div>
        </form>
      </div>
    </>
  )
}