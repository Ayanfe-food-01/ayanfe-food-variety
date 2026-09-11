import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useToast } from '../../components/ui/Toast'
import { AdminPagination } from '../../components/admin/AdminPagination'
import { AdminTableSkeleton } from '../../components/admin/AdminTableSkeleton'
import { SegmentedControl } from '../../components/ui/SegmentedControl'
import { StatCard } from '../../components/admin/StatCard'
import { InventoryFilterPanel } from '../../components/admin/inventory/InventoryFilterPanel'
import { InventoryTable } from '../../components/admin/inventory/InventoryTable'
import { StockAdjustModal } from '../../components/admin/inventory/StockAdjustModal'
import { StockMovementsPanel } from '../../components/admin/inventory/StockMovementsPanel'
import { useInventoryData } from '../../components/admin/inventory/useInventoryData'
import { useInitialRouteLoad } from '../../hooks/useInitialRouteLoad'
import { getAdminCategories } from '../../services/adminService'
import type { InventoryQuery } from '../../services/inventoryService'
import type { Category } from '../../types/category'
import type { InventoryItem } from '../../types/inventory'

const pageSize = 20

type InventoryTab = 'stock' | 'movements'

const STATUS_FROM_PARAM = (param: string | null): InventoryQuery['stockStatus'] | undefined => {
  switch (param) {
    case 'in-stock':
    case 'healthy':
      return 'in-stock'
    case 'low-stock':
    case 'low':
      return 'low-stock'
    case 'out-of-stock':
    case 'out':
      return 'out-of-stock'
    default:
      return undefined
  }
}

