import { ArrowUpRight, MailIcon, PhoneIcon, TruckIcon } from '../assets/icons'
import { Footer } from '../components/layout/Footer'
import { Navbar } from '../components/layout/Navbar'
import { BreadcrumbBar } from '../components/ui/Breadcrumb'
import { useStoreSettings } from '../hooks/useStoreSettings'
import { Seo } from '../seo/Seo'
import { CONTACT_DESCRIPTION, CONTACT_TITLE } from '../seo/config'

const displayValue = (value: string | undefined, fallback: string) => value?.trim() || fallback

export function Contact() {
  const { settings, isLoading } = useStoreSettings()
  const businessName = settings?.businessName || 'Ayanfe Food Variety'
  const phone = settings?.businessPhone?.trim()
  const email = settings?.businessEmail?.trim()
  const whatsapp = settings?.whatsappNumber?.trim()
  const whatsappHref = whatsapp ? `https://wa.me/${whatsapp.replace(/\D/g, '').replace(/^0/, '234')}` : undefined
  const mapEmbedUrl = settings?.mapEmbedUrl?.trim()

  return (
    <>
      <Seo title={CONTACT_TITLE} description={CONTACT_DESCRIPTION} canonicalPath="/contact" />
      <Navbar />
      <BreadcrumbBar items={[{ label: 'Home', href: '/' }, { label: 'Contact' }]} />
      <main>
        <section className="border-b border-line/70 bg-sage/35">
          <div className="container py-10 sm:py-14 lg:py-16">
            <div className="max-w-2xl">
              <p className="mb-3 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-orange">
                <span className="inline-block size-2 rounded-full bg-orange" />
                Get in touch
              </p>
              <h1 className="m-0 text-4xl font-bold leading-tight tracking-[-0.05em] text-green-dark sm:text-5xl">
                Contact {businessName}
              </h1>
              <p className="mt-4 max-w-xl text-base leading-7 text-muted">
                Have a question about our gluten-free foodstuff, pickup, or delivery? Reach out and our team will help.
              </p>
            </div>
          </div>
        </section>

        <section className="container py-14 sm:py-18 lg:py-24" aria-labelledby="contact-details-heading">
          <div className="grid gap-8 lg:grid-cols-[0.85fr_1.15fr] lg:gap-16">
            <div>
              <p className="mb-3 text-xs font-bold uppercase tracking-[0.16em] text-orange">Contact details</p>
              <h2 id="contact-details-heading" className="m-0 max-w-md text-3xl font-bold leading-tight tracking-[-0.04em] text-green-dark sm:text-4xl">
                We’re here to make ordering easier.
              </h2>
              <div className="mt-8 divide-y divide-line rounded-2xl border border-line bg-white">
                <div className="p-5">
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted">Business</p>
                  <p className="mt-2 font-bold text-green-dark">{businessName}</p>
                </div>
                <div className="grid gap-5 p-5 sm:grid-cols-2 lg:grid-cols-1">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted">Phone</p>
                    {phone ? (
                      <a className="mt-2 inline-flex items-center gap-2 font-bold text-green transition-colors hover:text-orange" href={`tel:${phone}`}>
                        <PhoneIcon size={17} /> {phone}
                      </a>
                    ) : <p className="mt-2 text-sm text-muted">{isLoading ? 'Loading…' : 'Not provided yet.'}</p>}
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted">Email</p>
                    {email ? (
                      <a className="mt-2 inline-flex items-center gap-2 break-all font-bold text-green transition-colors hover:text-orange" href={`mailto:${email}`}>
                        <MailIcon size={17} /> {email}
                      </a>
                    ) : <p className="mt-2 text-sm text-muted">{isLoading ? 'Loading…' : 'Not provided yet.'}</p>}
                  </div>
                </div>
                <div className="grid gap-5 p-5 sm:grid-cols-2 lg:grid-cols-1">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted">Business / pickup address</p>
                    <p className="mt-2 whitespace-pre-line text-sm leading-6 text-green-dark">
                      {displayValue(settings?.address, isLoading ? 'Loading…' : 'Address not published yet.')}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted">Opening hours</p>
                    <p className="mt-2 whitespace-pre-line text-sm leading-6 text-green-dark">
                      {displayValue(settings?.openingHours, isLoading ? 'Loading…' : 'Opening hours not published yet.')}
                    </p>
                  </div>
                </div>
              </div>
              {whatsappHref && (
                <a className="mt-5 inline-flex items-center gap-2 font-bold text-green transition-colors hover:text-orange" href={whatsappHref} target="_blank" rel="noreferrer">
                  Chat with us on WhatsApp <ArrowUpRight size={16} />
                </a>
              )}
            </div>

            <div>
              <div className="overflow-hidden rounded-3xl border border-line bg-sage/30">
                {mapEmbedUrl ? (
                  <iframe
                    className="aspect-[4/3] min-h-[320px] w-full border-0 sm:min-h-[400px]"
                    src={mapEmbedUrl}
                    title={`${businessName} pickup location map`}
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    allowFullScreen
                  />
                ) : (
                  <div className="flex min-h-[320px] items-center justify-center p-8 text-center sm:min-h-[400px]">
                    <div className="max-w-sm">
                      <p className="text-xs font-bold uppercase tracking-[0.16em] text-orange">Pickup location</p>
                      <p className="mt-3 text-sm leading-6 text-muted">
                        The store map will appear here once the admin adds a Google Maps embed URL in Store Settings.
                      </p>
                    </div>
                  </div>
                )}
              </div>
              <p className="mt-3 text-xs leading-5 text-muted">
                The map shows the pickup location configured by the store. Please confirm the address before visiting.
              </p>
            </div>
          </div>
        </section>

        <section className="mb-8 bg-green-dark py-14 text-cream sm:mb-10 sm:py-18 lg:py-24" aria-labelledby="contact-options-heading">
          <div className="container">
            <div className="max-w-2xl">
              <p className="mb-3 text-xs font-bold uppercase tracking-[0.16em] text-orange">Pickup & delivery</p>
              <h2 id="contact-options-heading" className="m-0 text-3xl font-bold tracking-[-0.04em] sm:text-4xl">
                Choose what works best for you.
              </h2>
            </div>
            <div className="mt-10 grid gap-px overflow-hidden rounded-2xl border border-cream/10 bg-cream/10 md:grid-cols-2">
              <article className="bg-green-dark p-7 sm:p-8">
                <TruckIcon className="text-orange" size={22} />
                <h3 className="mt-5 text-xl font-bold">Pickup</h3>
                <p className="mt-3 whitespace-pre-line text-sm leading-7 text-cream/65">
                  {displayValue(settings?.pickupInformation, isLoading ? 'Loading…' : 'Pickup information will be updated by the store.')}
                </p>
              </article>
              <article className="bg-green-dark p-7 sm:p-8">
                <ArrowUpRight className="text-orange" size={22} />
                <h3 className="mt-5 text-xl font-bold">Delivery</h3>
                <p className="mt-3 whitespace-pre-line text-sm leading-7 text-cream/65">
                  {displayValue(settings?.deliveryInformation, isLoading ? 'Loading…' : 'Choose delivery during checkout. Delivery details are confirmed when you place your order.')}
                </p>
              </article>
            </div>
            {(phone || email) && (
              <p className="mt-8 max-w-xl text-sm leading-7 text-cream/65">
                Need help before ordering? {phone && <><a className="font-bold text-cream hover:text-orange" href={`tel:${phone}`}>Call us</a>{email && ' or '}</>}{email && <a className="font-bold text-cream hover:text-orange" href={`mailto:${email}`}>email us</a>}.
              </p>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}