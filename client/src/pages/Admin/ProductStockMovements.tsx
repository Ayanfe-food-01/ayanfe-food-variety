import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { AdminPagination } from '../../components/admin/AdminPagination'
import { AdminTableSkeleton } from '../../components/admin/AdminTableSkeleton'
import { ResponsiveDataTable } from '../../components/ui/ResponsiveDataTable'
import { SelectField } from '../../components/ui/SelectField'
import { useInitialRouteLoad } from '../../hooks/useInitialRouteLoad'
import { ApiError } from '../../services/api'
import { getAdminProduct } from '../../services/adminService'
import { getProductStockMovements } from '../../services/inventoryService'
import { formatDate } from '../../utils/dateFormat'
import { MOVEMENT_TYPE_LABELS, type StockMovementsPage } from '../../types/inventory'

const pageSize = 20

export function ProductStockMovements() {
  const { productId } = useParams<'productId'>()
  const [searchParams, setSearchParams] = useSearchParams()
  const [result, setResult] = useState<StockMovementsPage | null>(null)
  const [productName, setProductName] = useState('')
  const [page, setPage] = useState(1)
  const [optionId, setOptionId] = useState(searchParams.get('option') ?? '')
  const [optionOptions, setOptionOptions] = useState<Array<{ value: string; label: string }>>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!productId) return
    let current = true
    getAdminProduct(productId)
      .then((product) => {
        if (!current) return
        setProductName(product.name)
        setOptionOptions([
          { value: '', label: 'All units' },
          ...(product.options ?? [])
            .filter((option) => option.isActive)
            .map((option) => ({ value: option.id, label: option.label })),
        ])
      })
      .catch(() => undefined)
    return () => {
      current = false
    }
  }, [productId])

  const load = useCallback(() => {
    if (!productId) return
    setError(null)
    getProductStockMovements(productId, optionId || null, page, pageSize)
      .then(setResult)
      .catch((caught: unknown) => {
        setError(caught instanceof ApiError ? caught.message : 'Movements could not be loaded.')
      })
      .finally(() => setIsLoading(false))
  }, [productId, optionId, page])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      load()
    }, 0)
    return () => window.clearTimeout(timeoutId)
  }, [load])

  useInitialRouteLoad(!isLoading)

  const applyOption = (value: string) => {
    setOptionId(value)
    setPage(1)
    const next = new URLSearchParams(searchParams)
    if (value) next.set('option', value)
    else next.delete('option')
    setSearchParams(next, { replace: true })
  }

  const movements = result?.movements ?? []
  const currentPage = result?.pagination.page ?? page
  const totalPages = result?.pagination.totalPages ?? 1

  const totalLabel = useMemo(() => `${result?.pagination.total ?? 0} movement${(result?.pagination.total ?? 0) === 1 ? '' : 's'}`, [result])

  return (
    <div className="admin-inventory-page min-w-0">
      <div className="min-w-0">
        <Link className="inline-flex items-center gap-2 text-sm font-bold text-green hover:text-orange" to="/admin/inventory?tab=movements">
          ← Back to inventory
        </Link>
        <p className="mt-2 text-xs font-bold uppercase tracking-[0.16em] text-orange">Inventory</p>
        <h1 className="mt-2 text-4xl font-bold tracking-[-0.05em] text-green-dark sm:text-5xl">{productName || 'Product movements'}</h1>
        <p className="mt-3 max-w-2xl text-sm text-muted">Complete stock change history for this product, including automatic order deductions and manual adjustments.</p>
      </div>

      {error && <div className="mt-6 rounded-2xl border border-orange/25 bg-orange/5 p-4 text-sm text-orange" role="alert">{error}</div>}

      {optionOptions.length > 1 && (
        <section className="mt-8 rounded-2xl border border-line bg-white p-4 shadow-sm sm:p-5" aria-label="Product unit filter">
          <div className="max-w-xs">
            <label className="text-sm font-bold text-green-dark" htmlFor="product-option">Unit</label>
            <div className="mt-2">
              <SelectField
                id="product-option"
                options={optionOptions}
                value={optionId}
                onChange={applyOption}
              />
            </div>
          </div>
        </section>
      )}

      <section className="admin-inventory-workspace mt-6 rounded-2xl border border-line bg-white shadow-sm" aria-label="Product stock movements">
        {isLoading ? (
          <AdminTableSkeleton desktopColumns={6} label="Loading product movements" />
        ) : movements.length ? (
          <>
            <div className="mb-4 flex items-center justify-between px-5 pt-5 text-sm text-muted">
              <span>{totalLabel}</span>
              <span>Page {currentPage} of {totalPages}</span>
            </div>
            <div className="min-w-0 overflow-hidden">
              <ResponsiveDataTable label="Product movements table horizontal scroll">
                <table className="w-full min-w-[820px] whitespace-nowrap text-left text-sm">
                  <thead className="sticky top-0 z-10 border-b border-line bg-sage/30 text-xs uppercase tracking-[0.12em] text-muted">
                    <tr>
                      <th className="px-4 py-4 font-bold">Unit</th>
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
                        <td className="px-4 py-4 text-muted">{movement.productOptionLabel ?? 'Base unit'}</td>
                        <td className="px-4 py-4">
                          <span className={`inline-flex rounded-full px-2.5 py-1 font-bold ${
                            movement.quantityDelta > 0 ? 'bg-sage text-green' : 'bg-orange/10 text-orange'
                          }`}>
                            {MOVEMENT_TYPE_LABELS[movement.movementType]}
                          </span>
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
            <h2 className="text-xl font-bold text-green-dark">No movements recorded</h2>
            <p className="mt-2 text-sm text-muted">This unit has not had any stock changes yet.</p>
          </div>
        )}
      </section>
    </div>
  )
}