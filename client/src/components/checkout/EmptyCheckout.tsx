import { Link } from 'react-router-dom'
import { ArrowRight, CartIcon } from '../../assets/icons'
import { Breadcrumb } from '../ui/Breadcrumb'

export function EmptyCheckout() {
  return (
    <section className="container page-state-section flex items-center justify-center py-16">
      <div className="w-full max-w-xl">
        <Breadcrumb
          className="mb-8"
          items={[{ label: 'Home', href: '/' }, { label: 'Cart', href: '/cart' }, { label: 'Checkout' }]}
        />
        <div className="rounded-3xl border border-line bg-white px-6 py-14 text-center shadow-sm sm:px-10">
          <div className="mx-auto grid size-16 place-items-center rounded-full bg-sage text-green">
            <CartIcon size={28} />
          </div>
          <p className="mt-6 text-[11px] font-bold uppercase tracking-[0.18em] text-orange">Nothing to check out yet</p>
          <h1 className="mt-3 text-4xl font-bold tracking-[-0.04em] text-green-dark sm:text-5xl">Your cart is empty</h1>
          <p className="mx-auto mt-4 max-w-md text-sm leading-6 text-muted">
            Add a few everyday essentials to your cart before continuing to delivery.
          </p>
          <Link
            className="mt-7 inline-flex items-center gap-2 rounded-full bg-green px-5 py-3 text-sm font-bold text-cream transition-colors hover:bg-green-dark"
            to="/shop"
          >
            Continue shopping <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </section>
  )
}