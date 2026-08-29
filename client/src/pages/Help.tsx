import { useMemo, useState, type ComponentType, type FormEvent, type MouseEvent } from 'react'
import {
  ArrowUpRight,
  CartIcon,
  ClipboardListIcon,
  CloseIcon,
  CreditCardIcon,
  HelpIcon,
  LayersIcon,
  MailIcon,
  PhoneIcon,
  RefreshCwIcon,
  SearchIcon,
  TruckIcon,
  UserIcon,
} from '../assets/icons'
import type { IconProps } from '../assets/icons/types'
import { FaqAccordion, type FaqItem } from '../components/help/FaqAccordion'
import { searchHelpFaqs } from '../components/help/helpSearch'
import { Footer } from '../components/layout/Footer'
import { Navbar } from '../components/layout/Navbar'
import { Breadcrumb } from '../components/ui/Breadcrumb'
import { useStoreSettings } from '../hooks/useStoreSettings'
import { Seo } from '../seo/Seo'
import { getBreadcrumbSchema, HELP_DESCRIPTION, HELP_TITLE } from '../seo/config'
import { Link } from 'react-router-dom'

interface HelpCategory {
  id: string
  icon: ComponentType<IconProps>
  title: string
  intro: string
  faqs: FaqItem[]
}

const helpCategories: HelpCategory[] = [
  {
    id: 'ordering',
    icon: CartIcon,
    title: 'Ordering & Shopping',
    intro: 'How to find, choose, and add products to your cart.',
    faqs: [
      {
        question: 'How do I browse the products?',
        answer: (
          <>
            <p>
              Open <Link to="/shop">Shop</Link> to browse everything. Use the search bar to look up a product by name,
              filter by category (for example Rice or Beans), and sort the results the way you like. The{' '}
              <Link to="/new-arrivals">New arrivals</Link> page shows the latest additions.
            </p>
          </>
        ),
      },
      {
        question: 'How do I choose a size or quantity?',
        answer: (
          <p>
            Some products are sold in different sizes. On those products, choose your size on the product page, then set
            the quantity you want. Products without size options can be added straight from the catalogue. Your choice
            is saved when you add the item to your cart.
          </p>
        ),
      },
      {
        question: 'How do I add a product to my cart?',
        answer: (
          <p>
            Tap “Add to cart” on a product card or on the product page. A confirmation message appears and the cart
            badge in the header updates right away. Tap the cart icon whenever you’re ready to review or change your
            items.
          </p>
        ),
      },
      {
        question: 'How do I view or manage my cart?',
        answer: (
          <p>
            Tap the cart icon in the header to open your cart. From there you can change quantities, remove items, and
            continue to checkout or open the full <Link to="/cart">cart page</Link>.
          </p>
        ),
      },
      {
        question: 'What is the difference between Retail and Wholesale shopping?',
        answer: (
          <p>
            Retail is everyday shopping at the standard unit price — you can do this as a guest without an account.
            Wholesale shows bulk, quantity-based prices and is available to signed-in customers. You can switch between
            the two with the “Shopping Mode” switch in the store navigation.
          </p>
        ),
      },
      {
        question: 'How does quantity-based pricing work?',
        answer: (
          <p>
            For wholesale, the price per unit goes down as you buy more. Each size is split into price bands such as
            1–9 units, 10–49 units, and 50+ units. On a product page in Wholesale mode, choose your quantity to see the
            unit price for that quantity, and the full price table is listed on the page. Some items also have a minimum
            order quantity (MOQ).
          </p>
        ),
      },
    ],
  },
  {
    id: 'payment',
    icon: CreditCardIcon,
    title: 'Payment',
    intro: 'How payment works, from bank transfer to payment confirmation.',
    faqs: [
      {
        question: 'Which payment methods do you accept?',
        answer: (
          <p>
            We currently accept <strong>bank transfer</strong>. At checkout you will see the store’s bank name, account
            name, account number, and transfer instructions. Please transfer the exact order total shown.
          </p>
        ),
      },
      {
        question: 'How is my payment confirmed?',
        answer: (
          <p>
            Your order starts as “payment pending”. After you transfer the money, submit your payment proof. The store
            reviews it and, once verified, your payment is marked as confirmed and your order can move forward.
          </p>
        ),
      },
      {
        question: 'How do I submit my payment proof?',
        answer: (
          <>
            <p>
              From your order confirmation or your order details, choose “Submit payment proof”. You will enter your
              sender name, the amount transferred, and the date and time of the transfer, and you can include the
              transaction reference if your bank provides one.
            </p>
            <p>
              Attach a receipt or screenshot of the transfer — JPG, PNG, WEBP, or iPhone HEIC/HEIF images up to 5&nbsp;MB
              are supported — then submit it for review.
            </p>
          </>
        ),
      },
      {
        question: 'What references should I keep?',
        answer: (
          <p>
            Your order number (for example AFV-2026-000123) is the main reference for your purchase — keep it for
            tracking and support. When submitting payment proof, you can also include the bank’s transaction reference
            to help us verify your payment faster.
          </p>
        ),
      },
    ],
  },
  {
    id: 'delivery',
    icon: TruckIcon,
    title: 'Delivery & Pickup',
    intro: 'Your options for receiving your order.',
    faqs: [
      {
        question: 'What delivery options are available?',
        answer: (
          <p>
            At checkout you can choose <strong>Pickup</strong> or <strong>Delivery</strong>. Pickup means collecting
            your order from the store when it is ready, with no delivery fee. Delivery means your order is brought to
            the address you enter. Once your order is placed, this choice cannot be changed.
          </p>
        ),
      },
      {
        question: 'How much is delivery?',
        answer: (
          <p>
            The delivery fee is calculated from the products in your cart and shown on the summary before you place the
            order. Pickup has no delivery fee.
          </p>
        ),
      },
      {
        question: 'When is my order ready and how will I know?',
        answer: (
          <p>
            We contact you using the phone number on your order when your items are ready for collection or on their
            way to you. You can review the store’s pickup and delivery information on the{' '}
            <Link to="/contact">Contact page</Link>.
          </p>
        ),
      },
    ],
  },
  {
    id: 'wholesale',
    icon: LayersIcon,
    title: 'Wholesale Shopping',
    intro: 'Bulk, quantity-based pricing for signed-in customers.',
    faqs: [
      {
        question: 'What is wholesale shopping?',
        answer: (
          <p>
            Wholesale shopping shows lower unit prices when you buy in bulk. Instead of a single
            price, each product uses quantity-based tiers, so the more you buy, the lower the price per unit.
          </p>
        ),
      },
      {
        question: 'How do I shop wholesale?',
        answer: (
          <p>
            Sign in to your customer account and switch “Shopping Mode” to Wholesale in the store navigation. Product
            cards will then show the “Wholesale from” price for each item.
          </p>
        ),
      },
      {
        question: 'Do I need an account to shop wholesale?',
        answer: (
          <p>
            Yes. Wholesale is available to signed-in customers and does not require any approval. If you choose
            Wholesale while signed out, you will be asked to{' '}
            <Link to="/login">sign in or create a free account</Link> first.
          </p>
        ),
      },
      {
        question: 'How do wholesale price tiers work?',
        answer: (
          <p>
            Each size is divided into quantity bands, such as 1–9 units, 10–49 units, and 50+ units, with a unit price
            for each band. On a product page in Wholesale mode you can set the quantity and see the unit price for that
            quantity, plus the complete price table.
          </p>
        ),
      },
      {
        question: 'What is a minimum order quantity (MOQ)?',
        answer: (
          <p>
            Some wholesale products require a minimum quantity per order. The product page shows “Minimum order: N
            units”, and you cannot add a quantity below that.
          </p>
        ),
      },
      {
        question: 'How do I switch back to Retail?',
        answer: (
          <p>
            Use the same “Shopping Mode” switch in the store navigation and choose Retail. You can switch between Retail
            and Wholesale at any time.
          </p>
        ),
      },
    ],
  },
  {
    id: 'orders',
    icon: ClipboardListIcon,
    title: 'Orders & Tracking',
    intro: 'Placing orders, viewing them, and checking their status.',
    faqs: [
      {
        question: 'How do I place an order?',
        answer: (
          <p>
            Add items to your cart and go to checkout. Enter your contact details, choose pickup or delivery, select
            bank transfer, and place the order. You get an order number and a confirmation page right away.
          </p>
        ),
      },
      {
        question: 'How do I view my orders?',
        answer: (
          <p>
            Sign in and open <Link to="/orders">Orders</Link> (or the account icon in the header) to see all your orders
            and open any of them for details. From there you can submit payment proof while your payment is still
            pending, and cancel orders that are still at “Order Placed” or “Processing”.
          </p>
        ),
      },
      {
        question: 'How do I track an order as a guest?',
        answer: (
          <p>
            Use the <Link to="/track-order">Track order</Link> page with your order number and the email address or
            phone number you used at checkout. This works for orders placed without an account — you also receive a
            secure order link after checkout. Orders placed from an account should be viewed by signing in.
          </p>
        ),
      },
      {
        question: 'How do I check my order status?',
        answer: (
          <p>
            Orders move through Order Placed, Processing, Out for Delivery, then Delivered (or Cancelled). Payment is
            tracked separately (Pending, Paid, or Rejected). Your order details and the tracker show the current stage.
          </p>
        ),
      },
    ],
  },
  {
    id: 'returns',
    icon: RefreshCwIcon,
    title: 'Returns & Refunds',
    intro: 'Cancelling an order or getting help with returns and refunds.',
    faqs: [
      {
        question: 'Can I cancel an order?',
        answer: (
          <p>
            Yes. If you placed an order from an account and it is still at “Order Placed” or “Processing”, you can
            cancel it from your <Link to="/orders">orders</Link>. Once an order is out for delivery or delivered, it can
            no longer be cancelled.
          </p>
        ),
      },
      {
        question: 'What should I do about a return or refund?',
        answer: (
          <p>
            Contact us with your order number and explain the issue. Our team will review it and let you know the next
            steps — reach us through the <Link to="/contact">Contact page</Link>, WhatsApp, or email.
          </p>
        ),
      },
    ],
  },
  {
    id: 'account',
    icon: UserIcon,
    title: 'Account & Login',
    intro: 'Creating an account, signing in, and shopping as a guest.',
    faqs: [
      {
        question: 'How do I create an account?',
        answer: (
          <p>
            Open the <Link to="/login">sign-in page</Link> and tap “Don’t have an account? Sign up”. Enter your name,
            email address, and a password with at least 6 characters, then confirm the 6-digit verification code we
            email you to verify your account.
          </p>
        ),
      },
      {
        question: 'How do I sign in?',
        answer: (
          <p>
            On the <Link to="/login">sign-in page</Link>, choose “Continue with Email” and enter your email and password.
            If Google sign-in is available, you can also choose “Continue with Google” to use your Google account.
          </p>
        ),
      },
      {
        question: 'What if I forgot my password?',
        answer: (
          <p>
            Tap “Forgot Password?” on the <Link to="/login">sign-in form</Link> and follow the reset link we email you.
          </p>
        ),
      },
      {
        question: 'Can I shop and check out without an account?',
        answer: (
          <p>
            Yes. You can browse, add to cart, and place an order as a guest. At checkout choose “Continue as Guest”.
            Guest orders are confirmed with your email address and phone number, and you can track them with the Track
            order page or the secure link you get after checkout. Creating an account keeps all your orders in one
            place.
          </p>
        ),
      },
    ],
  },
  {
    id: 'contact',
    icon: PhoneIcon,
    title: 'Contact Support',
    intro: 'How to reach our team when you need direct help.',
    faqs: [
      {
        question: 'How can I contact you?',
        answer: (
          <p>
            The <Link to="/contact">Contact page</Link> lists our phone number, email address, opening hours, and
            pickup location. You can also chat with us on WhatsApp using the chat link or the floating WhatsApp button.
          </p>
        ),
      },
      {
        question: 'What should I have ready when I contact you?',
        answer: (
          <p>
            Your order number (if you have one) and the email address or phone number you used at checkout. This helps
            us find your order quickly.
          </p>
        ),
      },
    ],
  },
]

