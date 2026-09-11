import { Breadcrumb } from '../../ui/Breadcrumb'

interface DeliveryZonesHeaderProps {
  onManageAreas: () => void
  onAddZone: () => void
}

export function DeliveryZonesHeader({ onManageAreas, onAddZone }: DeliveryZonesHeaderProps) {
  return (
    <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
      <div>
        <Breadcrumb className="mb-5" items={[{ label: 'Dashboard', href: '/admin' }, { label: 'Delivery zones & fees' }]} />
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-orange">Delivery</p>
        <h1 className="mt-2 text-4xl font-bold tracking-[-0.05em] text-green-dark sm:text-5xl">Delivery zones & fees</h1>
        <p className="mt-3 max-w-xl text-sm text-muted">Configure delivery zones and their fees. Customers select a state and city at checkout and the matching zone and fee are applied automatically.</p>
      </div>
      <div className="flex items-center gap-3">
        <button className="inline-flex items-center gap-2 whitespace-nowrap rounded-xl border border-line bg-white px-5 py-3 text-sm font-bold text-green-dark hover:bg-cream max-sm:flex-1 max-sm:justify-center" type="button" onClick={onManageAreas}>Manage areas</button>
        <button className="inline-flex items-center gap-2 whitespace-nowrap rounded-xl bg-green px-5 py-3 text-sm font-bold text-cream hover:bg-green-dark max-sm:flex-1 max-sm:justify-center" type="button" onClick={onAddZone}>Add delivery zone</button>
      </div>
    </div>
  )
}