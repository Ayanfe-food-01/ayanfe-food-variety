import { Link } from 'react-router-dom'
import { ArrowRight } from '../../assets/icons'
import { CartDrawerSummary } from './CartDrawerSummary'

interface CartDrawerFooterProps {
  totalQuantity: number
  subtotalFormatted: string
  canCheckout: boolean
  onClose: () => void
}

export function CartDrawerFooter({ totalQuantity, subtotalFormatted, canCheckout, onClose }: CartDrawerFooterProps) {
  return (
    <footer className="border-t border-line bg-card px-[18px] pt-4 pb-4 pr-[max(18px,env(safe-area-inset-right))] pl-[max(18px,env(safe-area-inset-left))]">
      <CartDrawerSummary totalQuantity={totalQuantity} subtotalFormatted={subtotalFormatted} />
      {!canCheckout && (
        <p className="mt-3 text-[12px] leading-normal text-orange" role="alert">
          One or more items are no longer available in the requested quantity. Update or remove them before checkout.
        </p>
      )}
      {canCheckout ? (
        <Link
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-green px-4 py-[14px] text-[13px] font-bold text-cream shadow-[0_14px_28px_rgb(50_79_45/0.22)] transition-[background-color,transform] hover:bg-green-dark hover:-translate-y-px"
          to="/checkout"
          onClick={onClose}
        >
          Proceed to checkout <ArrowRight size={16} />
        </Link>
      ) : (
        <Link
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-sage px-4 py-[14px] text-[13px] font-bold text-muted shadow-none cursor-not-allowed"
          to="/cart"
          onClick={onClose}
        >
          Update cart to checkout
        </Link>
      )}
      <div className="mt-3.5 flex items-center justify-center gap-6">
        <Link className="text-[12px] font-extrabold text-muted underline underline-offset-[3px] transition-colors hover:text-orange" to="/cart" onClick={onClose}>
          View cart
        </Link>
        <Link className="text-[12px] font-extrabold text-muted underline underline-offset-[3px] transition-colors hover:text-orange" to="/shop" onClick={onClose}>
          Continue shopping
        </Link>
      </div>
    </footer>
  )
}
