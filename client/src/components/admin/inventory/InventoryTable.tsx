import { InventoryStockBadge } from './InventoryStockBadge'
import { ResponsiveDataTable } from '../../ui/ResponsiveDataTable'
import type { InventoryItem } from '../../../types/inventory'

interface InventoryTableProps {
  items: InventoryItem[]
  isRefreshing: boolean
  onAdjust: (item: InventoryItem) => void
}

export function InventoryTable({ items, isRefreshing, onAdjust }: InventoryTableProps) {
  return (
    <div className="admin-inventory-table min-w-0 overflow-hidden">
      <div className="space-y-3 p-4 lg:hidden">
        {items.map((item) => {
          const key = item.productOptionId ? `${item.productId}-${item.productOptionId}` : item.productId
          return (
            <article className="rounded-2xl border border-line bg-cream/45 p-4" key={key}>
              <div className="flex items-start gap-3">
                <img className="size-16 shrink-0 rounded-xl object-cover" src={item.productImage} alt="" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold text-green-dark">{item.productName}</p>
                  {item.optionLabel && <p className="mt-1 text-xs font-semibold text-muted">{item.optionLabel}</p>}
                  <p className="mt-1 truncate text-xs text-muted">{item.categoryName}</p>
                </div>
                <InventoryStockBadge status={item.status} stockQuantity={item.stockQuantity} />
              </div>
              <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-line pt-3 text-xs">
                <div>
                  <dt className="uppercase tracking-[0.12em] text-muted">Stock on hand</dt>
                  <dd className="mt-1 font-bold text-green-dark">{item.stockQuantity}</dd>
                </div>
                <div>
                  <dt className="uppercase tracking-[0.12em] text-muted">Low stock alert</dt>
                  <dd className="mt-1 font-bold text-green-dark">at {item.lowStockThreshold}+</dd>
                </div>
              </dl>
              <button
                className="mt-4 inline-flex rounded-lg bg-green px-4 py-2.5 text-xs font-bold text-cream hover:bg-green-dark disabled:opacity-50"
                type="button"
                disabled={isRefreshing}
                onClick={() => onAdjust(item)}
              >
                Adjust stock
              </button>
            </article>
          )
        })}
      </div>

      <div className="hidden lg:block">
        <ResponsiveDataTable label="Inventory table horizontal scroll">
          <table className="w-full min-w-[1040px] whitespace-nowrap text-left text-sm">
            <thead className="sticky top-0 z-10 border-b border-line bg-sage/30 text-xs uppercase tracking-[0.12em] text-muted">
              <tr>
                <th className="px-4 py-4 font-bold">Product</th>
                <th className="px-4 py-4 font-bold">Unit</th>
                <th className="px-4 py-4 font-bold">Category</th>
                <th className="px-4 py-4 text-right font-bold">Stock on hand</th>
                <th className="px-4 py-4 text-right font-bold">Low stock alert</th>
                <th className="px-4 py-4 font-bold">Status</th>
                <th className="px-4 py-4 text-center font-bold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {items.map((item) => {
                const key = item.productOptionId ? `${item.productId}-${item.productOptionId}` : item.productId
                return (
                  <tr key={key} className="align-middle">
                    <td className="w-[300px] max-w-[300px] px-4 py-4">
                      <div className="flex min-w-[260px] max-w-[276px] items-center gap-3">
                        <img className="size-14 shrink-0 rounded-xl object-cover" src={item.productImage} alt="" />
                        <div className="min-w-0 flex-1">
                          <p className="block min-w-0 truncate font-bold text-green-dark">{item.productName}</p>
                          {item.optionLabel && <p className="mt-1 block min-w-0 truncate text-xs font-semibold text-muted">{item.optionLabel}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-muted">{item.optionLabel ?? item.productName}</td>
                    <td className="max-w-[190px] px-4 py-4 text-muted">
                      <span className="block max-w-[150px] min-w-0 truncate">{item.categoryName}</span>
                    </td>
                    <td className="px-4 py-4 text-right font-bold text-green-dark">{item.stockQuantity}</td>
                    <td className="px-4 py-4 text-right text-muted">{item.lowStockThreshold}</td>
                    <td className="px-4 py-4"><InventoryStockBadge status={item.status} /></td>
                    <td className="px-4 py-4 text-center">
                      <button
                        className="inline-flex rounded-lg border border-green/25 px-4 py-2 text-xs font-bold text-green hover:bg-green hover:text-cream disabled:opacity-50"
                        type="button"
                        disabled={isRefreshing}
                        onClick={() => onAdjust(item)}
                      >
                        Adjust stock
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </ResponsiveDataTable>
      </div>
    </div>
  )
}