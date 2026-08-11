import { Link } from 'react-router-dom'
import { ArrowRight, BagIcon, CloseIcon } from '../assets/icons'
import { Footer } from '../components/layout/Footer'
import { Navbar } from '../components/layout/Navbar'
import type { CartItem } from '../context/cartContext'
import { useCart } from '../hooks/useCart'

const formatPrice = (price: number) =>
  new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0,
  }).format(price)

interface QuantityControlsProps {
  item: CartItem
  onDecrease: () => void
  onIncrease: () => void
}

function QuantityControls({ item, onDecrease, onIncrease }: QuantityControlsProps) {
  return (
    <div className="flex h-10 w-fit items-center rounded-lg border border-line bg-cream" aria-label={`Quantity for ${item.name}`}>
      <button
        className="grid size-9 place-items-center text-lg text-muted transition-colors hover:text-green disabled:cursor-not-allowed disabled:opacity-40"
        type="button"
        aria-label={`Decrease ${item.name} quantity`}
        disabled={item.quantity === 1}
        onClick={onDecrease}
      >
        −
      </button>
      <output className="min-w-7 text-center text-sm font-bold text-green-dark" aria-live="polite">
        {item.quantity}
      </output>
      <button
        className="grid size-9 place-items-center text-lg text-muted transition-colors hover:text-green"
        type="button"
        aria-label={`Increase ${item.name} quantity`}
        onClick={onIncrease}
      >
        +
      </button>
    </div>
  )
}

function EmptyCart() {
  return (
    <section className="container flex min-h-[calc(100vh-68px)] items-center justify-center py-16 md:min-h-[calc(100vh-78px)]">
      <div className="w-full max-w-xl rounded-3xl border border-line bg-white px-6 py-14 text-center shadow-sm sm:px-10">
        <div className="mx-auto grid size-16 place-items-center rounded-full bg-sage text-green">
          <BagIcon size={28} />
        </div>
        <p className="mt-6 text-[11px] font-bold uppercase tracking-[0.18em] text-orange">Your basket is waiting</p>
        <h1 className="mt-3 text-4xl font-bold tracking-[-0.04em] text-green-dark sm:text-5xl">Your cart is empty</h1>
        <p className="mx-auto mt-4 max-w-md text-sm leading-6 text-muted">
          Browse our carefully sourced foodstuff and add your everyday favourites to get started.
        </p>
        <Link
          className="mt-7 inline-flex items-center gap-2 rounded-full bg-green px-5 py-3 text-sm font-bold text-cream transition-colors hover:bg-green-dark"
          to="/shop"
        >
          Continue shopping <ArrowRight size={16} />
        </Link>
      </div>
    </section>
  )
}

export function Cart() {
  const {
    items,
    subtotal,
    totalQuantity,
    getItemSubtotal,
    increaseQuantity,
    decreaseQuantity,
    removeFromCart,
    clearCart,
  } = useCart()

  return (
    <>
      <Navbar />
      <main>
        {items.length === 0 ? (
          <EmptyCart />
        ) : (
          <>
            <section className="border-b border-line/70 bg-sage/35">
              <div className="container py-12 sm:py-16">
                <p className="mb-3 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-orange">
                  <span className="inline-block size-2 rounded-full bg-orange" />
                  Your order
                </p>
                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
                  <div>
                    <h1 className="m-0 text-5xl font-bold tracking-[-0.05em] text-green-dark sm:text-6xl">Cart</h1>
                    <p className="mt-4 text-base text-muted">
                      {totalQuantity} {totalQuantity === 1 ? 'item' : 'items'} ready for your kitchen.
                    </p>
                  </div>
                  <button className="w-fit text-sm font-bold text-muted transition-colors hover:text-orange" type="button" onClick={clearCart}>
                    Clear cart
                  </button>
                </div>
              </div>
            </section>

            <section className="container py-12 sm:py-16 lg:py-24">
              <div className="grid items-start gap-10 lg:grid-cols-[1fr_360px] lg:gap-16">
                <div className="space-y-4" aria-label="Cart items">
                  {items.map((item) => (
                    <article className="flex gap-4 rounded-2xl border border-line bg-white p-4 sm:gap-6 sm:p-5" key={item.id}>
                      <img className="size-24 shrink-0 rounded-xl object-cover sm:size-32" src={item.image} alt={item.name} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.15em] text-orange">{item.unit}</p>
                            <h2 className="m-0 text-lg font-bold text-green-dark sm:text-xl">{item.name}</h2>
                          </div>
                          <button
                            className="grid size-8 shrink-0 place-items-center rounded-full text-muted transition-colors hover:bg-sage hover:text-green"
                            type="button"
                            aria-label={`Remove ${item.name} from cart`}
                            onClick={() => removeFromCart(item.id)}
                          >
                            <CloseIcon size={17} />
                          </button>
                        </div>
                        <div className="mt-5 flex flex-wrap items-end justify-between gap-4">
                          <QuantityControls
                            item={item}
                            onDecrease={() => decreaseQuantity(item.id)}
                            onIncrease={() => increaseQuantity(item.id)}
                          />
                          <div className="text-right">
                            <p className="m-0 text-xs text-muted">{formatPrice(item.price)} each</p>
                            <p className="mt-1 text-base font-bold text-green-dark">{formatPrice(getItemSubtotal(item))}</p>
                          </div>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>

                <aside className="rounded-2xl border border-line bg-white p-6 shadow-sm sm:p-8" aria-labelledby="summary-heading">
                  <h2 id="summary-heading" className="m-0 text-2xl font-bold tracking-[-0.03em] text-green-dark">Order summary</h2>
                  <div className="my-6 space-y-4 border-y border-line py-5 text-sm">
                    <div className="flex justify-between gap-4 text-muted">
                      <span>Items</span>
                      <span>{totalQuantity}</span>
                    </div>
                    <div className="flex justify-between gap-4 text-muted">
                      <span>Subtotal</span>
                      <span className="font-bold text-green-dark">{formatPrice(subtotal)}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <span className="font-bold text-green-dark">Total</span>
                    <strong className="text-2xl text-green-dark">{formatPrice(subtotal)}</strong>
                  </div>
                  <Link
                    className="mt-7 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-green py-3.5 text-sm font-bold text-cream shadow-lg shadow-green/15 transition-all hover:-translate-y-0.5 hover:bg-green-dark"
                    to="/checkout"
                  >
                    Proceed to checkout <ArrowRight size={16} />
                  </Link>
                  <Link className="mt-4 inline-flex w-full items-center justify-center text-sm font-bold text-muted transition-colors hover:text-green" to="/shop">
                    Continue shopping
                  </Link>
                </aside>
              </div>
            </section>
          </>
        )}
      </main>
      <Footer />
    </>
  )
}