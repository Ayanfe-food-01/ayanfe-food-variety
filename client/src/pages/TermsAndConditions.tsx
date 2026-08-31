import { ShieldIcon } from '../assets/icons'
import { Footer } from '../components/layout/Footer'
import { Navbar } from '../components/layout/Navbar'
import { Breadcrumb } from '../components/ui/Breadcrumb'
import { Seo } from '../seo/Seo'
import { getBreadcrumbSchema, TERMS_DESCRIPTION, TERMS_TITLE } from '../seo/config'
import { Link } from 'react-router-dom'

interface PolicySection {
  id: string
  heading: string
  body: React.ReactNode
}

function SectionTitle({ id, heading }: { id: string; heading: string }) {
  return (
    <div className="mb-4">
      <span className="mb-2 inline-block size-2 rounded-full bg-orange" aria-hidden="true" />
      <h2 id={id} className="m-0 text-2xl font-bold leading-tight tracking-[-0.02em] text-green-dark sm:text-3xl">
        {heading}
      </h2>
    </div>
  )
}

export function TermsAndConditions() {
  const sections: PolicySection[] = [
    {
      id: 'acceptance',
      heading: 'Terms & Conditions',
      body: (
        <div className="space-y-5 text-base leading-8 text-muted">
          <p>
            These Terms &amp; Conditions explain the rules for using the Ayanfe Food Variety website and for placing
            orders and requesting quotes with us. By browsing our website, creating an account, placing an order, or
            otherwise using our service, you agree to these terms.
          </p>
          <p>
            Please read these terms alongside our{' '}
            <Link className="font-semibold text-green transition-colors hover:text-orange" to="/privacy-policy">Privacy Policy</Link>{' '}
            and{' '}
            <Link className="font-semibold text-green transition-colors hover:text-orange" to="/return-refund-policy">Return &amp; Refund Policy</Link>,
            which together explain how we handle your information and how returns and refunds are managed.
          </p>
        </div>
      ),
    },
    {
      id: 'using-our-website',
      heading: 'Using Our Website',
      body: (
        <div className="space-y-5 text-base leading-8 text-muted">
          <p>
            You agree to use our website lawfully and for its intended purpose — browsing products, placing orders,
            requesting quotes, and managing your account. You are responsible for the accuracy of the information you
            provide and for keeping it up to date.
          </p>
          <p>You agree not to:</p>
          <ul className="list-disc space-y-2 pl-5">
            <li>Misuse the website or attempt to disrupt or interfere with its operation.</li>
            <li>Provide false or misleading information when placing an order.</li>
            <li>Attempt to access another customer&rsquo;s account or information.</li>
            <li>Use the website in any way that breaks applicable law.</li>
          </ul>
        </div>
      ),
    },
    {
      id: 'customer-accounts',
      heading: 'Customer Accounts',
      body: (
        <div className="space-y-5 text-base leading-8 text-muted">
          <p>
            When you create an account, you can sign in with an email address and password, or with your Google
            account where available. You are responsible for keeping your sign-in details secure and for activity
            carried out through your account.
          </p>
          <p>
            You are not required to create an account to shop with us — you can browse and place an order as a guest.
            Guest orders are confirmed using the email address and phone number you provide.
          </p>
        </div>
      ),
    },
    {
      id: 'products-info',
      heading: 'Products and Product Information',
      body: (
        <div className="space-y-5 text-base leading-8 text-muted">
          <p>
            We do our best to describe our foodstuff and products accurately, including their names, images, sizes and
            prices. Product information may change from time to time, and we update it when necessary.
          </p>
          <p>
            Product availability is not guaranteed. A product you see on the website may be out of stock, may be
            restocked, or may be removed, and availability may change between the time you add an item and the time
            your order is confirmed.
          </p>
        </div>
      ),
    },
    {
      id: 'pricing-orders',
      heading: 'Pricing and Orders',
      body: (
        <div className="space-y-5 text-base leading-8 text-muted">
          <p>
            Product prices, discounts and any delivery fees are shown at checkout before you place your order. While we
            aim to keep prices accurate, pricing may be updated when necessary.
          </p>
          <p>
            You can place an order with an account or as a guest. Once you submit your order, you will receive an order
            confirmation. Placing an order does not by itself mean the order has been finally accepted — acceptance is
            completed through the appropriate confirmation and processing steps we carry out.
          </p>
        </div>
      ),
    },
    {
      id: 'payments',
      heading: 'Payments',
      body: (
        <div className="space-y-5 text-base leading-8 text-muted">
          <p>We currently accept the following payment methods at checkout:</p>
          <ul className="list-disc space-y-2 pl-5">
            <li>
              <strong className="font-semibold text-green-dark">Online payment (Paystack).</strong> You are redirected
              to Paystack&rsquo;s secure payment page to complete your payment. Your card details are entered and
              processed by Paystack — we do not store your card information.
            </li>
            <li>
              <strong className="font-semibold text-green-dark">Bank transfer.</strong> You transfer the order total to
              the bank details shown at checkout and submit your payment proof, which we use to confirm your payment.
            </li>
          </ul>
          <p>
            Payment confirmation is required before your order can be fulfilled. We do not store your card details on
            our website.
          </p>
        </div>
      ),
    },
    {
      id: 'retail-wholesale',
      heading: 'Retail and Wholesale Purchases',
      body: (
        <div className="space-y-5 text-base leading-8 text-muted">
          <p>
            Our website supports both retail and wholesale shopping. When you shop as a wholesale customer, eligible
            products may display a wholesale price alongside the retail price, and wholesale orders may be placed at
            the rates shown at checkout.
          </p>
          <p>
            Any wholesale requirements, minimum order quantities or specific pricing for your order are confirmed with
            you before your order is finalised. Please contact us if you have questions about wholesale purchasing.
          </p>
        </div>
      ),
    },
    {
      id: 'delivery',
      heading: 'Delivery',
      body: (
        <div className="space-y-5 text-base leading-8 text-muted">
          <p>
            Orders may be fulfilled by delivery to an address you provide, or by pickup from the store, depending on
            what you choose at checkout. You are responsible for providing a valid address and for making sure the
            delivery details are correct.
          </p>
          <p>
            For practical questions about delivery, options, and how delivery works in your location, please see the
            delivery information in our{' '}
            <Link className="font-semibold text-green transition-colors hover:text-orange" to="/help">Help Centre</Link>.
          </p>
        </div>
      ),
    },
    {
      id: 'returns-refunds',
      heading: 'Returns and Refunds',
      body: (
        <div className="space-y-5 text-base leading-8 text-muted">
          <p>
            We want you to be happy with your order. If there is a problem with a product you received — such as an item
            arriving damaged, incorrect or missing — you may be eligible for a return or refund, reviewed on a
            case-by-case basis.
          </p>
          <p>
            Returns and refunds are subject to our{' '}
            <Link className="font-semibold text-green transition-colors hover:text-orange" to="/return-refund-policy">Return &amp; Refund Policy</Link>.
          </p>
          <div className="pt-2">
            <Link
              className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-green px-6 text-sm font-bold text-cream transition-colors hover:bg-green-dark"
              to="/return-refund-policy"
            >
              View Return &amp; Refund Policy
            </Link>
          </div>
        </div>
      ),
    },
    {
      id: 'reviews',
      heading: 'Reviews and Customer Content',
      body: (
        <div className="space-y-5 text-base leading-8 text-muted">
          <p>
            Customers can write reviews of products they have purchased. When you submit a review, you agree that:
          </p>
          <ul className="list-disc space-y-2 pl-5">
            <li>The review reflects your honest experience with the product.</li>
            <li>You will not include abusive, offensive, misleading or otherwise inappropriate content.</li>
            <li>You will not post content that belongs to someone else or that you have no right to share.</li>
          </ul>
          <p>
            Reviews are shown on the website for the benefit of other customers. We may decline or remove reviews that
            do not meet these expectations.
          </p>
        </div>
      ),
    },
    {
      id: 'availability',
      heading: 'Website Availability',
      body: (
        <div className="space-y-5 text-base leading-8 text-muted">
          <p>
            We work to keep our website available, but it may occasionally be unavailable or limited for reasons such
            as maintenance, updates, technical issues, or factors outside our control. We do not guarantee that the
            website will be available at all times.
          </p>
        </div>
      ),
    },
    {
      id: 'limitation',
      heading: 'Limitation of Responsibility',
      body: (
        <div className="space-y-5 text-base leading-8 text-muted">
          <p>
            We aim to provide a reliable service and accurate information, and we take reasonable care in running our
            website and fulfilling orders. However, to the extent permitted by law, our responsibility is limited to
            the products and services we actually provide, and we are not liable for losses that were not reasonably
            foreseeable, such as indirect or consequential losses.
          </p>
          <p>
            Nothing in these terms limits liability that cannot be limited by law, including liability for fraud.
          </p>
        </div>
      ),
    },
    {
      id: 'changes',
      heading: 'Changes to These Terms',
      body: (
        <div className="space-y-5 text-base leading-8 text-muted">
          <p>
            We may update these Terms &amp; Conditions from time to time to reflect changes in how we operate, new or
            updated features, or legal or technical requirements. When we make changes, we will update the date on this
            page. Please review these terms from time to time.
          </p>
        </div>
      ),
    },
    {
      id: 'contact-help',
      heading: 'Contact Us',
      body: (
        <div className="space-y-5 text-base leading-8 text-muted">
          <p>
            If you have questions about these Terms &amp; Conditions, or about placing or managing an order, our{' '}
            <Link className="font-semibold text-green transition-colors hover:text-orange" to="/help">Help Centre</Link>{' '}
            is a good place to start, and you can also reach us through the details on our{' '}
            <Link className="font-semibold text-green transition-colors hover:text-orange" to="/contact">Contact page</Link>.
          </p>
        </div>
      ),
    },
  ]

  return (
    <>
      <Seo
        title={TERMS_TITLE}
        description={TERMS_DESCRIPTION}
        canonicalPath="/terms-and-conditions"
        jsonLd={getBreadcrumbSchema([
          { name: 'Home', path: '/' },
          { name: 'Terms & Conditions', path: '/terms-and-conditions' },
        ])}
      />
      <Navbar />
      <main>
        <section className="border-b border-line/70 bg-sage/35">
          <div className="container py-10 sm:py-14 lg:py-16">
            <Breadcrumb
              className="mb-7"
              items={[
                { label: 'Home', href: '/' },
                { label: 'Terms & Conditions' },
              ]}
            />
            <div className="max-w-2xl">
              <p className="mb-3 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-orange">
                <ShieldIcon size={15} />
                Our policies
              </p>
              <h1 className="m-0 text-4xl font-bold leading-tight tracking-[-0.05em] text-green-dark sm:text-5xl">
                Terms &amp; Conditions
              </h1>
              <p className="mt-4 max-w-xl text-base leading-7 text-muted">
                The terms that apply when you use our website, place an order, and shop with Ayanfe Food Variety.
              </p>
            </div>
          </div>
        </section>

        <section className="container py-14 sm:py-18 lg:py-24" aria-labelledby="terms-and-conditions-heading">
          <div className="max-w-3xl space-y-14 sm:space-y-16">
            {sections.map((section) => (
              <section key={section.id} aria-labelledby={section.id}>
                <SectionTitle id={section.id} heading={section.heading} />
                {section.body}
              </section>
            ))}
          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}
