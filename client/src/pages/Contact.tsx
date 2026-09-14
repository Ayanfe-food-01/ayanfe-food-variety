import { Footer } from '../components/layout/Footer'
import { Navbar } from '../components/layout/Navbar'
import { Breadcrumb } from '../components/ui/Breadcrumb'
import { ContactForm } from '../components/contact/ContactForm'
import { ContactInfoCards } from '../components/contact/ContactInfoCards'
import { ContactMap } from '../components/contact/ContactMap'
import { useStoreSettings } from '../hooks/useStoreSettings'
import { Seo } from '../seo/Seo'
import { CONTACT_DESCRIPTION, CONTACT_TITLE } from '../seo/config'

export function Contact() {
  const { settings, isLoading } = useStoreSettings()

  return (
    <>
      <Seo title={CONTACT_TITLE} description={CONTACT_DESCRIPTION} canonicalPath="/contact" />
      <Navbar />
      <main>
        <section className="border-b border-line/70 bg-sage/35">
          <div className="container py-10 sm:py-14 lg:py-16">
            <Breadcrumb className="mb-7" items={[{ label: 'Home', href: '/' }, { label: 'Contact' }]} />
            <div className="max-w-2xl">
              <p className="mb-3 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-orange">
                <span className="inline-block size-2 rounded-full bg-orange" />
                Get in touch
              </p>
              <h1 className="m-0 text-4xl font-bold leading-tight tracking-[-0.05em] text-green-dark sm:text-5xl">
                Contact us
              </h1>
              <p className="mt-4 max-w-xl text-base leading-7 text-muted">
                Have a question about our gluten-free food products, pickup, or delivery? Send us a message or reach out
                through any of the channels below.
              </p>
            </div>
          </div>
        </section>

        <section className="container py-14 sm:py-18 lg:py-24" aria-label="Contact options">
          <div className="grid gap-8 lg:grid-cols-[1fr_0.85fr] lg:gap-10">
            <ContactForm />
            <ContactInfoCards settings={settings} isLoading={isLoading} />
          </div>
        </section>

        <ContactMap settings={settings} isLoading={isLoading} />
      </main>
      <Footer />
    </>
  )
}