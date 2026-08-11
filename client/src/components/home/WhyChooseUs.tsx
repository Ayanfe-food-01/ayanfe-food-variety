import { CheckIcon, HeartIcon, ShieldIcon, TruckIcon } from '../../assets/icons'
import { RevealOnScroll } from '../ui/RevealOnScroll'

const benefits = [
  { icon: <ShieldIcon />, title: 'Quality you can trust', description: 'We select and handle every product with care, so you can shop with confidence.' },
  { icon: <HeartIcon />, title: 'Prices that feel fair', description: 'Good food should be accessible. We keep our prices honest and our value high.' },
  { icon: <TruckIcon />, title: 'Easy, convenient shopping', description: 'Get your kitchen essentials without the market run. Simple ordering, made easier.' },
  { icon: <CheckIcon />, title: 'Service with care', description: 'Have a question? Our friendly team is always happy to point you in the right direction.' },
]

export function WhyChooseUs() {
  return (
    <RevealOnScroll>
      <section className="bg-green py-20 text-cream lg:py-24" id="why-us">
      <div className="mx-auto w-[calc(100%-32px)] max-w-[1160px] md:w-[calc(100%-48px)]">
        <div className="mb-12 max-w-[600px]">
          <div className="mb-5 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-sage"><span className="inline-block size-2 rounded-full bg-sage" /> The Ayanfe difference</div>
          <h2 className="m-0 text-4xl font-bold leading-tight tracking-[-0.04em] sm:text-5xl">Food shopping should feel <em className="font-display font-medium not-italic text-orange">easy.</em></h2>
          <p className="mt-5 max-w-[490px] text-base leading-7 text-cream/70">We’re here to make stocking your kitchen a little simpler, one quality product at a time.</p>
        </div>
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {benefits.map((benefit) => (
            <div className="border-t border-cream/20 pt-5" key={benefit.title}>
              <div className="mb-5 text-sage">{benefit.icon}</div>
              <h3 className="m-0 text-base font-bold">{benefit.title}</h3>
              <p className="mt-3 text-sm leading-6 text-cream/65">{benefit.description}</p>
            </div>
          ))}
        </div>
      </div>
      </section>
    </RevealOnScroll>
  )
}