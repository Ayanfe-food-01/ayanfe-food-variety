import { ArrowUpRight } from '../../assets/icons'
import { RevealOnScroll } from '../ui/RevealOnScroll'

export function PromotionalCTA() {
  return (
    <RevealOnScroll>
      <section className="bg-sage py-16 lg:py-20">
      <div className="relative mx-auto grid w-[calc(100%-32px)] max-w-[1160px] items-center gap-10 overflow-hidden rounded-[28px] bg-cream px-6 py-8 sm:w-[calc(100%-48px)] sm:p-12 lg:grid-cols-[0.85fr_1.15fr] lg:p-16">
        <div className="relative z-10">
          <div className="mb-5 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-orange"><span className="inline-block size-2 rounded-full bg-orange" /> Your pantry called</div>
          <h2 className="m-0 text-4xl font-bold leading-tight tracking-[-0.04em] text-green-dark sm:text-5xl">Stock up on your everyday essentials.</h2>
          <p className="mt-5 max-w-[430px] text-base leading-7 text-muted">From the basics you use every day to the ingredients you love, find it all in one place.</p>
          <a className="mt-7 inline-flex items-center justify-center gap-2 rounded-full bg-green px-6 py-3.5 text-sm font-bold text-cream shadow-lg shadow-green/15 transition-all duration-200 hover:-translate-y-0.5 hover:bg-green-dark" href="#products">Shop now <ArrowUpRight size={18} /></a>
        </div>
        <div className="relative h-[220px] sm:h-[300px]" aria-hidden="true">
          <div className="absolute -right-8 -top-10 size-52 rounded-full bg-orange/20" />
          <div className="absolute -bottom-12 left-4 size-36 rounded-full bg-sage" />
          <img className="relative z-10 ml-auto size-full max-w-[390px] rounded-[24px] object-cover shadow-2xl shadow-green/15" src="https://images.unsplash.com/photo-1606787366850-de6330128bfc?auto=format&fit=crop&w=800&q=90" alt="Fresh ingredients prepared for a home-cooked meal" width={800} height={600} loading="lazy" />
        </div>
      </div>
      </section>
    </RevealOnScroll>
  )
}