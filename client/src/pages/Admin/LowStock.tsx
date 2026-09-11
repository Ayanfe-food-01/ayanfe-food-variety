import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useToast } from '../../components/ui/Toast'
import { AdminPagination } from '../../components/admin/AdminPagination'
import { AdminTableSkeleton } from '../../components/admin/AdminTableSkeleton'
import { StatCard } from '../../components/admin/StatCard'
import { InventoryFilterPanel } from '../../components/admin/inventory/InventoryFilterPanel'
import { InventoryTable } from '../../components/admin/inventory/InventoryTable'
import { StockAdjustModal } from '../../components/admin/inventory/StockAdjustModal'
import { useInventoryData } from '../../components/admin/inventory/useInventoryData'
import { useInitialRouteLoad } from '../../hooks/useInitialRouteLoad'
import { getAdminCategories } from '../../services/adminService'
import type { Category } from '../../types/category'
import type { InventoryItem } from '../../types/inventory'

const pageSize = 20

export function LowStock() {
  const { showToast } = useToast()
  const [categories, setCategories] = useState<Category[]>([])
  const [searchInput, setSearchInput] = useState('')
  const [adjustingItem, setAdjustingItem] = useState<InventoryItem | null>(null)
  const [reloadKey, setReloadKey] = useState(0)

  const {
    items,
    total,
    currentPage,
    totalPages,
    isInitialLoading,
    error,
    summary,
    setQuery,
  } = useInventoryData({ initialQuery: { stockStatus: 'low-stock' }, refreshKey: reloadKey })

  useInitialRouteLoad(!isInitialLoading)

  useEffect(() => {
    getAdminCategories()
      .then(setCategories)
      .catch(() => undefined)
  }, [])

  const refresh = () => setReloadKey((key) => key + 1)

  const handleCompleted = () => {
    setAdjustingItem(null)
    showToast('Stock updated successfully.', 'success')
    refresh()
  }

  const isMismatched = (status: string | undefined) => status && status !== 'low-stock'

  return (
    <div className="admin-inventory-page min-w-0">
      <div className="flex min-w-0 flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-orange">Inventory</p>
          <h1 className="mt-2 text-4xl font-bold tracking-[-0.05em] text-green-dark sm:text-5xl">Low stock</h1>
          <p className="mt-3 max-w-2xl text-sm text-muted">Units running at or below their low-stock threshold across the supplier's inventory.</p>
        </div>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <StatCard label="Low stock" value={summary?.lowStockCount ?? 0} detail="At or below the low-stock threshold" accent="orange" isLoading={isInitialLoading} />
        <StatCard label="Out of stock" value={summary?.outOfStockCount ?? 0} detail="Zero stock available" accent="orange" isLoading={isInitialLoading} />
        <StatCard label="Tracked units" value={summary?.totalTrackedSkus ?? 0} detail="Active products and options" isLoading={isInitialLoading} />
      </div>

      {error && <div className="mt-6 rounded-2xl border border-orange/25 bg-orange/5 p-4 text-sm text-orange" role="alert">{error}</div>}

      <section className="mt-8 rounded-2xl border border-line bg-white p-4 shadow-sm sm:p-5" aria-label="Low stock filters">
        <InventoryFilterPanel
          categories={categories}
          query={{ page: currentPage, pageSize, search: '', categoryId: '', stockStatus: 'low-stock' }}
          searchInput={searchInput}
          onSearchInputChange={setSearchInput}
          onApply={(next) => setQuery({ ...next, stockStatus: 'low-stock' })}
        />
      </section>

      <section className="admin-inventory-workspace mt-6 rounded-2xl border border-line bg-white shadow-sm" aria-label="Low stock units">
        {isInitialLoading ? (
          <AdminTableSkeleton desktopColumns={7} label="Loading low stock" />
        ) : items.length ? (
          <>
            <div className="mb-4 flex items-center justify-between px-5 pt-5 text-sm text-muted">
              <span>{total} {total === 1 ? 'unit' : 'units'} at risk</span>
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
        ) : isMismatched(searchInput) ? (
          <div className="admin-inventory-empty rounded-2xl border border-dashed border-green/25 bg-sage/25 px-6 py-16 text-center">
            <h2 className="text-xl font-bold text-green-dark">Nothing at risk</h2>
            <p className="mt-2 text-sm text-muted">No units are currently low on stock.</p>
          </div>
        ) : (
          <div className="admin-inventory-empty rounded-2xl border border-dashed border-green/25 bg-sage/25 px-6 py-16 text-center">
            <h2 className="text-xl font-bold text-green-dark">Nothing at risk</h2>
            <p className="mt-2 text-sm text-muted">Every tracked unit is above its low-stock threshold.</p>
            <Link className="mt-5 inline-flex rounded-xl bg-green px-5 py-3 text-sm font-bold text-cream" to="/admin/products/new">Add a product</Link>
          </div>
        )}
      </section>

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