export function Inventory() {
  const { showToast } = useToast()
  const [searchParams, setSearchParams] = useSearchParams()
  const [categories, setCategories] = useState<Category[]>([])
  const [searchInput, setSearchInput] = useState('')
  const [adjustingItem, setAdjustingItem] = useState<InventoryItem | null>(null)
  const [reloadKey, setReloadKey] = useState(0)
  const [stockStatus, setStockStatus] = useState<InventoryQuery['stockStatus'] | undefined>(() => STATUS_FROM_PARAM(searchParams.get('status')))

  const activeTab: InventoryTab = searchParams.get('tab') === 'movements' ? 'movements' : 'stock'

  const {
    items,
    total,
    currentPage,
    totalPages,
    isInitialLoading,
    error,
    summary,
    activeSearch,
    activeCategoryId,
    setQuery,
  } = useInventoryData({ stockStatus, refreshKey: reloadKey })

  useInitialRouteLoad(!isInitialLoading)

  useEffect(() => {
    getAdminCategories()
      .then(setCategories)
      .catch(() => undefined)
  }, [])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setSearchInput('')
      setQuery({ search: '', categoryId: '', page: 1 })
    }, 0)
    return () => window.clearTimeout(timeoutId)
  }, [activeTab, setQuery])

  const switchTab = (tab: InventoryTab) => {
    const next = new URLSearchParams(searchParams)
    if (tab === 'movements') next.set('tab', 'movements')
    else next.delete('tab')
    setSearchParams(next)
  }

  const updateStockStatus = (status: InventoryQuery['stockStatus'] | undefined) => {
    const normalized = status || undefined
    setStockStatus(normalized)
    const next = new URLSearchParams(searchParams)
    if (normalized) next.set('status', normalized)
    else next.delete('status')
    setSearchParams(next)
    setQuery({ page: 1 })
  }

  const refresh = () => {
    setReloadKey((key) => key + 1)
  }

  const handleCompleted = () => {
    setAdjustingItem(null)
    showToast('Stock updated successfully.', 'success')
    refresh()
  }

  const totalSkus = summary?.totalTrackedSkus ?? 0
  const lowStock = summary?.lowStockCount ?? 0
  const outOfStock = summary?.outOfStockCount ?? 0

  return (
    <div className="admin-inventory-page min-w-0">
      <div className="flex min-w-0 flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-orange">Operations</p>
          <h1 className="mt-2 text-4xl font-bold tracking-[-0.05em] text-green-dark sm:text-5xl">Inventory</h1>
          <p className="mt-3 max-w-2xl text-sm text-muted">Monitor stock levels across every unit, filter by availability, and record manual adjustments with a clear audit trail.</p>
        </div>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <StatCard label="Tracked units" value={totalSkus} detail="Active products and options" isLoading={isInitialLoading} />
        <StatCard label="Low stock" value={lowStock} detail="At or below their low-stock threshold" accent="orange" isLoading={isInitialLoading} to="/admin/inventory?status=low-stock" />
        <StatCard label="Out of stock" value={outOfStock} detail="Units with zero available stock" accent="orange" isLoading={isInitialLoading} to="/admin/inventory?status=out-of-stock" />
      </div>

      <div className="mt-8">
        {activeTab === 'movements' ? (
          <StockMovementsPanel activeTab={activeTab} onTabChange={(tab) => switchTab(tab as InventoryTab)} />
        ) : (
          <>
            {error && <div className="mt-6 rounded-2xl border border-orange/25 bg-orange/5 p-4 text-sm text-orange" role="alert">{error}</div>}

            <section className="rounded-2xl border border-line bg-white p-4 shadow-sm sm:p-5" aria-label="Inventory filters">
              <InventoryFilterPanel
                categories={categories}
                query={{ page: currentPage, pageSize, search: activeSearch, categoryId: activeCategoryId, stockStatus }}
                searchInput={searchInput}
                onSearchInputChange={setSearchInput}
                onApply={(next) => {
                  if ('stockStatus' in next) updateStockStatus(next.stockStatus)
                  if ('categoryId' in next || 'search' in next) setQuery({ categoryId: next.categoryId ?? undefined, search: next.search ?? undefined })
                }}
              />
              <div className="mt-4 border-t border-line pt-4">
                <SegmentedControl
                  ariaLabel="Inventory views"
                  options={[
                    { key: 'stock', label: 'Stock overview' },
                    { key: 'movements', label: 'Movements' },
                  ]}
                  value={activeTab}
                  onChange={(key) => switchTab(key as InventoryTab)}
                />
              </div>
            </section>

          <section className="admin-inventory-workspace mt-6 rounded-2xl border border-line bg-white shadow-sm" aria-label="Inventory table">
            {isInitialLoading ? (
              <AdminTableSkeleton desktopColumns={7} label="Loading inventory" />
            ) : items.length ? (
              <>
                <div className="mb-4 flex items-center justify-between px-5 pt-5 text-sm text-muted">
                  <span>{total} {total === 1 ? 'unit' : 'units'}</span>
                  <span>Page {currentPage} of {totalPages}</span>
                </div>
                <InventoryTable items={items} isRefreshing={false} onAdjust={setAdjustingItem} />
                {totalPages > 1 && (
                  <AdminPagination
                    className="border-t border-line px-5 py-4"
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={(page) => setQuery({ page })}
                  />
                )}
              </>
            ) : (
              <div className="admin-inventory-empty rounded-2xl border border-dashed border-green/25 bg-sage/25 px-6 py-16 text-center">
                <h2 className="text-xl font-bold text-green-dark">No inventory found</h2>
                <p className="mt-2 text-sm text-muted">
                  {stockStatus === 'low-stock'
                    ? 'Every tracked unit is above its low-stock threshold.'
                    : stockStatus === 'out-of-stock'
                      ? 'Every tracked unit currently has stock available.'
                      : 'No active products or options match the current filters.'}
                </p>
                {!stockStatus && <Link className="mt-5 inline-flex rounded-xl bg-green px-5 py-3 text-sm font-bold text-cream" to="/admin/products/new">Add a product</Link>}
              </div>
            )}
          </section>
        </>
      )}
      </div>

      {adjustingItem && (
        <StockAdjustModal
          item={adjustingItem}
          onClose={() => setAdjustingItem(null)}
          onCompleted={handleCompleted}
        />
      )}
    </div>
  )
}