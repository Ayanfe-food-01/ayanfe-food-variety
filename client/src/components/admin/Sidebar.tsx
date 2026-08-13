import { NavLink } from 'react-router-dom'
import { ArrowRight } from '../../assets/icons'

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
  onLogout: () => void
}

const links = [
  { label: 'Dashboard', to: '/admin' },
  { label: 'Orders', to: '/admin/orders' },
  { label: 'Products & inventory', to: '/admin/products' },
  { label: 'Categories', to: '/admin/categories' },
  { label: 'Promotional banners', to: '/admin/banners' },
  { label: 'Payments', to: '/admin/payments' },
  { label: 'Settings', to: '/admin/settings' },
]

export function Sidebar({ isOpen, onClose, onLogout }: SidebarProps) {
  return (
    <>
      {isOpen && (
        <button
          className="fixed inset-0 z-30 bg-green-dark/30 lg:hidden"
          type="button"
          aria-label="Close admin navigation"
          onClick={onClose}
        />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r border-green-dark/10 bg-green-dark px-5 py-6 text-cream transition-transform duration-200 lg:static lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center gap-3 px-2">
          <img className="h-20 w-20 rounded-xl bg-white object-contain p-1" src="/branding/ayanfe-food-variety-logo.png" alt="Ayanfe Food Variety logo" />
          <p className="m-0 text-xs text-cream/55">Admin portal</p>
        </div>

        <nav className="mt-10 space-y-1" aria-label="Admin navigation">
          {links.map((link) => (
            <NavLink
              className={({ isActive }) =>
                `flex items-center justify-between rounded-xl px-3 py-3 text-sm font-semibold transition-colors ${
                  isActive ? 'bg-cream text-green-dark' : 'text-cream/70 hover:bg-cream/10 hover:text-cream'
                }`
              }
              end={link.to === '/admin'}
              key={link.to}
              to={link.to}
              onClick={onClose}
            >
              {link.label}
              <ArrowRight size={16} />
            </NavLink>
          ))}
        </nav>

        <div className="mt-auto">
          <button
            className="flex w-full items-center justify-center rounded-xl bg-cream px-4 py-3 text-sm font-bold text-green-dark transition-colors hover:bg-white"
            type="button"
            onClick={onLogout}
          >
            Logout
          </button>
        </div>
      </aside>
    </>
  )
}