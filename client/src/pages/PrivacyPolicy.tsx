import { ShieldIcon } from '../assets/icons'
import { Footer } from '../components/layout/Footer'
import { Navbar } from '../components/layout/Navbar'
import { Breadcrumb } from '../components/ui/Breadcrumb'
import { Seo } from '../seo/Seo'
import { getBreadcrumbSchema, PRIVACY_POLICY_DESCRIPTION, PRIVACY_POLICY_TITLE } from '../seo/config'
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

export function PrivacyPolicy() {
  const sections: PolicySection[] = [
    {
      id: 'introduction',
      heading: 'Introduction',
      body: (
        <div className="space-y-5 text-base leading-8 text-muted">
          <p>
            Ayanfe Food Variety respects your privacy. This policy explains what personal information we collect when
            you use our website and place orders, how we use and protect that information, and the choices you have.
          </p>
          <p>
            By creating an account, placing an order, or otherwise using our website, you agree to the practices
            described here. We aim to keep this policy clear and accurate — where a detail depends on your specific
            situation, we describe it generally rather than overstate our practices.
          </p>
        </div>
      ),
    },
    {
      id: 'information-we-collect',
      heading: 'Information We Collect',
      body: (
        <div className="space-y-5 text-base leading-8 text-muted">
          <p>The personal information we collect depends on how you use our website:</p>
          <ul className="list-disc space-y-2 pl-5">
            <li>
              <strong className="font-semibold text-green-dark">Account information.</strong> When you create an
              account we collect your name, email address, and a password (stored as a secure, encrypted hash — we do
              not store your password in plain text). If you sign in with Google, we collect your name, email address
              and a Google account identifier.
            </li>
            <li>
              <strong className="font-semibold text-green-dark">Contact and order information.</strong> When you place
              an order — whether as a signed-in customer or as a guest — we collect your name, phone number, email
              address, and, for delivery orders, your delivery address, city and any delivery instructions. We also
              record the products, quantities and prices in your order.
            </li>
            <li>
              <strong className="font-semibold text-green-dark">Quote requests.</strong> If you request a quote, we
              collect your name, email address, phone number, any message you include, and the products you are
              interested in.
            </li>
            <li>
              <strong className="font-semibold text-green-dark">Payment-related information.</strong> For bank-transfer
              orders we collect the sender name, the amount, the transfer date and, if you provide it, a transaction
              reference and a copy of your payment receipt. We do not store your card details — see{' '}
              <a className="font-semibold text-green transition-colors hover:text-orange" href="#payment-information">Payment Information</a>{' '}
              below.
            </li>
            <li>
              <strong className="font-semibold text-green-dark">Reviews and feedback.</strong> When you review a
              product, we collect your star rating and the text of your review. Reviews are shown with the name
              associated with your account.
            </li>
            <li>
              <strong className="font-semibold text-green-dark">Newsletter.</strong> If you sign up to our newsletter,
              we collect your email address.
            </li>
            <li>
              <strong className="font-semibold text-green-dark">Technical information.</strong> To keep you signed in
              and to store your cart and checkout progress on your device, we use small amounts of storage in your
              browser (for example, your cart, a guest order reference, and a checkout draft). See{' '}
              <a className="font-semibold text-green transition-colors hover:text-orange" href="#cookies">Cookies and Similar Technologies</a>{' '}
              below.
            </li>
          </ul>
          <p>
            We do not use analytics, tracking pixels, or marketing scripts that observe your behaviour across our
            website or other websites.
          </p>
        </div>
      ),
    },
    {
      id: 'how-we-use-information',
      heading: 'How We Use Information',
      body: (
        <div className="space-y-5 text-base leading-8 text-muted">
          <p>We use the information we collect to:</p>
          <ul className="list-disc space-y-2 pl-5">
            <li>Create and manage your customer account and keep you signed in.</li>
            <li>Process and manage your orders, including order confirmations and order tracking.</li>
            <li>Arrange delivery or inform you about pickup of your order.</li>
            <li>Process payments, including sending you payment instructions and verifying payment receipts.</li>
            <li>Prepare and respond to quote requests.</li>
            <li>Provide customer support through our Help Centre and contact channels.</li>
            <li>Send you required service emails, such as order confirmations, verification codes, and password reset
            links.</li>
            <li>Publish product reviews you submit, under your account name.</li>
            <li>Prevent fraud and keep the website, your account and our systems secure.</li>
          </ul>
          <p>
            We generally use your information for the purposes described above and do not use it for unrelated
            purposes without a proper reason.
          </p>
        </div>
      ),
    },
    {
      id: 'payment-information',
      heading: 'Payment Information',
      body: (
        <div className="space-y-5 text-base leading-8 text-muted">
          <p>
            If you pay online, payments are processed by <strong className="font-semibold text-green-dark">Paystack</strong>{' '}
            through their secure, hosted payment page. When you choose this option, you are redirected to Paystack to
            enter and complete your payment. Your card details are entered and processed on Paystack&rsquo;s systems —
            we do not receive, collect, store or process your card details on our website.
          </p>
          <p>
            We do receive a confirmation of the payment outcome from Paystack so that we can update and fulfil your
            order.
          </p>
          <p>
            If you pay by bank transfer, we collect the details of your transfer (as described above) so that we can
            match your payment to your order and confirm it.
          </p>
        </div>
      ),
    },
    {
      id: 'information-sharing',
      heading: 'Information Sharing',
      body: (
        <div className="space-y-5 text-base leading-8 text-muted">
          <p>
            We do not sell your personal information. We only share information where necessary to run the service,
            with service providers that help us operate, including:
          </p>
          <ul className="list-disc space-y-2 pl-5">
            <li>
              <strong className="font-semibold text-green-dark">Payment provider (Paystack)</strong> — to process your
              online payment.
            </li>
            <li>
              <strong className="font-semibold text-green-dark">Email service provider (Resend)</strong> — to send you
              service and order-related emails.
            </li>
            <li>
              <strong className="font-semibold text-green-dark">Cloud hosting / image storage (Cloudinary)</strong> —
              to store images you upload, such as payment receipts.
            </li>
            <li>
              <strong className="font-semibold text-green-dark">Search engine verification (Google)</strong> — for the
              technical verification of our site, and for signing in with your Google account if you choose to.
            </li>
          </ul>
          <p>
            We may also disclose information if required to do so by law, or to protect the rights, safety and
            property of our customers, the business, or others.
          </p>
        </div>
      ),
    },
    {
      id: 'data-security',
      heading: 'Data Security',
      body: (
        <div className="space-y-5 text-base leading-8 text-muted">
          <p>
            We take reasonable steps to help protect your personal information from unauthorised access, loss or
            misuse. This includes storing passwords as secure hashes, using encrypted connections, keeping your session
            secure with server-side cookies, and limiting access to your information to only those who need it.
          </p>
          <p>
            No method of transmission or storage over the internet is completely secure, so while we work to protect
            your information we cannot guarantee absolute security.
          </p>
        </div>
      ),
    },
    {
      id: 'cookies',
      heading: 'Cookies and Similar Technologies',
      body: (
        <div className="space-y-5 text-base leading-8 text-muted">
          <p>
            We use a small amount of browser storage to make the website work. We do not use advertising or third-party
            tracking cookies. Specifically:
          </p>
          <ul className="list-disc space-y-2 pl-5">
            <li>
              <strong className="font-semibold text-green-dark">Session cookies.</strong> When you sign in, we set a
              secure, server-side session cookie so that you stay signed in during your visit.
            </li>
            <li>
              <strong className="font-semibold text-green-dark">Browser storage (localStorage / session storage).</strong>{' '}
              We store your cart, a reference for guest orders and checkouts, and a draft of your checkout details in
              your browser. This helps your cart persist between visits and helps you complete checkout.
            </li>
          </ul>
          <p>
            Because these technologies are needed for core features such as the cart and signing in, you may not be
            able to use parts of the website if you disable them. You can clear your browser storage at any time using
            your browser&rsquo;s settings.
          </p>
        </div>
      ),
    },
    {
      id: 'customer-rights',
      heading: 'Your Rights and Choices',
      body: (
        <div className="space-y-5 text-base leading-8 text-muted">
          <ul className="list-disc space-y-2 pl-5">
            <li>
              <strong className="font-semibold text-green-dark">Manage your account.</strong> You can sign in to manage
              your orders and account details through the website.
            </li>
            <li>
              <strong className="font-semibold text-green-dark">Choose guest checkout.</strong> You do not have to create
              an account to place an order.
            </li>
            <li>
              <strong className="font-semibold text-green-dark">Withdraw consent.</strong> You may stop signing up to or
              receiving our communications at any time by getting in touch with us.
            </li>
            <li>
              <strong className="font-semibold text-green-dark">Request access or correction.</strong> Contact us through
              the Help Centre if you would like to review or correct the personal information we hold about you, or if
              you have questions about how your information is handled.
            </li>
          </ul>
        </div>
      ),
    },
    {
      id: 'third-party-services',
      heading: 'Third-Party Services',
      body: (
        <div className="space-y-5 text-base leading-8 text-muted">
          <p>
            To keep the store secure and working, some of the information we collect is handled by the providers listed
            in{' '}
            <a className="font-semibold text-green transition-colors hover:text-orange" href="#information-sharing">Information Sharing</a>{' '}
            above — for example, Paystack for payments, Resend for email, and Cloudinary for images. Each of these
            providers has its own terms and privacy policy, and we rely on them to handle your information securely and
            only for the purposes we ask them to.
          </p>
          <p>
            Our Contact page includes links to channels such as phone, email and WhatsApp. When you contact us through
            an external channel, that interaction is subject to that provider&rsquo;s own terms and privacy policy.
          </p>
        </div>
      ),
    },
    {
      id: 'policy-updates',
      heading: 'Policy Updates',
      body: (
        <div className="space-y-5 text-base leading-8 text-muted">
          <p>
            We may update this Privacy Policy from time to time to reflect changes in how we operate, the features we
            offer, or legal or technical requirements. When we make material changes, we will update the date on this
            page and, where appropriate, let you know. Please review this page from time to time.
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
            If you have questions about this Privacy Policy or about how your personal information is handled, our{' '}
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
        title={PRIVACY_POLICY_TITLE}
        description={PRIVACY_POLICY_DESCRIPTION}
        canonicalPath="/privacy-policy"
        jsonLd={getBreadcrumbSchema([
          { name: 'Home', path: '/' },
          { name: 'Privacy Policy', path: '/privacy-policy' },
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
                { label: 'Privacy Policy' },
              ]}
            />
            <div className="max-w-2xl">
              <p className="mb-3 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-orange">
                <ShieldIcon size={15} />
                Our policies
              </p>
              <h1 className="m-0 text-4xl font-bold leading-tight tracking-[-0.05em] text-green-dark sm:text-5xl">
                Privacy Policy
              </h1>
              <p className="mt-4 max-w-xl text-base leading-7 text-muted">
                How Ayanfe Food Variety collects, uses, stores and protects your personal information when you shop
                with us.
              </p>
            </div>
          </div>
        </section>

        <section className="container py-14 sm:py-18 lg:py-24" aria-labelledby="privacy-policy-heading">
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
