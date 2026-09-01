import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ActionMenu, ActionMenuButton, ActionMenuLink } from '../../components/admin/ActionMenu'
import { useToast } from '../../components/ui/Toast'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { useInitialRouteLoad } from '../../hooks/useInitialRouteLoad'
import { ApiError } from '../../services/api'
import {
  deleteAdminBanner,
  getAdminBanners,
  updateAdminBannerStatus,
  type AdminBanner,
} from '../../services/adminService'
import { formatDate as formatCompatibleDate } from '../../utils/dateFormat'
import { ResponsiveDataTable } from '../../components/ui/ResponsiveDataTable'

const formatDate = (value: string) =>
  formatCompatibleDate(value)

function BannerActions({
  banner,
  isBusy,
  onToggle,
  onDelete,
}: {
  banner: AdminBanner
  isBusy: boolean
  onToggle: () => void
  onDelete: () => void
}) {
  return (
    <ActionMenu ariaLabel={`Actions for ${banner.title}`} isBusy={isBusy} fixedPosition>
      {(close) => (
        <>
          <ActionMenuLink to={`/admin/banners/${banner.id}/edit`} onClick={close}>Edit</ActionMenuLink>
          <ActionMenuButton tone="accent" onClick={() => { close(); onToggle() }}>{banner.isActive ? 'Deactivate' : 'Activate'}</ActionMenuButton>
          <ActionMenuButton tone="danger" onClick={() => { close(); onDelete() }}>Delete</ActionMenuButton>
        </>
      )}
    </ActionMenu>
  )
}

