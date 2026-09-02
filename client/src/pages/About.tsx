import { ArrowRight, CheckIcon, HeartIcon, ShieldIcon, TruckIcon } from '../assets/icons'
import { Footer } from '../components/layout/Footer'
import { Navbar } from '../components/layout/Navbar'
import { Breadcrumb } from '../components/ui/Breadcrumb'
import { Seo } from '../seo/Seo'
import { ABOUT_DESCRIPTION, ABOUT_TITLE, getOrganizationSchema } from '../seo/config'
import { Link } from 'react-router-dom'

const values = [
  {
    icon: ShieldIcon,
    title: 'Quality you can trust',
    text: 'We carefully source and check every product so what you order is what you can count on.',
  },
  {
    icon: HeartIcon,
    title: 'Honest pricing',
    text: 'Good food should be accessible. We keep our prices fair and our value clear.',
  },
  {
    icon: TruckIcon,
    title: 'Convenient delivery',
    text: 'Order online and get your essentials delivered, so shopping fits around your day.',
  },
  {
    icon: CheckIcon,
    title: 'Friendly service',
    text: 'Real people, real help. We’re here whenever you have a question.',
  },
]

const promises = [
  {
    icon: ShieldIcon,
    title: 'Gluten-free options, clearly labelled',
    text: 'We highlight gluten-free foodstuff so you can choose with confidence for everyday meals.',
  },
  {
    icon: CheckIcon,
    title: 'Simple, dependable choices',
    text: 'Our range of kitchen staples and pantry essentials is presented clearly, so picking what fits your kitchen is easy.',
  },
  {
    icon: HeartIcon,
    title: 'Built around everyday kitchens',
    text: 'We work for households that want familiar, quality ingredients for family meals and daily cooking.',
  },
  {
    icon: TruckIcon,
    title: 'Reliable online delivery',
    text: 'Order online and our team brings your essentials closer to home with convenient delivery.',
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
                About Ayanfe
              </p>
              <h1 className="m-0 text-4xl font-bold leading-[0.98] tracking-[-0.05em] text-green-dark sm:text-5xl">
                Quality gluten-free foodstuff, delivered with care.
              </h1>
              <p className="mt-6 max-w-2xl text-base leading-7 text-muted sm:text-lg">
                Ayanfe Food Variety is an online store for carefully selected gluten-free foodstuff and pantry essentials — chosen for quality, and delivered to your door.
              </p>
            </div>
          </div>
        </section>

        <section className="container py-14 sm:py-18 lg:py-24" aria-labelledby="story-heading">
          <div className="mx-auto max-w-3xl">
            <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.18em] text-orange">Our story</p>
            <h2 id="story-heading" className="m-0 text-3xl font-bold leading-tight tracking-[-0.04em] text-green-dark sm:text-4xl">
              A team that cares about your kitchen.
            </h2>
            <div className="mt-8 space-y-5 text-base leading-8 text-muted">
              <p>
                Ayanfe was born from a simple belief: everybody deserves easy access to good, dependable food. We started by gathering the gluten-free foodstuff and pantry essentials families rely on, and making them simple to order online.
              </p>
              <p>
                Today, our team personally selects, checks and packs what we sell — so the quality you expect is the quality you receive. Every order is handled with care and delivered so your kitchen is never waiting long.
              </p>
              <div className="flex flex-wrap gap-4 pt-2">
                <Link className="inline-flex items-center gap-2 rounded-full bg-green px-6 py-3 text-sm font-bold text-cream transition-colors hover:bg-green-dark" to="/shop">
                  Shop our products <ArrowRight size={16} />
                </Link>
                <Link className="inline-flex items-center gap-2 rounded-full border border-line bg-white px-6 py-3 text-sm font-bold text-green transition-colors hover:border-green/40" to="/contact">
                  Get in touch
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section className="border-y border-line bg-cream py-14 sm:py-18 lg:py-24" aria-labelledby="mission-heading">
          <div className="container">
            <div className="mx-auto max-w-2xl text-center">
              <p className="mb-3 flex items-center justify-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-orange">
                <span className="inline-block size-2 rounded-full bg-orange" /> Our mission &amp; values
              </p>
              <h2 id="mission-heading" className="m-0 text-3xl font-bold tracking-[-0.04em] text-green-dark sm:text-4xl">
                Simple, trustworthy food shopping.
              </h2>
              <p className="mt-5 text-base leading-7 text-muted">
                Our mission is to make quality gluten-free foodstuff easy to find, easy to trust and easy to get.
              </p>
            </div>
            <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {values.map(({ icon: Icon, title, text }) => (
                <article className="rounded-2xl border border-line bg-white p-6" key={title}>
                  <Icon className="text-green" size={22} />
                  <h3 className="mt-5 text-base font-bold text-green-dark">{title}</h3>
                  <p className="mt-3 text-sm leading-6 text-muted">{text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-sage/30 py-14 sm:py-18 lg:py-24" aria-labelledby="promise-heading">
          <div className="container">
            <div className="max-w-2xl">
              <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.18em] text-orange">Our promise</p>
              <h2 id="promise-heading" className="m-0 text-3xl font-bold tracking-[-0.04em] text-green-dark sm:text-4xl">
                What you can expect from us.
              </h2>
            </div>
            <div className="mt-10 grid gap-5 sm:grid-cols-2">
              {promises.map(({ icon: Icon, title, text }) => (
                <article className="rounded-2xl border border-line bg-white p-7 sm:p-8" key={title}>
                  <Icon className="text-orange" size={22} />
                  <h3 className="mt-5 text-xl font-bold text-green-dark">{title}</h3>
                  <p className="mt-3 text-sm leading-7 text-muted">{text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="container py-14 sm:py-18 lg:py-24" aria-labelledby="cta-heading">
          <div className="mx-auto max-w-3xl rounded-3xl bg-green-dark px-6 py-14 text-center sm:px-10">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-orange">Let’s shop</p>
            <h2 id="cta-heading" className="m-0 mt-4 text-3xl font-bold leading-tight tracking-[-0.04em] text-cream sm:text-4xl">
              Ready to fill your kitchen with good food?
            </h2>
            <p className="mx-auto mt-5 max-w-[460px] text-base leading-7 text-cream/70">
              Browse our range and have quality gluten-free foodstuff delivered to your door.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-4">
              <Link className="inline-flex items-center gap-2 rounded-full bg-orange px-7 py-3.5 text-sm font-bold text-white transition-all duration-200 hover:-translate-y-0.5 hover:brightness-105" to="/shop">
                Shop our products <ArrowRight size={16} />
              </Link>
              <Link className="inline-flex items-center gap-2 rounded-full border border-cream/30 px-7 py-3.5 text-sm font-bold text-cream transition-colors hover:border-cream/60 hover:bg-cream/10" to="/contact">
                Get in touch
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}