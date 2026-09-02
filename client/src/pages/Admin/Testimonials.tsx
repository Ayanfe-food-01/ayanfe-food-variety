import { useEffect, useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ActionMenu, ActionMenuButton, ActionMenuLink } from '../../components/admin/ActionMenu'
import { ContentTypeBadge } from '../../components/admin/ContentTypeBadge'
import { StoryPreviewModal } from '../../components/admin/StoryPreviewModal'
import { useToast } from '../../components/ui/Toast'
import { SelectField } from '../../components/ui/SelectField'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { useInitialRouteLoad } from '../../hooks/useInitialRouteLoad'
import { ApiError } from '../../services/api'
import {
  deleteAdminTestimonial,
  getAdminTestimonials,
  updateAdminTestimonialFeatured,
  updateAdminTestimonialStatus,
  type AdminTestimonialsPage,
  type AdminTestimonialsQuery,
} from '../../services/adminService'
import type { CustomerStory } from '../../services/storeSettingsService'
import { formatDate as formatCompatibleDate } from '../../utils/dateFormat'
import { ResponsiveDataTable } from '../../components/ui/ResponsiveDataTable'

const pageSize = 10
const formatDate = (value: string) => value ? formatCompatibleDate(value) : '—'

const hideBrokenImage = (event: React.SyntheticEvent<HTMLImageElement>) => {
  event.currentTarget.style.display = 'none'
}

const toPreviewStory = (testimonial: AdminTestimonialsPage['testimonials'][number]): CustomerStory => ({
  id: `testimonial:${testimonial.id}`,
  type: 'testimonial',
  authorName: testimonial.authorName,
  content: testimonial.content,
  rating: testimonial.rating,
  verifiedPurchase: false,
  createdAt: testimonial.createdAt,
})

interface TestimonialActionsProps {
  testimonial: AdminTestimonialsPage['testimonials'][number]
  isBusy: boolean
  onPreview: () => void
  onToggleStatus: () => void
  onToggleFeatured: () => void
  onDelete: () => void
}

function TestimonialActions({ testimonial, isBusy, onPreview, onToggleStatus, onToggleFeatured, onDelete }: TestimonialActionsProps) {
  return (
    <ActionMenu ariaLabel={`Actions for ${testimonial.authorName}`} isBusy={isBusy} fixedPosition>
      {(close) => (
        <>
          <ActionMenuLink to={`/admin/testimonials/${testimonial.id}/edit`} onClick={close}>Edit</ActionMenuLink>
          <ActionMenuButton onClick={() => { close(); onPreview() }}>Preview homepage card</ActionMenuButton>
          <ActionMenuButton tone="accent" onClick={() => { close(); onToggleStatus() }}>{testimonial.isActive ? 'Deactivate' : 'Activate'}</ActionMenuButton>
          <ActionMenuButton onClick={() => { close(); onToggleFeatured() }}>{testimonial.isFeatured ? 'Remove from featured' : 'Mark as featured'}</ActionMenuButton>
          <ActionMenuButton tone="danger" onClick={() => { close(); onDelete() }}>Delete</ActionMenuButton>
        </>
      )}
    </ActionMenu>
  )
}