export function Banners() {
  const [banners, setBanners] = useState<AdminBanner[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)

  useInitialRouteLoad(!isLoading)
  const [bannerToStatus, setBannerToStatus] = useState<AdminBanner | null>(null)
  const [bannerToDelete, setBannerToDelete] = useState<AdminBanner | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const { showToast } = useToast()

  useEffect(() => {
    let current = true
    getAdminBanners()
      .then((items) => {
        if (current) setBanners(items)
      })
      .catch((caught: unknown) => {
        if (current) setError(caught instanceof ApiError ? caught.message : 'Promotional banners could not be loaded.')
      })
      .finally(() => {
        if (current) setIsLoading(false)
      })
    return () => { current = false }
  }, [])

  const requestStatusChange = (banner: AdminBanner) => {
    setBannerToStatus(banner)
  }

  const confirmStatusChange = async () => {
    if (!bannerToStatus) return
    const banner = bannerToStatus
    setBusyId(banner.id)
    try {
      const updated = await updateAdminBannerStatus(banner.id, !banner.isActive)
      setBanners((current) => current.map((item) => item.id === updated.id ? updated : item))
      setBannerToStatus(null)
      showToast(`Banner ${updated.isActive ? 'activated' : 'deactivated'} successfully.`, 'success')
    } catch (caught: unknown) {
      showToast(caught instanceof ApiError ? caught.message : 'Banner status could not be updated.', 'error')
    } finally {
      setBusyId(null)
    }
  }

  const openDeleteConfirmation = (banner: AdminBanner) => {
    setDeleteError(null)
    setBannerToDelete(banner)
  }

  const confirmDelete = async () => {
    if (!bannerToDelete) return
    const banner = bannerToDelete
    setDeletingId(banner.id)
    setDeleteError(null)
    try {
      await deleteAdminBanner(banner.id)
      setBanners((current) => current.filter((item) => item.id !== banner.id))
      setBannerToDelete(null)
      showToast('Banner deleted successfully.', 'success')
    } catch (caught: unknown) {
      setDeleteError(caught instanceof ApiError ? caught.message : 'Banner could not be deleted.')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <>
      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-orange">Merchandising</p>
          <h1 className="mt-2 text-4xl font-bold tracking-[-0.05em] text-green-dark sm:text-5xl">Promotional banners</h1>
          <p className="mt-3 max-w-2xl text-sm text-muted">Create the offers and flyers that appear in the homepage promotional section. Only active banners are visible to customers.</p>
        </div>
        <Link className="inline-flex w-fit rounded-xl bg-green px-5 py-3 text-sm font-bold text-cream hover:bg-green-dark" to="/admin/banners/new">Add banner</Link>
      </div>

      {error && <div className="mt-6 rounded-2xl border border-orange/25 bg-orange/5 p-4 text-sm text-orange" role="alert">{error}</div>}
      {isLoading ? (
        <div className="mt-8 rounded-2xl border border-line bg-white px-5 py-14 text-center text-sm text-muted">Loading banners…</div>
      ) : banners.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-green/25 bg-sage/25 px-6 py-16 text-center">
          <h2 className="text-xl font-bold text-green-dark">No promotional banners yet</h2>
          <p className="mt-2 text-sm text-muted">Upload your first banner to start promoting offers on the homepage.</p>
          <Link className="mt-5 inline-flex rounded-xl bg-green px-5 py-3 text-sm font-bold text-cream" to="/admin/banners/new">Add banner</Link>
        </div>
      ) : (
        <div className="mt-8 rounded-2xl border border-line bg-white shadow-sm">
          <div className="flex items-center justify-between px-5 py-5 text-sm text-muted">
            <span>{banners.length} {banners.length === 1 ? 'banner' : 'banners'}</span>
            <span>Sorted by display order</span>
          </div>
           <div className="space-y-3 px-4 pb-4 lg:hidden">
            {banners.map((banner) => (
              <article className="relative rounded-2xl border border-line bg-cream/45 p-4" key={banner.id}>
                <div className="flex items-start gap-3">
                  <img className="size-20 shrink-0 rounded-xl object-cover" src={banner.imageUrl} alt="" />
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-green-dark">{banner.title}</p>
                    <p className="mt-1 line-clamp-2 text-xs text-muted">{banner.promotionalText || 'No promotional text'}</p>
                  </div>
              <BannerActions banner={banner} isBusy={busyId === banner.id || deletingId === banner.id} onToggle={() => requestStatusChange(banner)} onDelete={() => openDeleteConfirmation(banner)} />
                </div>
                <dl className="mt-4 grid grid-cols-3 gap-3 border-t border-line pt-3 text-xs">
                  <div><dt className="uppercase tracking-[0.12em] text-muted">Status</dt><dd className="mt-1"><span className={`inline-flex rounded-full px-2.5 py-1 font-bold ${banner.isActive ? 'bg-sage text-green' : 'bg-line text-muted'}`}>{banner.isActive ? 'Active' : 'Inactive'}</span></dd></div>
                  <div><dt className="uppercase tracking-[0.12em] text-muted">Order</dt><dd className="mt-1 font-bold text-green-dark">{banner.displayOrder}</dd></div>
                  <div><dt className="uppercase tracking-[0.12em] text-muted">Created</dt><dd className="mt-1 text-muted">{formatDate(banner.createdAt)}</dd></div>
                </dl>
              </article>
            ))}
          </div>
           <div className="hidden lg:block">
             <ResponsiveDataTable label="Banners table horizontal scroll">
             <table className="w-full min-w-[1080px] whitespace-nowrap text-left text-sm">
               <thead className="sticky top-0 z-10 border-b border-line bg-sage/30 text-xs uppercase tracking-[0.12em] text-muted">
                  <tr><th className="px-5 py-4 font-bold">Banner</th><th className="px-5 py-4 font-bold">Status</th><th className="px-5 py-4 font-bold">Order</th><th className="px-5 py-4 font-bold">Created</th><th className="px-5 py-4 font-bold">Actions</th></tr>
              </thead>
               <tbody className="divide-y divide-line">
                {banners.map((banner) => (
                   <tr key={banner.id} className="group">
                     <td className="w-[420px] max-w-[420px] overflow-hidden px-5 py-4"><div className="flex min-w-[380px] max-w-[388px] items-center gap-3"><img className="h-16 w-28 shrink-0 rounded-xl object-cover" src={banner.imageUrl} alt="" /><div className="min-w-0"><p className="responsive-table-ellipsis font-bold text-green-dark">{banner.title}</p><p className="responsive-table-ellipsis mt-1 text-xs text-muted">{banner.promotionalText || 'No promotional text'}</p></div></div></td>
                    <td className="px-5 py-4"><span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${banner.isActive ? 'bg-sage text-green' : 'bg-line text-muted'}`}>{banner.isActive ? 'Active' : 'Inactive'}</span></td>
                    <td className="px-5 py-4 font-bold text-green-dark">{banner.displayOrder}</td>
                    <td className="whitespace-nowrap px-5 py-4 text-xs text-muted">{formatDate(banner.createdAt)}</td>
                    <td className="px-5 py-4"><BannerActions banner={banner} isBusy={busyId === banner.id || deletingId === banner.id} onToggle={() => requestStatusChange(banner)} onDelete={() => openDeleteConfirmation(banner)} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
             </ResponsiveDataTable>
          </div>
        </div>
      )}
      {bannerToStatus && (
        <ConfirmDialog
          eyebrow="Change banner status"
          title={`${bannerToStatus.isActive ? 'Deactivate' : 'Activate'} “${bannerToStatus.title}”?`}
          description="Inactive banners remain saved in the admin portal but are hidden from customers on the homepage."
          isBusy={busyId === bannerToStatus.id}
          confirmLabel={bannerToStatus.isActive ? 'Deactivate banner' : 'Activate banner'}
          busyLabel="Updating…"
          onCancel={() => setBannerToStatus(null)}
          onConfirm={() => void confirmStatusChange()}
        />
      )}
      {bannerToDelete && (
        <ConfirmDialog
          eyebrow="Delete banner"
          title={`Delete “${bannerToDelete.title}”?`}
          description="This also removes the stored banner image and cannot be undone."
          error={deleteError}
          isBusy={deletingId === bannerToDelete.id}
          confirmLabel="Delete banner"
          busyLabel="Deleting…"
          onCancel={() => setBannerToDelete(null)}
          onConfirm={() => void confirmDelete()}
        />
      )}
    </>
  )
}