import { ResponsiveDataTable } from '../../ui/ResponsiveDataTable'
import type { AdminDeliveryZone } from '../../../services/adminService'
import { ZoneActions } from './ZoneActions'
import { formatCurrency } from './zoneFields'

interface ZoneListProps {
  zones: AdminDeliveryZone[]
  busyId: string | null
  deletingId: string | null
  onEdit: (zone: AdminDeliveryZone) => void
  onToggleStatus: (zone: AdminDeliveryZone) => void
  onDelete: (zone: AdminDeliveryZone) => void
  onMove: (zone: AdminDeliveryZone, direction: -1 | 1) => void
}

export function ZoneList({ zones, busyId, deletingId, onEdit, onToggleStatus, onDelete, onMove }: ZoneListProps) {
  return (
    <>
      <div className="space-y-3 px-4 pb-4 lg:hidden">
        {zones.map((zone, index) => (
          <div className="rounded-2xl border border-line bg-cream/45 p-4" key={zone.id}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-bold text-green-dark">{zone.label}</p>
                <p className="mt-1 text-xs text-muted">Fee {formatCurrency(zone.fee)}{zone.freeDeliveryThreshold ? <> · Free over {formatCurrency(zone.freeDeliveryThreshold)}</> : null}{zone.minDeliveryDays && zone.maxDeliveryDays ? <> · Delivery {zone.minDeliveryDays}-{zone.maxDeliveryDays} business days</> : null}</p>
              </div>
              <ZoneActions
                zone={zone}
                isBusy={busyId === zone.id || deletingId === zone.id}
                onEdit={() => onEdit(zone)}
                onToggleStatus={() => onToggleStatus(zone)}
                onDelete={() => onDelete(zone)}
              />
            </div>
            <div className="mt-4 flex items-center justify-between gap-3 border-t border-line pt-3">
              <div className="flex items-center gap-2">
                <button className="rounded-lg border border-line bg-white px-3 py-2 text-sm font-bold text-green-dark disabled:cursor-not-allowed disabled:opacity-40" type="button" disabled={index === 0} onClick={() => onMove(zone, -1)}>↑</button>
                <button className="rounded-lg border border-line bg-white px-3 py-2 text-sm font-bold text-green-dark disabled:cursor-not-allowed disabled:opacity-40" type="button" disabled={index === zones.length - 1} onClick={() => onMove(zone, 1)}>↓</button>
                <span className="text-xs text-muted">#{index + 1}</span>
              </div>
              <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${zone.isActive ? 'bg-sage text-green' : 'bg-line text-muted'}`}>{zone.isActive ? 'Active' : 'Inactive'}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="hidden lg:block">
        <ResponsiveDataTable label="Delivery zones table horizontal scroll">
          <table className="w-full min-w-[980px] whitespace-nowrap text-left text-sm">
            <thead className="sticky top-0 z-10 border-b border-line bg-sage/30 text-xs uppercase tracking-[0.12em] text-muted">
              <tr>
                <th className="px-5 py-4 font-bold">Order</th>
                <th className="px-5 py-4 font-bold">Zone (places)</th>
                <th className="px-5 py-4 font-bold">Delivery fee</th>
                <th className="px-5 py-4 font-bold">Free delivery threshold</th>
                <th className="px-5 py-4 font-bold">Delivery time</th>
                <th className="px-5 py-4 font-bold">Status</th>
                <th className="px-5 py-4 font-bold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {zones.map((zone, index) => (
                <tr key={zone.id} className="group">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-1.5">
                      <button className="rounded-lg border border-line bg-white px-2.5 py-1.5 text-sm font-bold text-green-dark disabled:cursor-not-allowed disabled:opacity-40" type="button" disabled={index === 0} onClick={() => onMove(zone, -1)}>↑</button>
                      <button className="rounded-lg border border-line bg-white px-2.5 py-1.5 text-sm font-bold text-green-dark disabled:cursor-not-allowed disabled:opacity-40" type="button" disabled={index === zones.length - 1} onClick={() => onMove(zone, 1)}>↓</button>
                      <span className="ml-1 text-xs font-bold text-muted">{index + 1}</span>
                    </div>
                  </td>
                  <td className="px-5 py-4"><span className="font-bold text-green-dark">{zone.label}</span></td>
                  <td className="px-5 py-4 text-muted">{formatCurrency(zone.fee)}</td>
                  <td className="px-5 py-4 text-muted">{zone.freeDeliveryThreshold ? formatCurrency(zone.freeDeliveryThreshold) : '—'}</td>
                  <td className="px-5 py-4 text-muted">{zone.minDeliveryDays && zone.maxDeliveryDays ? `${zone.minDeliveryDays}-${zone.maxDeliveryDays} business days` : '—'}</td>
                  <td className="px-5 py-4"><span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${zone.isActive ? 'bg-sage text-green' : 'bg-line text-muted'}`}>{zone.isActive ? 'Active' : 'Inactive'}</span></td>
                  <td className="px-5 py-4"><ZoneActions zone={zone} isBusy={busyId === zone.id || deletingId === zone.id} onEdit={() => onEdit(zone)} onToggleStatus={() => onToggleStatus(zone)} onDelete={() => onDelete(zone)} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </ResponsiveDataTable>
      </div>
    </>
  )
}