export function Testimonials() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { showToast } = useToast()
  const [searchInput, setSearchInput] = useState(searchParams.get('search') ?? '')
  const [result, setResult] = useState<AdminTestimonialsPage | null>(null)
  const [query, setQuery] = useState<AdminTestimonialsQuery>({
    page: Number(searchParams.get('page') ?? 1),
    pageSize,
    search: searchParams.get('search') ?? undefined,
    status: (searchParams.get('status') as AdminTestimonialsQuery['status']) || undefined,
    featured: (searchParams.get('featured') as AdminTestimonialsQuery['featured']) || undefined,
  })
  const [isLoading, setIsLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [previewStory, setPreviewStory] = useState<CustomerStory | null>(null)
  const [testimonialToStatus, setTestimonialToStatus] = useState<AdminTestimonialsPage['testimonials'][number] | null>(null)
  const [testimonialToDelete, setTestimonialToDelete] = useState<AdminTestimonialsPage['testimonials'][number] | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useInitialRouteLoad(!isLoading)

  useEffect(() => {
    let current = true
    const timeoutId = window.setTimeout(() => {
      setIsLoading(true)
      setError(null)
      getAdminTestimonials(query)
        .then((loaded) => {
          if (current) setResult(loaded)
        })
        .catch((caught: unknown) => {
          if (current) setError(caught instanceof ApiError ? caught.message : 'Testimonials could not be loaded.')
        })
        .finally(() => {
          if (current) setIsLoading(false)
        })
    }, 0)
    const nextParams = new URLSearchParams()
    if (query.page > 1) nextParams.set('page', String(query.page))
    if (query.search) nextParams.set('search', query.search)
    if (query.status) nextParams.set('status', query.status)
    if (query.featured) nextParams.set('featured', query.featured)
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

  const requestStatusChange = (testimonial: AdminTestimonialsPage['testimonials'][number]) => {
    setTestimonialToStatus(testimonial)
  }

  const confirmStatusChange = async () => {
    if (!testimonialToStatus) return
    const testimonial = testimonialToStatus
    setBusyId(testimonial.id)
    setError(null)
    try {
      const updated = await updateAdminTestimonialStatus(testimonial.id, !testimonial.isActive)
      setTestimonialToStatus(null)
      showToast(`Testimonial ${updated.isActive ? 'activated' : 'deactivated'} successfully.`, 'success')
      setQuery((current) => ({ ...current }))
    } catch (caught: unknown) {
      showToast(caught instanceof ApiError ? caught.message : 'Testimonial status could not be updated.', 'error')
    } finally {
      setBusyId(null)
    }
  }

  const toggleFeatured = async (testimonial: AdminTestimonialsPage['testimonials'][number]) => {
    setBusyId(testimonial.id)
    setError(null)
    try {
      const updated = await updateAdminTestimonialFeatured(testimonial.id, !testimonial.isFeatured)
      showToast(`Testimonial ${updated.isFeatured ? 'marked as' : 'removed from'} featured.`, 'success')
      setQuery((current) => ({ ...current }))
    } catch (caught: unknown) {
      showToast(caught instanceof ApiError ? caught.message : 'Featured status could not be updated.', 'error')
    } finally {
      setBusyId(null)
    }
  }

  const openDeleteConfirmation = (testimonial: AdminTestimonialsPage['testimonials'][number]) => {
    setDeleteError(null)
    setTestimonialToDelete(testimonial)
  }

  const confirmDelete = async () => {
    if (!testimonialToDelete) return
    const testimonial = testimonialToDelete
    setDeletingId(testimonial.id)
    setDeleteError(null)
    try {
      await deleteAdminTestimonial(testimonial.id)
      showToast('Testimonial deleted successfully.', 'success')
      setTestimonialToDelete(null)
      setQuery((current) => ({ ...current, page: Math.min(current.page, result?.pagination.totalPages ?? 1) }))
    } catch (caught: unknown) {
      setDeleteError(caught instanceof ApiError ? caught.message : 'Testimonial could not be deleted.')
    } finally {
      setDeletingId(null)
    }
  }

  const testimonials = result?.testimonials ?? []
  const currentPage = result?.pagination.page ?? query.page
  const totalPages = result?.pagination.totalPages ?? 1

  return (
    <>
      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-orange">Social proof</p>
          <h1 className="mt-2 text-4xl font-bold tracking-[-0.05em] text-green-dark sm:text-5xl">Testimonials</h1>
          <p className="mt-3 text-sm text-muted">Create and control the customer testimonials available to your storefront.</p>
        </div>
        <Link className="inline-flex w-fit rounded-xl bg-green px-5 py-3 text-sm font-bold text-cream hover:bg-green-dark" to="/admin/testimonials/new">Add testimonial</Link>
      </div>

      <section className="mt-8 rounded-2xl border border-line bg-white p-4 shadow-sm sm:p-5" aria-label="Testimonial filters">
        <form className="flex flex-col gap-3 sm:flex-row sm:items-end" onSubmit={submitSearch}>
          <label className="flex-1 text-xs font-bold text-green-dark">
            Search testimonials
            <input className="mt-2 w-full rounded-xl border border-line bg-cream px-4 py-3 text-sm font-normal outline-none focus:border-green focus:ring-2 focus:ring-green/10" value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder="Author or testimonial" />
          </label>
          <button className="rounded-xl bg-green px-5 py-3 text-sm font-bold text-cream hover:bg-green-dark" type="submit">Search</button>
          <label className="text-xs font-bold text-green-dark">
            Status
            <SelectField
              className="mt-2 w-full sm:w-40"
              options={[
                { value: '', label: 'All' },
                { value: 'active', label: 'Active' },
                { value: 'inactive', label: 'Inactive' },
              ]}
              onChange={(value) => setQuery((current) => ({ ...current, status: (value || undefined) as AdminTestimonialsQuery['status'], page: 1 }))}
              value={query.status ?? ''}
            />
          </label>
          <label className="text-xs font-bold text-green-dark">
            Featured
            <SelectField
              className="mt-2 w-full sm:w-40"
              options={[
                { value: '', label: 'All' },
                { value: 'featured', label: 'Featured' },
                { value: 'not-featured', label: 'Not featured' },
              ]}
              onChange={(value) => setQuery((current) => ({ ...current, featured: (value || undefined) as AdminTestimonialsQuery['featured'], page: 1 }))}
              value={query.featured ?? ''}
            />
          </label>
        </form>
      </section>

      {result?.featured && (
        <div className={`mt-6 flex flex-col gap-2 rounded-2xl border px-4 py-3 text-sm sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-3 ${result.featured.remaining > 0 ? 'border-line bg-white' : 'border-orange/25 bg-orange/5'}`}>
          <span className="font-bold text-green-dark">Homepage featured slots:</span>
          <span className={result.featured.remaining > 0 ? 'text-muted' : 'font-bold text-orange'}>
            {result.featured.used} of {result.featured.max} used
            {result.featured.remaining > 0 ? ` · ${result.featured.remaining} available` : ' · limit reached'}
          </span>
          <span className="text-xs text-muted">Only active testimonials can be featured on the homepage.</span>
        </div>
      )}

      {error && <div className="mt-6 rounded-2xl border border-orange/25 bg-orange/5 p-4 text-sm text-orange" role="alert">{error}</div>}
      {isLoading ? (
        <div className="mt-8 rounded-2xl border border-line bg-white px-5 py-14 text-center text-sm text-muted">Loading testimonials…</div>
      ) : testimonials.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-green/25 bg-sage/25 px-6 py-16 text-center">
          <h2 className="text-xl font-bold text-green-dark">No testimonials yet</h2>
          <p className="mt-2 text-sm text-muted">Add your first testimonial to start showcasing customer feedback.</p>
          <Link className="mt-5 inline-flex rounded-xl bg-green px-5 py-3 text-sm font-bold text-cream" to="/admin/testimonials/new">Add testimonial</Link>
        </div>
      ) : (
        <div className="mt-8 rounded-2xl border border-line bg-white shadow-sm">
          <div className="mb-4 flex items-center justify-between px-5 pt-5 text-sm text-muted">
            <span>{result?.pagination.total ?? 0} {result?.pagination.total === 1 ? 'testimonial' : 'testimonials'}</span>
            <span>Page {currentPage} of {totalPages}</span>
          </div>
          <div className="space-y-3 px-4 pb-4 lg:hidden">
            {testimonials.map((testimonial) => (
              <article className="rounded-2xl border border-line bg-cream/45 p-4" key={testimonial.id}>
                <div className="flex items-start gap-3">
                  <div className="size-12 shrink-0 overflow-hidden rounded-full bg-sage">
                    {testimonial.avatarUrl && <img className="size-full object-cover" src={testimonial.avatarUrl} alt="" onError={hideBrokenImage} />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="pr-2 font-bold text-green-dark">{testimonial.authorName}{testimonial.rating ? <span className="ml-2 text-xs font-semibold text-orange">★ {testimonial.rating}/5</span> : null}</p>
                    <p className="mt-1 line-clamp-2 break-words text-xs text-muted">{testimonial.content}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <ContentTypeBadge type="testimonial" />
                      <span className="text-xs text-muted">Order {testimonial.displayOrder}</span>
                    </div>
                  </div>
                  <TestimonialActions
                    testimonial={testimonial}
                    isBusy={busyId === testimonial.id || deletingId === testimonial.id}
                    onPreview={() => setPreviewStory(toPreviewStory(testimonial))}
                    onToggleStatus={() => requestStatusChange(testimonial)}
                    onToggleFeatured={() => void toggleFeatured(testimonial)}
                    onDelete={() => openDeleteConfirmation(testimonial)}
                  />
                </div>
                <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-line pt-3 text-xs">
                  <div>
                    <dt className="uppercase tracking-[0.12em] text-muted">Content type</dt>
                    <dd className="mt-1"><ContentTypeBadge type="testimonial" /></dd>
                  </div>
                  <div>
                    <dt className="uppercase tracking-[0.12em] text-muted">Status</dt>
                    <dd className="mt-1">
                      <span className={`inline-flex rounded-full px-2.5 py-1 font-bold ${testimonial.isActive ? 'bg-sage text-green' : 'bg-line text-muted'}`}>
                        {testimonial.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </dd>
                  </div>
                  <div>
                    <dt className="uppercase tracking-[0.12em] text-muted">Featured</dt>
                    <dd className="mt-1">
                      <span className={`inline-flex rounded-full px-2.5 py-1 font-bold ${testimonial.isFeatured ? 'bg-orange/10 text-orange' : 'bg-line text-muted'}`}>
                        {testimonial.isFeatured ? 'Featured' : 'Not featured'}
                      </span>
                    </dd>
                  </div>
                  <div>
                    <dt className="uppercase tracking-[0.12em] text-muted">Created</dt>
                    <dd className="mt-1 text-muted">{formatDate(testimonial.createdAt)}</dd>
                  </div>
                </dl>
              </article>
            ))}
          </div>
          <div className="hidden lg:block">
            <ResponsiveDataTable label="Testimonials table horizontal scroll">
              <table className="w-full min-w-[1180px] whitespace-nowrap text-left text-sm">
                <thead className="sticky top-0 z-10 border-b border-line bg-sage/30 text-xs uppercase tracking-[0.12em] text-muted">
                  <tr><th className="px-5 py-4 font-bold">Author</th><th className="px-5 py-4 font-bold">Testimonial</th><th className="px-5 py-4 font-bold">Type</th><th className="px-5 py-4 font-bold">Rating</th><th className="px-5 py-4 font-bold">Order</th><th className="px-5 py-4 font-bold">Status</th><th className="px-5 py-4 font-bold">Featured</th><th className="px-5 py-4 font-bold">Created</th><th className="px-5 py-4 font-bold">Actions</th></tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {testimonials.map((testimonial) => (
                    <tr key={testimonial.id} className="group">
                      <td className="w-[260px] max-w-[260px] overflow-hidden px-5 py-4"><div className="flex min-w-[220px] max-w-[260px] items-center gap-3"><div className="size-11 shrink-0 overflow-hidden rounded-full bg-sage">{testimonial.avatarUrl && <img className="size-full object-cover" src={testimonial.avatarUrl} alt="" onError={hideBrokenImage} />}</div><p className="block min-w-0 truncate font-bold text-green-dark">{testimonial.authorName}</p></div></td>
                      <td className="w-[420px] max-w-[420px] overflow-hidden px-5 py-4"><p className="block min-w-0 truncate max-w-[400px] text-xs leading-5 text-muted">{testimonial.content}</p></td>
                      <td className="px-5 py-4"><ContentTypeBadge type="testimonial" /></td>
                      <td className="px-5 py-4">{testimonial.rating ? <span className="font-bold text-orange">★ {testimonial.rating}/5</span> : <span className="text-muted">—</span>}</td>
                      <td className="px-5 py-4 text-muted">{testimonial.displayOrder}</td>
                      <td className="px-5 py-4"><span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${testimonial.isActive ? 'bg-sage text-green' : 'bg-line text-muted'}`}>{testimonial.isActive ? 'Active' : 'Inactive'}</span></td>
                      <td className="px-5 py-4"><span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${testimonial.isFeatured ? 'bg-orange/10 text-orange' : 'bg-line text-muted'}`}>{testimonial.isFeatured ? 'Featured' : 'Not featured'}</span></td>
                      <td className="px-5 py-4 whitespace-nowrap text-xs text-muted">{formatDate(testimonial.createdAt)}</td>
                      <td className="px-5 py-4"><TestimonialActions testimonial={testimonial} isBusy={busyId === testimonial.id || deletingId === testimonial.id} onPreview={() => setPreviewStory(toPreviewStory(testimonial))} onToggleStatus={() => requestStatusChange(testimonial)} onToggleFeatured={() => void toggleFeatured(testimonial)} onDelete={() => openDeleteConfirmation(testimonial)} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </ResponsiveDataTable>
          </div>
          {totalPages > 1 && <div className="flex items-center justify-between gap-4 border-t border-line px-5 py-4"><button className="rounded-xl border border-line bg-white px-4 py-2.5 text-sm font-bold text-green-dark disabled:cursor-not-allowed disabled:opacity-40" type="button" disabled={currentPage <= 1} onClick={() => setQuery((current) => ({ ...current, page: currentPage - 1 }))}>Previous</button><span className="text-xs font-bold text-muted">{currentPage} / {totalPages}</span><button className="rounded-xl border border-line bg-white px-4 py-2.5 text-sm font-bold text-green-dark disabled:cursor-not-allowed disabled:opacity-40" type="button" disabled={currentPage >= totalPages} onClick={() => setQuery((current) => ({ ...current, page: currentPage + 1 }))}>Next</button></div>}
        </div>
      )}
      {previewStory && <StoryPreviewModal story={previewStory} onClose={() => setPreviewStory(null)} />}
      {testimonialToStatus && (
        <ConfirmDialog
          eyebrow="Change testimonial status"
          title={`${testimonialToStatus.isActive ? 'Deactivate' : 'Activate'} “${testimonialToStatus.authorName}”?`}
          description="Inactive testimonials remain saved in the admin portal but are hidden from customer display."
          isBusy={busyId === testimonialToStatus.id}
          confirmLabel={testimonialToStatus.isActive ? 'Deactivate testimonial' : 'Activate testimonial'}
          busyLabel="Updating…"
          onCancel={() => setTestimonialToStatus(null)}
          onConfirm={() => void confirmStatusChange()}
        />
      )}
      {testimonialToDelete && (
        <ConfirmDialog
          eyebrow="Delete testimonial"
          title={`Delete “${testimonialToDelete.authorName}”?`}
          description="The testimonial and its avatar will be permanently removed."
          error={deleteError}
          isBusy={deletingId === testimonialToDelete.id}
          confirmLabel="Delete testimonial"
          busyLabel="Deleting…"
          onCancel={() => setTestimonialToDelete(null)}
          onConfirm={() => void confirmDelete()}
        />
      )}
    </>
  )
}