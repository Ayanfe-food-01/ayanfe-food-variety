import { ArrowRight, CheckIcon, HeartIcon, ShieldIcon, TruckIcon } from '../assets/icons'
import { Footer } from '../components/layout/Footer'
import { Navbar } from '../components/layout/Navbar'
import { Breadcrumb } from '../components/ui/Breadcrumb'
import { Seo } from '../seo/Seo'
import { ABOUT_DESCRIPTION, ABOUT_TITLE, getOrganizationSchema } from '../seo/config'
import { Link } from 'react-router-dom'

const commitments = [
  {
    icon: ShieldIcon,
    title: 'Natural and carefully selected',
    text: 'We source foodstuff with everyday Nigerian cooking in mind, from pantry staples to nourishing family favourites.',
  },
  {
    icon: CheckIcon,
    title: 'Preservative-free options',
    text: 'Our collection makes it easier to find wholesome, clearly presented ingredients for the meals you already love.',
  },
  {
    icon: HeartIcon,
    title: 'Made for your kitchen',
    text: 'Ayanfe Food Variety helps households shop confidently for gluten-free staples, grains, oils and more.',
  },
  {
    icon: TruckIcon,
    title: 'Reliable online delivery',
    text: 'Order Nigerian foodstuff online and let our team bring your essentials closer to home, wherever you are in Nigeria.',
  },
]

export function About() {
  return (
    <>
      <Seo
        title={ABOUT_TITLE}
        description={ABOUT_DESCRIPTION}
        canonicalPath="/about"
        jsonLd={getOrganizationSchema()}
      />
      <Navbar />
      <main>
        <section className="border-b border-line/70 bg-sage/35">
          <div className="container py-14 sm:py-20 lg:py-24">
            <Breadcrumb className="mb-8" items={[{ label: 'Home', href: '/' }, { label: 'About us' }]} />
            <div className="max-w-3xl">
              <p className="mb-3 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-orange">
                <span className="inline-block size-2 rounded-full bg-orange" />
                Why Ayanfe
              </p>
              <h1 className="m-0 text-5xl font-bold leading-[0.98] tracking-[-0.05em] text-green-dark sm:text-6xl">
                Natural, gluten-free Nigerian foodstuff online.
              </h1>
              <p className="mt-6 max-w-2xl text-base leading-7 text-muted sm:text-lg">
                Ayanfe Food Variety Limited is a Nigerian food processing and foodstuff delivery brand making natural, preservative-free staples easier to find and order online.
              </p>
            </div>
          </div>
        </section>

        <section className="container py-14 sm:py-18 lg:py-24" aria-labelledby="about-story-heading">
          <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
            <div>
              <p className="mb-3 text-xs font-bold uppercase tracking-[0.16em] text-orange">Our purpose</p>
              <h2 id="about-story-heading" className="m-0 max-w-md text-3xl font-bold leading-tight tracking-[-0.04em] text-green-dark sm:text-4xl">
                Good food starts with ingredients you can trust.
              </h2>
            </div>
            <div className="space-y-5 text-base leading-8 text-muted">
              <p>
                We believe stocking your kitchen should feel simple, dependable and close to home. That is why we bring together quality Nigerian foodstuff, pantry essentials and everyday groceries in one easy-to-use online shop.
              </p>
              <p>
                From gluten-free swallow flours and grains to cooking oils and wellness-friendly choices, our growing range is selected to support real family meals. We pair that care with clear product information, friendly service and reliable delivery.
              </p>
              <Link className="inline-flex items-center gap-2 font-bold text-green transition-all hover:gap-3" to="/shop">
                Shop our Nigerian foodstuff <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        </section>

        <section className="bg-green-dark py-14 text-cream sm:py-18 lg:py-24" aria-labelledby="commitments-heading">
          <div className="container">
            <div className="max-w-2xl">
              <p className="mb-3 text-xs font-bold uppercase tracking-[0.16em] text-orange">What we stand for</p>
              <h2 id="commitments-heading" className="m-0 text-3xl font-bold tracking-[-0.04em] sm:text-4xl">
                Better choices for everyday cooking.
              </h2>
            </div>
            <div className="mt-10 grid gap-px overflow-hidden rounded-2xl border border-cream/10 bg-cream/10 sm:grid-cols-2">
              {commitments.map(({ icon: Icon, title, text }) => (
                <article className="bg-green-dark p-7 sm:p-8" key={title}>
                  <Icon className="text-orange" size={22} />
                  <h3 className="mt-5 text-xl font-bold">{title}</h3>
                  <p className="mt-3 text-sm leading-7 text-cream/65">{text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}