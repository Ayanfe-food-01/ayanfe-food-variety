import { MoreHorizontalIcon } from '../../../assets/icons'
import type { CustomerAccountAddress } from '../../../services/customerAccountService'
import { useDropdown } from '../../../hooks/useDropdown'
import { Popover } from '../../ui/Popover'

interface AddressMenuProps {
  address: CustomerAccountAddress
  onEdit: () => void
  onSetDefault?: () => void
  onDelete: () => void
}

export function AddressMenu({ address, onEdit, onSetDefault, onDelete }: AddressMenuProps) {
  const { isOpen, close, toggle, rootRef } = useDropdown()

  return (
    <div className="relative shrink-0" ref={rootRef}>
      <button
        className="grid size-8 place-items-center rounded-full text-muted transition-colors hover:bg-sage/40 hover:text-green-dark focus:outline-none focus:ring-2 focus:ring-green/20"
        type="button"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-label={`Actions for ${address.label} address`}
        onClick={toggle}
      >
        <MoreHorizontalIcon size={18} />
      </button>
      <Popover
        isOpen={isOpen}
        onClose={close}
        className="top-[calc(100%+6px)] right-0 min-w-[180px] bg-white p-1.5"
        surface="white"
        role="menu"
        ariaLabel={`Actions for ${address.label}`}
      >
        {(closeMenu) => (
          <>
            <button
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-semibold text-ink transition-colors hover:bg-sage/40 hover:text-green-dark"
              type="button"
              role="menuitem"
              onClick={() => { closeMenu(); onEdit() }}
            >
              Edit address
            </button>
            {!address.isDefault && onSetDefault && (
              <button
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-semibold text-ink transition-colors hover:bg-sage/40 hover:text-green-dark"
                type="button"
                role="menuitem"
                onClick={() => { closeMenu(); onSetDefault() }}
              >
                Set as default
              </button>
            )}
            <div className="my-1 h-px bg-line" />
            <button
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-semibold text-orange transition-colors hover:bg-orange hover:text-white"
              type="button"
              role="menuitem"
              onClick={() => { closeMenu(); onDelete() }}
            >
              Delete address
            </button>
          </>
        )}
      </Popover>
    </div>
  )
}