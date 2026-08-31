import { ArrowRight, CheckIcon, ShieldIcon } from '../assets/icons'
import { Footer } from '../components/layout/Footer'
import { Navbar } from '../components/layout/Navbar'
import { Breadcrumb } from '../components/ui/Breadcrumb'
import { Seo } from '../seo/Seo'
import { getBreadcrumbSchema, RETURN_REFUND_DESCRIPTION, RETURN_REFUND_TITLE } from '../seo/config'
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

export function ReturnRefundPolicy() {
  const sections: PolicySection[] = [
    {
      id: 'eligibility',
      heading: 'Eligibility for Returns',
      body: (
        <div className="space-y-5 text-base leading-8 text-muted">
          <p>
            You may be eligible for a return or refund if there is a genuine issue with your order, such as a product
            that arrives damaged, is the wrong item, is missing, or is otherwise not in acceptable condition. We
            understand that food and consumable products are special, so each request is reviewed on a case-by-case
            basis.
          </p>
          <p>
            To be considered, please contact us with your order number and details of the issue as soon as you notice
            it — ideally within a short period after delivery. Please keep the original packaging where possible, so we
            can review the matter accurately.
          </p>
        </div>
      ),
    },
    {
      id: 'non-returnable',
      heading: 'Non-Returnable Items',
      body: (
        <div className="space-y-5 text-base leading-8 text-muted">
          <p>
            Because food and consumable products are perishable and can be sensitive to handling, the following are not
            normally eligible for return:
          </p>
          <ul className="list-disc space-y-2 pl-5">
            <li>Opened, partially used, or consumed products.</li>
            <li>
              Products where the seal or packaging has been broken, except where the product arrived damaged or
              defective in the first place.
            </li>
            <li>Products damaged because of improper storage or handling after delivery.</li>
            <li>Items that have passed their shelf life after delivery through no fault of ours.</li>
            <li>Change-of-mind requests for perishable items.</li>
          </ul>
        </div>
      ),
    },
    {
      id: 'damaged',
      heading: 'Damaged, Incorrect or Missing Products',
      body: (
        <div className="space-y-5 text-base leading-8 text-muted">
          <p>
            If you receive a product that is damaged, incorrect, missing from your order, or otherwise not in
            acceptable condition, please:
          </p>
          <ul className="list-disc space-y-2 pl-5">
            <li>Make a note of what arrived and what the issue is.</li>
            <li>Take photos of the affected product(s) and the packaging, if you are able to.</li>
            <li>Contact us with your order number as soon as possible after delivery.</li>
          </ul>
          <p>
            We rely on the details and photos you provide to investigate quickly and arrange the appropriate resolution.
          </p>
        </div>
      ),
    },
    {
      id: 'how-to-request',
      heading: 'How to Request a Refund or Report a Problem',
      body: (
        <div className="space-y-5 text-base leading-8 text-muted">
          <p>To report a problem or request a refund, the simplest way is through our Help Centre:</p>
          <ol className="list-decimal space-y-2 pl-5">
            <li>Visit the <Link className="font-semibold text-green transition-colors hover:text-orange" to="/help">Help Centre</Link>.</li>
            <li>Open your order and note the order number.</li>
            <li>
              Contact us using the details below with your order number and a description of the issue, including any
              photos.
            </li>
          </ol>
          <p>
            Please do not dispose of the product or packaging until we have reviewed your request, as we may need them
            to investigate.
          </p>
        </div>
      ),
    },
    {
      id: 'refresh-processing',
      heading: 'Refund Processing',
      body: (
        <div className="space-y-5 text-base leading-8 text-muted">
          <p>
            Once your request has been reviewed and approved, we will arrange your refund or replacement. Refunds are
            issued back to the original payment method you used for the order.
          </p>
        </div>
      ),
    },
    {
      id: 'notices',
      heading: 'Important Conditions',
      body: (
        <div className="space-y-5 text-base leading-8 text-muted">
          <ul className="list-disc space-y-2 pl-5">
            <li>Each return or refund request is reviewed individually before it is approved.</li>
            <li>Your cooperation (for example, providing photos and keeping packaging) helps us resolve matters faster.</li>
            <li>Approval is at our discretion and may be affected by the condition of the item and how promptly you report the issue.</li>
          </ul>
        </div>
      ),
    },
  ]

  return (
    <>
      <Seo
        title={RETURN_REFUND_TITLE}
        description={RETURN_REFUND_DESCRIPTION}
        canonicalPath="/return-refund-policy"
        jsonLd={getBreadcrumbSchema([
          { name: 'Home', path: '/' },
          { name: 'Return & Refund Policy', path: '/return-refund-policy' },
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
                { label: 'Return & Refund Policy' },
              ]}
            />
            <div className="max-w-2xl">
              <p className="mb-3 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-orange">
                <ShieldIcon size={15} />
                Our policies
              </p>
              <h1 className="m-0 text-4xl font-bold leading-tight tracking-[-0.05em] text-green-dark sm:text-5xl">
                Return &amp; Refund Policy
              </h1>
              <p className="mt-4 max-w-xl text-base leading-7 text-muted">
                How we handle returns, refunds and problems with your order of food and consumable products. If
                something is not right, we are here to help.
              </p>
            </div>
          </div>
        </section>

        <section className="container py-14 sm:py-18 lg:py-24" aria-labelledby="return-refund-policy-heading">
          <div className="max-w-3xl space-y-14 sm:space-y-16">
            {sections.map((section) => (
              <section key={section.id} aria-labelledby={section.id}>
                <SectionTitle id={section.id} heading={section.heading} />
                {section.body}
              </section>
            ))}

            <aside className="rounded-3xl border border-green/20 bg-sage/30 p-7 sm:p-9" aria-labelledby="contact-help-heading">
              <div className="flex items-center gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-green text-cream">
                  <CheckIcon size={20} />
                </span>
                <h2 id="contact-help-heading" className="m-0 text-xl font-bold tracking-[-0.02em] text-green-dark">
                  Need help? We are here for you.
                </h2>
              </div>
              <p className="mt-4 max-w-2xl text-base leading-7 text-muted">
                If you have any questions about a return or refund, please reach out to our team. The quickest way is
                through our Help Centre, and you can also contact us directly using the contact details on our site.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-green px-6 text-sm font-bold text-cream transition-colors hover:bg-green-dark"
                  to="/help"
                >
                  Visit the Help Centre <ArrowRight size={15} />
                </Link>
                <Link
                  className="inline-flex h-11 items-center justify-center rounded-full border border-green/25 px-6 text-sm font-bold text-green transition-colors hover:bg-green hover:text-cream"
                  to="/contact"
                >
                  Contact us
                </Link>
              </div>
            </aside>
          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}
