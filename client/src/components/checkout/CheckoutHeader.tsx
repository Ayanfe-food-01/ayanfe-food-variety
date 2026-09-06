import type { ShoppingMode } from '../../services/authService'
import { Breadcrumb } from '../ui/Breadcrumb'

interface CheckoutHeaderProps {
  mode: ShoppingMode
}

export function CheckoutHeader({ mode }: CheckoutHeaderProps) {
  return (
    <section className="border-b border-line/70 bg-sage/35">
      <div className="container py-8 sm:py-10">
        <Breadcrumb
          className="mb-6"
          items={[{ label: 'Home', href: '/' }, { label: 'Cart', href: '/cart' }, { label: 'Checkout' }]}
        />
        <p className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-orange">
          <span className="inline-block size-2 rounded-full bg-orange" />
          Almost there
        </p>
        <h1 className="m-0 text-4xl font-bold tracking-[-0.05em] text-green-dark sm:text-5xl">Checkout</h1>
        <p className="mt-2 max-w-xl text-sm leading-6 text-muted">
          Choose pickup or delivery, confirm your details, and place your order securely.
        </p>
        <p className="mt-3 text-xs font-bold uppercase tracking-[0.14em] text-green-dark">
          {mode === 'WHOLESALE' ? 'Wholesale Order' : 'Retail Order'}
        </p>
      </div>
    </section>
  )
}