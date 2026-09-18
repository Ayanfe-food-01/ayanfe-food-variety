import { Link } from 'react-router-dom'
import { ArrowRight, CartIcon } from '../../assets/icons'

export function CartDrawerLoading() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-2 px-[max(24px,env(safe-area-inset-left))] py-8 text-center" aria-label="Loading cart">
      <div className="grid size-[58px] place-items-center rounded-full bg-sage text-green">
        <CartIcon size={26} />
      </div>
      <p className="mt-3 text-[17px] font-extrabold text-green-dark">Loading your cart…</p>
    </div>
  )
}

interface CartDrawerEmptyProps {
  onClose: () => void
}

export function CartDrawerEmpty({ onClose }: CartDrawerEmptyProps) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-2 px-[max(24px,env(safe-area-inset-left))] py-8 text-center">
      <div className="grid size-[58px] place-items-center rounded-full bg-sage text-green">
        <CartIcon size={26} />
      </div>
      <p className="mt-3 text-[17px] font-extrabold text-green-dark">Your cart is empty</p>
      <p className="mx-auto max-w-[260px] text-[13px] leading-relaxed text-muted">
        Browse our carefully sourced foodstuff and add your everyday favourites to get started.
      </p>
      <Link className="mt-3.5 inline-flex items-center gap-1.5 rounded-full bg-green px-5 py-[11px] text-[13px] font-bold text-cream transition-colors hover:bg-green-dark" to="/shop" onClick={onClose}>
        Continue shopping <ArrowRight size={15} />
      </Link>
    </div>
  )
}

interface CartDrawerErrorProps {
  error: string
  onRefresh: () => void
}

export function CartDrawerError({ error, onRefresh }: CartDrawerErrorProps) {
  return (
    <div className="mx-[18px] mt-3.5 flex flex-wrap items-center justify-between gap-1.5 rounded-[14px] border border-orange/30 bg-orange/6 px-3.5 py-3 text-[12px] leading-normal text-orange" role="alert">
      <span>{error}</span>
      <button className="border-0 bg-transparent text-[12px] font-extrabold text-orange underline cursor-pointer" type="button" onClick={() => void onRefresh()}>Refresh cart</button>
    </div>
  )
}
