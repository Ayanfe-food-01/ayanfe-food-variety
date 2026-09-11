import { Link } from 'react-router-dom'
import { MegaphoneIcon, PackageIcon, ShoppingCartIcon } from '../../../assets/icons'

const actions = [
  {
    label: 'Add product',
    description: 'List a new item in the catalogue.',
    to: '/admin/products/new',
    icon: <PackageIcon size={22} strokeWidth={2} />,
  },
  {
    label: 'View orders',
    description: 'Move orders through fulfillment.',
    to: '/admin/orders',
    icon: <ShoppingCartIcon size={22} strokeWidth={2} />,
  },
  {
    label: 'Add promo banner',
    description: 'Feature an offer on the storefront.',
    to: '/admin/banners/new',
    icon: <MegaphoneIcon size={22} strokeWidth={2} />,
  },
]

export function QuickActions() {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-orange">Quick links</p>
      <p className="mt-1 text-sm text-muted">Shortcuts to common tasks.</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-3 sm:gap-4">
      {actions.map((action) => (
        <Link
          className="group flex items-center gap-4 rounded-2xl border border-line bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-green/30 hover:bg-sage/20"
          key={action.to}
          to={action.to}
        >
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-sage/45 text-green-dark transition-colors group-hover:bg-green group-hover:text-cream sm:size-11" aria-hidden="true">
            {action.icon}
          </span>
          <span>
            <span className="block font-bold text-green-dark group-hover:text-orange">{action.label}</span>
            <span className="mt-0.5 block text-xs leading-5 text-muted">{action.description}</span>
          </span>
        </Link>
      ))}
      </div>
    </div>
  )
}