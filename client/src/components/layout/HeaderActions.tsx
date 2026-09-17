import { CartIcon } from '../../assets/icons'
import { useCart } from '../../hooks/useCart'
import { AccountMenu } from './AccountMenu'
import type { ReactElement } from 'react'

interface HeaderActionsProps {
  isCartDrawerOpen: boolean
  onOpenCart: () => void
}

export function HeaderActions({ isCartDrawerOpen, onOpenCart }: HeaderActionsProps): ReactElement {
  const { totalQuantity } = useCart()

  return (
    <div className="flex items-center ml-auto gap-[11px] md:gap-[18px]">
      <AccountMenu />
      <button
        className="relative flex items-center gap-[6px] text-green-dark text-[13px] font-bold p-[5px] md:p-0"
        type="button"
        aria-label={`Open cart with ${totalQuantity} items`}
        aria-haspopup="dialog"
        aria-expanded={isCartDrawerOpen}
        onClick={onOpenCart}
      >
        <CartIcon size={22} />
        <span className="hidden md:block">Cart</span>
        <b className="grid place-items-center min-w-[18px] h-[18px] px-[4px] rounded-full bg-orange text-white text-[10px] font-bold">{totalQuantity}</b>
      </button>
    </div>
  )
}