import { Link } from 'react-router-dom'
import { ArrowRight } from '../../assets/icons'

const settingsSections = [
  {
    eyebrow: 'Store information',
    title: 'Store information',
    description: 'Update your business name, call-to-order details, address, announcements, and public description.',
    to: '/admin/settings/store',
  },
  {
    eyebrow: 'Payment settings',
    title: 'Payment settings',
    description: 'Manage the bank-transfer instructions customers see after placing an order.',
    to: '/admin/settings/payment',
  },
  {
    eyebrow: 'Contact information',
    title: 'Contact information',
    description: 'Keep your public email, phone numbers, opening hours, pickup, delivery, and map details current.',
    to: '/admin/settings/contact',
  },
  {
    eyebrow: 'Security',
    title: 'Change password',
    description: 'Change the password used to access the admin portal without crowding the main settings page.',
    to: '/admin/settings/password',
  },
]

export function Settings() {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-orange">Configuration</p>
      <h1 className="mt-2 text-4xl font-bold tracking-[-0.05em] text-green-dark sm:text-5xl">Settings</h1>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">
        Choose a settings area to manage. Each section opens on its own page so the portal stays focused and easy to scan.
      </p>

      <div className="mt-8 grid gap-5 md:grid-cols-2">
        {settingsSections.map((section) => (
          <Link
            className="group rounded-2xl border border-line bg-white p-6 shadow-sm transition-all hover:-translate-y-0.5 hover:border-green/30 hover:shadow-md sm:p-7"
            key={section.to}
            to={section.to}
          >
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-orange">{section.eyebrow}</p>
            <div className="mt-3 flex items-start justify-between gap-5">
              <h2 className="text-2xl font-bold tracking-[-0.04em] text-green-dark">{section.title}</h2>
              <span className="grid size-10 shrink-0 place-items-center rounded-full bg-sage/45 text-green-dark transition-colors group-hover:bg-green group-hover:text-cream" aria-hidden="true">
                <ArrowRight size={17} />
              </span>
            </div>
            <p className="mt-3 max-w-md text-sm leading-6 text-muted">{section.description}</p>
            <span className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-green-dark">
              Open section
              <ArrowRight size={15} />
            </span>
          </Link>
        ))}
      </div>
    </div>
  )
}