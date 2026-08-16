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
    title: 'Gluten-free by focus',
    text: 'Our collection is focused on gluten-free foodstuff, helping you shop with greater confidence for everyday meals.',
  },
  {
    icon: CheckIcon,
    title: 'Simple, dependable choices',
    text: 'We present practical gluten-free staples and pantry essentials clearly, so choosing what belongs in your kitchen feels easy.',
  },
  {
    icon: HeartIcon,
    title: 'Made for everyday kitchens',
    text: 'Ayanfe Food Variety helps households find gluten-free ingredients for familiar meals, family recipes and daily cooking.',
  },
  {
    icon: TruckIcon,
    title: 'Reliable online delivery',
    text: 'Order your gluten-free foodstuff online and let our team bring your essentials closer to home with convenient delivery.',
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
              <h1 className="m-0 text-4xl font-bold leading-[0.98] tracking-[-0.05em] text-green-dark sm:text-5xl">
                Quality gluten-free foodstuff for every kitchen.
              </h1>
              <p className="mt-6 max-w-2xl text-base leading-7 text-muted sm:text-lg">
                Ayanfe Food Variety Limited offers carefully selected gluten-free foodstuff for households that want simple, dependable ingredients for everyday meals.
              </p>
            </div>
          </div>
        </section>

        <section className="container py-14 sm:py-18 lg:py-24" aria-labelledby="about-story-heading">
          <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
            <div>
              <p className="mb-3 text-xs font-bold uppercase tracking-[0.16em] text-orange">Our purpose</p>
              <h2 id="about-story-heading" className="m-0 max-w-md text-3xl font-bold leading-tight tracking-[-0.04em] text-green-dark sm:text-4xl">
                Gluten-free food for everyday cooking.
              </h2>
            </div>
            <div className="space-y-5 text-base leading-8 text-muted">
              <p>
                We believe finding gluten-free foodstuff for your kitchen should feel simple and dependable. That is why we bring carefully selected gluten-free staples and pantry essentials together in one easy-to-use online shop.
              </p>
              <p>
                From gluten-free flours and grains to cooking oils and other everyday pantry choices, our range is selected to support real family meals. We pair that focus with clear product information, friendly service and reliable delivery.
              </p>
              <Link className="inline-flex items-center gap-2 font-bold text-green transition-all hover:gap-3" to="/shop">
                Shop our Nigerian foodstuff <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        </section>

        <section className="mb-12 bg-green-dark py-14 text-cream sm:mb-16 sm:py-18 lg:mb-20 lg:py-24" aria-labelledby="commitments-heading">
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