import { Link, useNavigate } from 'react-router-dom'
import { ResponsiveDataTable } from '../ui/ResponsiveDataTable'
import { formatPrice, shoppingModeClass } from './orderPresentation'
import { formatRelativeTime } from './dashboard/dashboardFormat'
import type { AdminCustomerListItem } from '../../types/customer'

interface CustomersTableProps {
  customers: AdminCustomerListItem[]
}

const initials = (name: string): string =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('')
    || '·'

const CustomerAvatar = ({ name }: { name: string }) => (
  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-sage/45 text-sm font-black text-green-dark" aria-hidden="true">
    {initials(name)}
  </span>
)

const StatusBadge = ({ active }: { active: boolean }) => (
  <span className={`inline-flex shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${active ? 'bg-green/10 text-green' : 'bg-sage text-green-dark'}`}>
    {active ? 'Active' : 'Inactive'}
  </span>
)

export function CustomersTable({ customers }: CustomersTableProps) {
  const navigate = useNavigate()

  return (
    <div className="min-w-0 overflow-hidden">
      <div className="space-y-3 p-4 lg:hidden">
        {customers.map((customer) => (
          <LinkRow key={customer.id} customer={customer} />
        ))}
      </div>

      <div className="hidden lg:block">
        <ResponsiveDataTable label="Customers table horizontal scroll">
          <table className="w-full min-w-[860px] whitespace-nowrap text-left text-sm">
            <thead className="sticky top-0 z-10 border-b border-line bg-sage/30 text-xs uppercase tracking-[0.12em] text-muted">
              <tr>
                <th className="px-4 py-4 font-bold">Name</th>
                <th className="px-4 py-4 font-bold">Contact</th>
                <th className="px-4 py-4 text-right font-bold">Orders</th>
                <th className="px-4 py-4 text-right font-bold">Total spent</th>
                <th className="px-4 py-4 font-bold">Last order</th>
                <th className="px-4 py-4 font-bold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {customers.map((customer) => (
                <tr
                  className="cursor-pointer align-middle transition-colors hover:bg-sage/15"
                  key={customer.id}
                  onClick={(event) => {
                    if ((event.target as Element).closest('a')) return
                    navigate(`/admin/customers/${customer.id}`)
                  }}
                >
                  <td className="w-[280px] max-w-[280px] px-4 py-4">
                    <div className="flex min-w-[250px] max-w-[270px] items-center gap-3">
                      <CustomerAvatar name={customer.name} />
                      <div className="min-w-0 flex-1">
                        <Link
                          className="block min-w-0 truncate font-bold text-green-dark hover:text-orange"
                          to={`/admin/customers/${customer.id}`}
                        >
                          {customer.name}
                        </Link>
                        {customer.shoppingMode === 'WHOLESALE' && (
                          <span className={`mt-1 inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold ${shoppingModeClass(customer.shoppingMode)}`}>
                            Wholesale
                          </span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="max-w-[260px] px-4 py-4 text-muted">
                    <span className="block max-w-[240px] min-w-0 truncate text-green-dark">{customer.email}</span>
                    <span className="mt-0.5 block max-w-[240px] min-w-0 truncate">{customer.phone ?? '—'}</span>
                  </td>
                  <td className="px-4 py-4 text-right font-bold text-green-dark">{customer.totalOrders}</td>
                  <td className="px-4 py-4 text-right font-bold text-green-dark">{formatPrice(customer.totalSpent)}</td>
                  <td className="px-4 py-4 text-muted">{customer.lastOrderAt ? formatRelativeTime(customer.lastOrderAt) : '—'}</td>
                  <td className="px-4 py-4"><StatusBadge active={customer.isActive} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </ResponsiveDataTable>
      </div>
    </div>
  )
}

function LinkRow({ customer }: { customer: AdminCustomerListItem }) {
  return (
    <Link
      className="block rounded-2xl border border-line bg-cream/45 p-4 transition-colors hover:border-green/30"
      to={`/admin/customers/${customer.id}`}
      key={customer.id}
    >
      <div className="flex items-start gap-3">
        <CustomerAvatar name={customer.name} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-bold text-green-dark">{customer.name}</p>
          <p className="mt-0.5 truncate text-xs text-muted">
            {customer.email}{customer.phone ? ` · ${customer.phone}` : ''}
          </p>
        </div>
        <StatusBadge active={customer.isActive} />
      </div>
      <p className="mt-3 text-xs text-muted">
        Last order {customer.lastOrderAt ? formatRelativeTime(customer.lastOrderAt) : '—'}
      </p>
      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-line pt-3 text-xs">
        <div>
          <dt className="uppercase tracking-[0.12em] text-muted">Orders</dt>
          <dd className="mt-1 font-bold text-green-dark">{customer.totalOrders}</dd>
        </div>
        <div>
          <dt className="uppercase tracking-[0.12em] text-muted">Total spent</dt>
          <dd className="mt-1 font-bold text-green-dark">{formatPrice(customer.totalSpent)}</dd>
        </div>
      </dl>
    </Link>
  )
}