const quickLinks = [
  { label: 'Shop now', href: '/shop' },
  { label: 'Track your order', href: '/track-order' },
  { label: 'Your orders', href: '/orders' },
  { label: 'Sign in', href: '/login' },
]

export function Help() {
  const { settings } = useStoreSettings()
  const phone = settings?.businessPhone?.trim()
  const email = settings?.businessEmail?.trim()
  const whatsapp = settings?.whatsappNumber?.trim()
  const whatsappHref = whatsapp ? `https://wa.me/${whatsapp.replace(/\D/g, '').replace(/^0/, '234')}` : undefined

  const [query, setQuery] = useState('')
  const { tokens, categories: searchCategories, total } = useMemo(() => searchHelpFaqs(helpCategories, query), [query])
  const isSearching = tokens.length > 0

  const clearSearch = () => setQuery('')

  const handleSearchSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
  }

  const handleCategoryJump = (event: MouseEvent<HTMLAnchorElement>, id: string) => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
    event.preventDefault()
    const section = document.getElementById(id)
    if (!section) return
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    section.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' })
    const heading = section.querySelector<HTMLElement>('h2')
    heading?.setAttribute('tabindex', '-1')
    heading?.focus({ preventScroll: true })
  }

  const renderCategorySections = (categories: HelpCategory[]) => (
    <div className="mt-16 grid gap-14 lg:grid-cols-2 lg:gap-x-12 lg:gap-y-16">
      {categories.map(({ icon: Icon, id, title, intro, faqs }) => (
        <section className="faq-section" id={id} key={id} aria-labelledby={`${id}-heading`}>
          <div className="flex items-center gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-green/10 text-green" aria-hidden="true">
              <Icon size={19} />
            </span>
            <div>
              <p className="m-0 text-[11px] font-bold uppercase tracking-[0.16em] text-orange">Help topic</p>
              <h2 id={`${id}-heading`} className="m-0 text-2xl font-bold leading-tight tracking-[-0.03em] text-green-dark sm:text-[1.7rem]">
                {title}
              </h2>
            </div>
          </div>
          <p className="mt-3 text-sm leading-6 text-muted">{intro}</p>
          <FaqAccordion className="mt-6" idPrefix={id} items={faqs} key={`${id}-${query}`} />
        </section>
      ))}
    </div>
  )

  return (
    <>
      <Seo
        title={HELP_TITLE}
        description={HELP_DESCRIPTION}
        canonicalPath="/help"
        jsonLd={getBreadcrumbSchema([{ name: 'Home', path: '/' }, { name: 'Help', path: '/help' }])}
      />
      <Navbar />
      <main>
        <section className="border-b border-line/70 bg-sage/35">
          <div className="container py-10 sm:py-14 lg:py-16">
            <Breadcrumb className="mb-7" items={[{ label: 'Home', href: '/' }, { label: 'Help' }]} />
            <div className="max-w-2xl">
              <p className="mb-3 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-orange">
                <span className="inline-block size-2 rounded-full bg-orange" />
                Help centre
              </p>
              <h1 className="m-0 text-4xl font-bold leading-tight tracking-[-0.05em] text-green-dark sm:text-5xl">
                How can we help?
              </h1>
              <p className="mt-4 max-w-xl text-base leading-7 text-muted">
                Find answers about shopping, orders, payment, delivery and accounts — or get in touch with our team
                directly.
              </p>
            </div>
          </div>
        </section>

        <section className="container py-14 sm:py-18 lg:py-24" aria-labelledby="help-topics-heading">
          <div className="mx-auto max-w-2xl">
            <form className="help-search" role="search" onSubmit={handleSearchSubmit}>
              <label className="sr-only" htmlFor="help-search-input">
                Search help questions and answers
              </label>
              <div className="help-search-box">
                <SearchIcon className="help-search-icon" size={20} strokeWidth={2} />
                <input
                  className="help-search-input"
                  id="help-search-input"
                  type="search"
                  placeholder="Search for help…"
                  autoComplete="off"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  aria-controls="help-search-results"
                />
                {query.length > 0 && (
                  <button className="help-search-clear" type="button" onClick={clearSearch} aria-label="Clear search">
                    <CloseIcon size={14} strokeWidth={2.5} /> Clear
                  </button>
                )}
              </div>
            </form>
            {isSearching && (
              <p className="help-search-meta" role="status" aria-live="polite">
                {total === 0
                  ? `No results found for “${query.trim()}”.`
                  : `We found ${total} ${total === 1 ? 'result' : 'results'} for “${query.trim()}”.`}
              </p>
            )}
          </div>

          <div className="mt-12 max-w-2xl">
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.16em] text-orange">
              {isSearching ? 'Search results' : 'Browse help topics'}
            </p>
            <h2 id="help-topics-heading" className="m-0 text-3xl font-bold leading-tight tracking-[-0.04em] text-green-dark sm:text-4xl">
              {isSearching ? `Results for “${query.trim()}”` : 'What do you need help with?'}
            </h2>
            <p className="mt-4 text-base leading-7 text-muted">
              {isSearching
                ? 'These questions and answers match the words you searched for.'
                : 'Choose a topic to jump to its questions and answers.'}
            </p>
          </div>

          <div id="help-search-results">
            {isSearching ? (
              searchCategories ? (
                <div>
                  {renderCategorySections(searchCategories)}
                  <div className="mt-16">
                    <button
                      className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-line bg-white px-5 py-2.5 text-sm font-bold text-green transition-colors hover:border-green/50 hover:bg-sage/20"
                      type="button"
                      onClick={clearSearch}
                    >
                      ← Browse all help topics
                    </button>
                  </div>
                </div>
              ) : (
                <div className="help-no-results">
                  <span className="help-no-results-icon" aria-hidden="true">
                    <HelpIcon size={28} />
                  </span>
                  <h3>Sorry, we couldn’t find an answer.</h3>
                  <p>Try different words, or contact our team and we’ll be happy to help with your question.</p>
                  <div className="help-no-results-actions">
                    <Link className="rounded-xl bg-orange px-6 py-3 font-bold text-white transition-colors hover:bg-orange/90" to="/contact">
                      Contact support
                    </Link>
                    {whatsappHref && (
                      <a
                        className="rounded-xl border border-line bg-white px-6 py-3 font-bold text-green transition-colors hover:bg-sage/20"
                        href={whatsappHref}
                      >
                        Chat on WhatsApp
                      </a>
                    )}
                  </div>
                  <button className="help-no-results-reset" type="button" onClick={clearSearch}>
                    Clear search
                  </button>
                </div>
              )
            ) : (
              <>
                <div className="mt-10 grid gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-4">
                  {helpCategories.map(({ icon: Icon, id, title }) => (
                    <a
                      className="help-category-anchor rounded-2xl border border-line bg-white p-6 transition-colors hover:border-green/40"
                      href={`#${id}`}
                      key={id}
                      onClick={(event) => handleCategoryJump(event, id)}
                    >
                      <span className="grid size-12 place-items-center rounded-2xl bg-green/10 text-green" aria-hidden="true">
                        <Icon size={22} />
                      </span>
                      <span className="mt-5 block text-lg font-bold text-green-dark">{title}</span>
                      <span className="mt-2 flex items-center gap-1.5 text-sm font-bold text-green">
                        View answers <ArrowUpRight size={15} />
                      </span>
                    </a>
                  ))}
                </div>

                {renderCategorySections(helpCategories)}

                <div className="mt-16" aria-labelledby="help-shortcuts-heading">
                  <p id="help-shortcuts-heading" className="text-xs font-bold uppercase tracking-[0.16em] text-muted">
                    Popular shortcuts
                  </p>
                  <div className="mt-4 flex flex-wrap gap-3">
                    {quickLinks.map((link) => (
                      <Link
                        className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-line bg-white px-5 py-2.5 text-sm font-bold text-green transition-colors hover:border-green/50 hover:bg-sage/20"
                        to={link.href}
                        key={link.href}
                      >
                        {link.label} <ArrowUpRight size={15} />
                      </Link>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </section>

        <section className="mb-8 bg-green-dark py-14 text-cream sm:mb-10 sm:py-18 lg:py-24" aria-labelledby="still-need-help-heading">
          <div className="container">
            <div className="max-w-2xl">
              <p className="mb-3 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-orange">
                <HelpIcon size={15} /> Still need help
              </p>
              <h2 id="still-need-help-heading" className="m-0 text-3xl font-bold tracking-[-0.04em] sm:text-4xl">
                Can’t find what you’re looking for?
              </h2>
              <p className="mt-4 max-w-xl text-base leading-7 text-cream/65">
                Our team is happy to help with your order, payment, delivery or account questions.
              </p>
            </div>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link className="rounded-xl bg-orange px-6 py-3 font-bold text-white transition-colors hover:bg-orange/90" to="/contact">
                Contact the team
              </Link>
              <div className="flex flex-wrap items-center gap-x-5 gap-y-3 text-sm text-cream/65">
                {phone && (
                  <a className="inline-flex items-center gap-2 font-bold text-cream transition-colors hover:text-orange" href={`tel:${phone}`}>
                    <PhoneIcon size={16} /> Call us
                  </a>
                )}
                {email && (
                  <a className="inline-flex items-center gap-2 font-bold text-cream transition-colors hover:text-orange" href={`mailto:${email}`}>
                    <MailIcon size={16} /> Email us
                  </a>
                )}
                {whatsappHref && (
                  <a className="inline-flex items-center gap-2 font-bold text-orange transition-colors hover:text-cream" href={whatsappHref} target="_blank" rel="noreferrer">
                    Chat on WhatsApp <ArrowUpRight size={15} />
                  </a>
                )}
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}