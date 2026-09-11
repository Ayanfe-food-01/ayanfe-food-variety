import { useCallback, useEffect, useState } from 'react'
import { AdminPagination } from '../AdminPagination'
import { AdminTableSkeleton } from '../AdminTableSkeleton'
import { ResponsiveDataTable } from '../../ui/ResponsiveDataTable'
import { SegmentedControl } from '../../ui/SegmentedControl'
import { SelectField } from '../../ui/SelectField'
import { ApiError } from '../../../services/api'
import { getAdminStockMovements } from '../../../services/inventoryService'
import { formatDate } from '../../../utils/dateFormat'
import { MOVEMENT_TYPE_LABELS, type MovementType, type StockMovementsPage } from '../../../types/inventory'

const pageSize = 20

const movementTypeOptions = [
  { value: '', label: 'All movement types' },
  ...Object.entries(MOVEMENT_TYPE_LABELS).map(([value, label]) => ({ value, label })),
]

interface StockMovementsPanelProps {
  activeTab: string
  onTabChange: (tab: string) => void
}

export function StockMovementsPanel({ activeTab, onTabChange }: StockMovementsPanelProps) {
  const [result, setResult] = useState<StockMovementsPage | null>(null)
  const [page, setPage] = useState(1)
  const [movementType, setMovementType] = useState<MovementType | ''>('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(() => {
    setIsLoading(true)
    setError(null)
    getAdminStockMovements({
      page,
      pageSize,
      movementType: movementType || undefined,
      from: from || undefined,
      to: to || undefined,
    })
      .then(setResult)
      .catch((caught: unknown) => {
        setError(caught instanceof ApiError ? caught.message : 'Stock movements could not be loaded.')
      })
      .finally(() => setIsLoading(false))
  }, [page, movementType, from, to])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      load()
    }, 0)
    return () => window.clearTimeout(timeoutId)
  }, [load])

  const applyMovementType = (value: string) => {
    setMovementType(value as MovementType | '')
    setPage(1)
  }

  const applyFrom = (value: string) => {
    setFrom(value)
    setPage(1)
  }

  const applyTo = (value: string) => {
    setTo(value)
    setPage(1)
  }

  const movements = result?.movements ?? []
  const currentPage = result?.pagination.page ?? page
  const totalPages = result?.pagination.totalPages ?? 1

  return (
    <>
      {error && <div className="mt-6 rounded-2xl border border-orange/25 bg-orange/5 p-4 text-sm text-orange" role="alert">{error}</div>}

      <section className="rounded-2xl border border-line bg-white p-4 shadow-sm sm:p-5" aria-label="Stock movement filters">
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="text-sm font-bold text-green-dark" htmlFor="movement-type">Movement type</label>
            <div className="mt-2">
              <SelectField
                id="movement-type"
                options={movementTypeOptions}
                value={movementType}
                onChange={applyMovementType}
              />
            </div>
          </div>
          <div>
            <label className="text-sm font-bold text-green-dark" htmlFor="movement-from">From</label>
            <input
              className="mt-2 w-full rounded-xl border border-line px-4 py-3 text-sm text-green-dark focus:border-green focus:outline-none"
              id="movement-from"
              onChange={(event) => applyFrom(event.target.value)}
              type="date"
              value={from}
            />
          </div>
          <div>
            <label className="text-sm font-bold text-green-dark" htmlFor="movement-to">To</label>
            <input
              className="mt-2 w-full rounded-xl border border-line px-4 py-3 text-sm text-green-dark focus:border-green focus:outline-none"
              id="movement-to"
              onChange={(event) => applyTo(event.target.value)}
              type="date"
              value={to}
            />
          </div>
        </div>
        <div className="mt-4 border-t border-line pt-4">
          <SegmentedControl
            ariaLabel="Inventory views"
            options={[
              { key: 'stock', label: 'Stock overview' },
              { key: 'movements', label: 'Movements' },
            ]}
            value={activeTab}
            onChange={(key) => onTabChange(key)}
          />
        </div>
      </section>

      <section className="admin-inventory-workspace mt-6 rounded-2xl border border-line bg-white shadow-sm" aria-label="Stock movements log">
        {isLoading ? (
          <AdminTableSkeleton desktopColumns={6} label="Loading stock movements" />
        ) : movements.length ? (
          <>
            <div className="mb-4 flex items-center justify-between px-5 pt-5 text-sm text-muted">
              <span>{result!.pagination.total} {result!.pagination.total === 1 ? 'movement' : 'movements'}</span>
              <span>Page {currentPage} of {totalPages}</span>
            </div>
            <div className="min-w-0 overflow-hidden">
              <ResponsiveDataTable label="Stock movements table horizontal scroll">
                <table className="w-full min-w-[880px] whitespace-nowrap text-left text-sm">
                  <thead className="sticky top-0 z-10 border-b border-line bg-sage/30 text-xs uppercase tracking-[0.12em] text-muted">
                    <tr>
                      <th className="px-4 py-4 font-bold">Product</th>
                      <th className="px-4 py-4 font-bold">Type</th>
                      <th className="px-4 py-4 text-right font-bold">Change</th>
                      <th className="px-4 py-4 text-right font-bold">Stock level</th>
                      <th className="px-4 py-4 font-bold">Reason</th>
                      <th className="px-4 py-4 font-bold">By</th>
                      <th className="px-4 py-4 font-bold">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {movements.map((movement) => (
                      <tr key={movement.id} className="align-middle">
                        <td className="max-w-[260px] px-4 py-4">
                          <span className="block min-w-0 truncate font-bold text-green-dark">{movement.productName}</span>
                          {movement.productOptionLabel && <span className="block min-w-0 truncate text-xs text-muted">{movement.productOptionLabel}</span>}
                        </td>
                        <td className="px-4 py-4">
                          <MovementTypeBadge type={movement.movementType} />
                        </td>
                        <td className={`px-4 py-4 text-right font-bold ${movement.quantityDelta > 0 ? 'text-green' : 'text-orange'}`}>
                          {movement.quantityDelta > 0 ? `+${movement.quantityDelta}` : movement.quantityDelta}
                        </td>
                        <td className="px-4 py-4 text-right text-muted">
                          {movement.previousQuantity} → {movement.newQuantity}
                        </td>
                        <td className="max-w-[220px] px-4 py-4 text-muted">
                          <span className="block min-w-0 truncate" title={movement.reason}>{movement.reason}</span>
                        </td>
                        <td className="px-4 py-4 text-muted">{movement.performedBy ?? (movement.orderNumber ? `Order ${movement.orderNumber}` : 'System')}</td>
                        <td className="px-4 py-4 text-xs text-muted">{formatDate(movement.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </ResponsiveDataTable>
            </div>
            {totalPages > 1 && (
              <AdminPagination className="border-t border-line px-5 py-4" currentPage={currentPage} totalPages={totalPages} onPageChange={setPage} />
            )}
          </>
        ) : (
          <div className="admin-inventory-empty rounded-2xl border border-dashed border-green/25 bg-sage/25 px-6 py-16 text-center">
            <h2 className="text-xl font-bold text-green-dark">No movements found</h2>
            <p className="mt-2 text-sm text-muted">Try widening the date range or clearing the movement type filter.</p>
          </div>
        )}
      </section>
    </>
  )
}

function MovementTypeBadge({ type }: { type: MovementType }) {
  const isDeduction = type === 'ORDER_DEDUCTION'
  const isRestoration = type === 'CANCELLATION_RESTORATION' || type === 'STOCK_RECEIVED' || type === 'RETURN'
  const className = isRestoration
    ? 'bg-sage text-green'
    : isDeduction
      ? 'bg-orange/10 text-orange'
      : 'bg-line text-muted'
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 font-bold ${className}`}>
      {MOVEMENT_TYPE_LABELS[type]}
    </span>
  )
}