import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useToast } from '../../components/ui/Toast'
import { AdminPagination } from '../../components/admin/AdminPagination'
import { AdminTableSkeleton } from '../../components/admin/AdminTableSkeleton'
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

type InventoryTab = 'all' | 'low' | 'out' | 'movements'

const TABS: { key: InventoryTab; label: string }[] = [
  { key: 'all', label: 'All stock' },
  { key: 'low', label: 'Low stock' },
  { key: 'out', label: 'Out of stock' },
  { key: 'movements', label: 'Movements' },
]

export function Inventory() {
  const { showToast } = useToast()
  const [searchParams, setSearchParams] = useSearchParams()
  const [categories, setCategories] = useState<Category[]>([])
  const [searchInput, setSearchInput] = useState('')
  const [adjustingItem, setAdjustingItem] = useState<InventoryItem | null>(null)
  const [reloadKey, setReloadKey] = useState(0)

  const statusParam = searchParams.get('status')
  const tabParam = searchParams.get('tab')
  const activeTab: InventoryTab = tabParam === 'movements'
    ? 'movements'
    : statusParam === 'low-stock' || statusParam === 'low'
      ? 'low'
      : statusParam === 'out-of-stock' || statusParam === 'out'
        ? 'out'
        : 'all'

  const controlledStockStatus: InventoryQuery['stockStatus'] | undefined = activeTab === 'low'
    ? 'low-stock'
    : activeTab === 'out'
      ? 'out-of-stock'
      : undefined

  const {
    items,
    total,
    currentPage,
    totalPages,
    isInitialLoading,
    error,
    summary,
    setQuery,
  } = useInventoryData({ stockStatus: controlledStockStatus, refreshKey: reloadKey })

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
    setSearchParams(tab === 'all' ? {} : { tab })
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
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-orange">Store operations</p>
          <h1 className="mt-2 text-4xl font-bold tracking-[-0.05em] text-green-dark sm:text-5xl">Inventory</h1>
          <p className="mt-3 max-w-2xl text-sm text-muted">Monitor stock levels across every unit, filter by availability, and record manual adjustments with a clear audit trail.</p>
        </div>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <StatCard label="Tracked units" value={totalSkus} detail="Active products and options" isLoading={isInitialLoading} />
        <StatCard label="Low stock" value={lowStock} detail="At or below their low-stock threshold" accent="orange" isLoading={isInitialLoading} to="/admin/inventory?tab=low" />
        <StatCard label="Out of stock" value={outOfStock} detail="Units with zero available stock" accent="orange" isLoading={isInitialLoading} to="/admin/inventory?tab=out" />
      </div>

      <div className="mt-8 flex items-center justify-between gap-4">
        <div className="inventory-tabs" role="tablist" aria-label="Inventory views">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              className={`inventory-tab${activeTab === tab.key ? ' inventory-tab-active' : ''}`}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.key}
              onClick={() => switchTab(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'movements' ? (
        <div className="mt-6">
          <StockMovementsPanel />
        </div>
      ) : (
        <>
          {error && <div className="mt-6 rounded-2xl border border-orange/25 bg-orange/5 p-4 text-sm text-orange" role="alert">{error}</div>}

          <section className="mt-8 rounded-2xl border border-line bg-white p-4 shadow-sm sm:p-5" aria-label="Inventory filters">
            <InventoryFilterPanel
              categories={categories}
              query={{ page: currentPage, pageSize, search: '', categoryId: '' }}
              searchInput={searchInput}
              onSearchInputChange={setSearchInput}
              onApply={(next) => setQuery(next)}
            />
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
                <h2 className="text-xl font-bold text-green-dark">
                  {activeTab === 'low' ? 'No low-stock units' : activeTab === 'out' ? 'No out-of-stock units' : 'No inventory found'}
                </h2>
                <p className="mt-2 text-sm text-muted">
                  {activeTab === 'low'
                    ? 'Every tracked unit is above its low-stock threshold.'
                    : activeTab === 'out'
                      ? 'Every tracked unit currently has stock available.'
                      : 'No active products or options match the current filters.'}
                </p>
                {activeTab === 'all' && <Link className="mt-5 inline-flex rounded-xl bg-green px-5 py-3 text-sm font-bold text-cream" to="/admin/products/new">Add a product</Link>}
              </div>
            )}
          </section>
        </>
      )}

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