import type { CustomerAccountAddress } from '../../../services/customerAccountService'
import { AddressMenu } from './AddressMenu'

interface AddressBodyProps {
  address: CustomerAccountAddress
  truncate: boolean
}

function AddressBody({ address, truncate }: AddressBodyProps) {
  const locationLine = [address.areaName, address.city, address.state].filter(Boolean).join(', ')
  const line = truncate ? 'block truncate text-xs text-muted' : 'block text-sm leading-5 text-muted'
  return (
    <div className="min-w-0">
      <div className="flex items-center gap-2">
        <p className="text-sm font-bold text-green-dark">{address.label}</p>
        {address.isDefault && (
          <span className="rounded-full bg-green px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-cream">
            Default
          </span>
        )}
      </div>
      <p className={`${line} mt-0.5`}>
        <span className="font-semibold text-green-dark">{address.recipientName}</span>
        {address.phone ? ` · ${address.phone}` : ''}
      </p>
      <span className={line}>{address.address}</span>
      {locationLine && <span className={line}>{locationLine}</span>}
      {address.instructions && (
        <span className={`${truncate ? 'block truncate' : 'block'} pt-1 text-xs italic text-muted`}>“{address.instructions}”</span>
      )}
    </div>
  )
}

interface ManageAddressCardProps {
  address: CustomerAccountAddress
  onEdit: () => void
  onSetDefault?: () => void
  onDelete: () => void
}

function ManageAddressCard({ address, onEdit, onSetDefault, onDelete }: ManageAddressCardProps) {
  return (
    <div className="rounded-2xl border border-line bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <AddressBody address={address} truncate={false} />
        <AddressMenu address={address} onEdit={onEdit} onSetDefault={onSetDefault} onDelete={onDelete} />
      </div>
    </div>
  )
}

interface SelectAddressCardProps {
  address: CustomerAccountAddress
  name: string
  selected: boolean
  onSelect: () => void
}

function SelectAddressCard({ address, name, selected, onSelect }: SelectAddressCardProps) {
  return (
    <label
      className={`block cursor-pointer rounded-xl border p-3 transition-colors ${
        selected ? 'border-green bg-sage/30' : 'border-line bg-white hover:border-green/40'
      }`}
    >
      <span className="flex items-start gap-3">
        <input
          className="mt-0.5 size-4 accent-green"
          type="radio"
          name={name}
          value={address.id}
          checked={selected}
          onChange={onSelect}
        />
        <AddressBody address={address} truncate />
      </span>
    </label>
  )
}

interface AddressCardProps {
  address: CustomerAccountAddress
  variant: 'select' | 'manage'
  name?: string
  selected?: boolean
  onSelect?: () => void
  onEdit?: () => void
  onSetDefault?: () => void
  onDelete?: () => void
}

export function AddressCard({
  address,
  variant,
  name = 'savedAddress',
  selected = false,
  onSelect,
  onEdit,
  onSetDefault,
  onDelete,
}: AddressCardProps) {
  if (variant === 'select') {
    return (
      <SelectAddressCard
        address={address}
        name={name}
        selected={selected}
        onSelect={() => onSelect?.()}
      />
    )
  }
  return (
    <ManageAddressCard
      address={address}
      onEdit={() => onEdit?.()}
      onSetDefault={onSetDefault}
      onDelete={() => onDelete?.()}
    />
  )
}