import { useState } from 'react'
import { useToast } from '../../components/ui/Toast'
import { AdminPagination } from '../../components/admin/AdminPagination'
import { FilterBar } from '../../components/filters/FilterBar'
import type { FilterValues } from '../../components/filters/filterTypes'
import { useInitialRouteLoad } from '../../hooks/useInitialRouteLoad'
import { DeliveryAreaManager } from '../../components/admin/DeliveryAreaManager'
import { ZoneList } from '../../components/admin/deliveryZones/ZoneList'
import { ZoneModal } from '../../components/admin/deliveryZones/ZoneModal/ZoneModal'
import { ZoneDialogs } from '../../components/admin/deliveryZones/ZoneDialogs'
import { DeliveryZonesHeader } from '../../components/admin/deliveryZones/DeliveryZonesHeader'
import { zoneFields } from '../../components/admin/deliveryZones/zoneFields'
import { useDeliveryZonesData } from '../../components/admin/deliveryZones/useDeliveryZonesData'
import { useZoneModal } from '../../components/admin/deliveryZones/useZoneModal'
import { ApiError } from '../../services/api'
import { updateAdminDeliveryZoneStatus } from '../../services/adminService'
import type { AdminDeliveryZone, AdminDeliveryZonesQuery } from '../../services/adminService'
import { deleteAdminDeliveryZone } from '../../services/adminService'

export function DeliveryZones() {
  const { showToast } = useToast()
  const data = useDeliveryZonesData()
  const modal = useZoneModal(data.refresh)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [zoneToStatus, setZoneToStatus] = useState<AdminDeliveryZone | null>(null)
  const [zoneToDelete, setZoneToDelete] = useState<AdminDeliveryZone | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [areaManagerOpen, setAreaManagerOpen] = useState(false)

  useInitialRouteLoad(!data.isLoading)

  const confirmStatusChange = async () => {
    if (!zoneToStatus) return
    const zone = zoneToStatus
    setBusyId(zone.id)
    data.clearError()
    try {
      const updated = await updateAdminDeliveryZoneStatus(zone.id, !zone.isActive)
      setZoneToStatus(null)
      showToast(`Delivery zone ${updated.isActive ? 'activated' : 'deactivated'}.`, 'success')
      data.refresh()
    } catch (caught: unknown) {
      showToast(caught instanceof ApiError ? caught.message : 'Delivery zone status could not be updated.', 'error')
    } finally {
      setBusyId(null)
    }
  }

  const confirmDelete = async () => {
    if (!zoneToDelete) return
    const zone = zoneToDelete
    setDeletingId(zone.id)
    setDeleteError(null)
    try {
      await deleteAdminDeliveryZone(zone.id)
      showToast('Delivery zone deleted.', 'success')
      setZoneToDelete(null)
      data.refresh()
    } catch (caught: unknown) {
      setDeleteError(caught instanceof ApiError ? caught.message : 'Delivery zone could not be deleted.')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <>
      <DeliveryZonesHeader onManageAreas={() => setAreaManagerOpen(true)} onAddZone={modal.openCreate} />

      <section className="mt-8 rounded-2xl border border-line bg-white p-4 shadow-sm sm:p-5" aria-label="Delivery zone filters">
        <FilterBar
          fields={zoneFields}
          committed={{ status: data.status }}
          onApply={(next: FilterValues) => data.onApplyStatus((next.status || undefined) as AdminDeliveryZonesQuery['status'])}
          search={{
            label: 'Search zones',
            value: data.searchInput,
            onChange: data.onSearchInputChange,
            onSearch: data.onSearch,
            placeholder: 'Search by city, LGA or area',
          }}
        />
      </section>

      {data.error && <div className="mt-6 rounded-2xl border border-orange/25 bg-orange/5 p-4 text-sm text-orange" role="alert">{data.error}</div>}
      {data.isLoading ? (
        <div className="mt-8 rounded-2xl border border-line bg-white px-5 py-14 text-center text-sm text-muted">Loading delivery zones…</div>
      ) : data.zones.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-green/25 bg-sage/25 px-6 py-16 text-center">
          <h2 className="text-xl font-bold text-green-dark">No delivery zones yet</h2>
          <p className="mt-2 text-sm text-muted">Add your first delivery zone to start charging a delivery fee at checkout.</p>
          <button className="mt-5 inline-flex rounded-xl bg-green px-5 py-3 text-sm font-bold text-cream hover:bg-green-dark" type="button" onClick={modal.openCreate}>Add delivery zone</button>
        </div>
      ) : (
        <div className="mt-8 rounded-2xl border border-line bg-white shadow-sm">
          <div className="mb-4 flex items-center justify-between px-5 pt-5 text-sm text-muted">
            <span>{data.result?.pagination.total ?? 0} {data.result?.pagination.total === 1 ? 'zone' : 'zones'}</span>
            <span>Page {data.currentPage} of {data.totalPages}</span>
          </div>
          <ZoneList
            zones={data.zones}
            busyId={busyId ?? data.movingId}
            deletingId={deletingId}
            onEdit={modal.openEdit}
            onToggleStatus={setZoneToStatus}
            onDelete={(zone) => { setDeleteError(null); setZoneToDelete(zone) }}
            onMove={(zone, direction) => void data.moveZone(zone, direction)}
          />
          {data.totalPages > 1 && <AdminPagination className="border-t border-line px-5 py-4" currentPage={data.currentPage} totalPages={data.totalPages} onPageChange={data.onPageChange} />}
        </div>
      )}

      {modal.modal && (
        <ZoneModal
          mode={modal.modal.mode}
          zone={modal.modal.zone}
          isBusy={modal.modalBusy}
          error={modal.modalError}
          onCancel={modal.close}
          onSave={(input) => void modal.save(input)}
        />
      )}

      <ZoneDialogs
        zoneToStatus={zoneToStatus}
        isStatusBusy={Boolean(busyId === zoneToStatus?.id)}
        onCancelStatus={() => setZoneToStatus(null)}
        onConfirmStatus={() => void confirmStatusChange()}
        zoneToDelete={zoneToDelete}
        deleteError={deleteError}
        isDeleteBusy={Boolean(deletingId === zoneToDelete?.id)}
        onCancelDelete={() => setZoneToDelete(null)}
        onConfirmDelete={() => void confirmDelete()}
      />

      {areaManagerOpen && <DeliveryAreaManager onClose={() => setAreaManagerOpen(false)} />}
    </>
  )
}