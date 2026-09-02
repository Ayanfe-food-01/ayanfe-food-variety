import { CheckIcon, HeartIcon, ShieldIcon, TruckIcon } from '../../assets/icons'
import { RevealOnScroll } from '../ui/RevealOnScroll'

const benefits = [
  { icon: <ShieldIcon />, title: 'Quality you can trust', description: 'Every item is carefully sourced and quality-checked so you can order with confidence.' },
  { icon: <HeartIcon />, title: 'Honest, fair prices', description: 'Good food shouldn’t cost a fortune. We keep our prices fair and our value high.' },
  { icon: <TruckIcon />, title: 'Fast, reliable delivery', description: 'Order online and get your kitchen essentials delivered across Nigeria.' },
  { icon: <CheckIcon />, title: 'Helpful customer service', description: 'Questions? Our friendly team is on hand to help you every step of the way.' },
]

export function WhyChooseUs() {
  return (
    <RevealOnScroll>
      <section className="bg-cream py-20 lg:py-24" id="why-us">
        <div className="mx-auto w-[calc(100%-32px)] max-w-[1160px] md:w-[calc(100%-48px)]">
          <div className="mb-12 max-w-[600px]">
            <div className="mb-5 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-orange"><span className="inline-block size-2 rounded-full bg-orange" /> Why choose us</div>
            <h2 className="m-0 text-4xl font-bold leading-tight tracking-[-0.04em] text-green-dark sm:text-5xl">Why shoppers choose <em className="font-display font-medium not-italic text-orange">Ayanfe.</em></h2>
            <p className="mt-5 max-w-[490px] text-base leading-7 text-muted">From quality-checked essentials to friendly support, we make every order straightforward and dependable.</p>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {benefits.map((benefit) => (
              <div className="rounded-2xl border border-line bg-white p-6" key={benefit.title}>
                <div className="mb-5 text-green">{benefit.icon}</div>
                <h3 className="m-0 text-base font-bold text-green-dark">{benefit.title}</h3>
                <p className="mt-3 text-sm leading-6 text-muted">{benefit.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </RevealOnScroll>
  )
}