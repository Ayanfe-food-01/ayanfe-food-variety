import { ArrowRight, ArrowUpRight } from '../../assets/icons'

export function Hero() {
  return (
    <section className="overflow-hidden pb-20 pt-16 lg:py-28" id="home">
      <div className="mx-auto grid w-[calc(100%-32px)] max-w-[1160px] items-center gap-12 md:w-[calc(100%-48px)] lg:grid-cols-[0.9fr_1.1fr] lg:gap-14">
        <div className="relative z-10 home-fade-up">
          <div className="mb-5 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-orange"><span className="inline-block size-2 rounded-full bg-orange" /> Your trusted foodstuff market</div>
          <h1 className="m-0 max-w-[650px] text-[clamp(3rem,14vw,4.5rem)] font-bold leading-[0.98] tracking-[-0.045em] text-green-dark sm:text-6xl lg:text-[76px]">Quality foodstuff, <em className="font-display font-medium not-italic text-orange">delivered</em> to your door.</h1>
          <p className="mt-7 max-w-[530px] text-base leading-7 text-muted sm:text-lg">
            From farm-fresh staples to the ingredients that bring every meal to life,
            shop quality foodstuff at prices that make sense.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-3">
            <a className="inline-flex items-center justify-center gap-2 rounded-full bg-green px-6 py-3.5 text-sm font-bold text-cream shadow-lg shadow-green/15 transition-all duration-200 hover:-translate-y-0.5 hover:bg-green-dark" href="#products">
              Shop now <ArrowUpRight size={18} />
            </a>
            <a className="inline-flex items-center justify-center gap-2 rounded-full px-6 py-3.5 text-sm font-bold text-green transition-all duration-200 hover:gap-3" href="https://wa.me/2348125595879" target="_blank" rel="noreferrer">
              Talk to us <ArrowRight size={17} />
            </a>
          </div>
          <div className="mt-9 flex max-w-[360px] items-center gap-3 text-xs leading-5 text-muted">
            <span className="flex shrink-0" aria-hidden="true"><i className="grid size-8 place-items-center rounded-full border-2 border-cream bg-sage text-[9px] font-bold not-italic text-green">AF</i><i className="-ml-2 grid size-8 place-items-center rounded-full border-2 border-cream bg-orange text-[9px] font-bold not-italic text-cream">+</i></span>
            <span>Trusted by families who care about what’s on their table.</span>
          </div>
        </div>
        <div className="relative home-fade-up home-fade-up-delay-2">
          <div className="relative aspect-[1.08] overflow-hidden rounded-[32px] shadow-2xl shadow-green/15 after:absolute after:inset-0 after:bg-gradient-to-tr after:from-green/20 after:to-transparent after:content-['']">
            <img
              className="size-full object-cover"
              src="https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1200&q=90"
              alt="Fresh vegetables and produce arranged in a market basket"
              width={1200}
              height={900}
              fetchPriority="high"
            />
          </div>
          <div className="absolute left-3 top-3 flex items-center gap-3 rounded-2xl bg-cream px-4 py-3 shadow-xl shadow-ink/10 md:-left-6 md:top-10">
            <span className="grid size-9 place-items-center rounded-full bg-orange text-lg text-cream">✦</span>
            <span><strong className="block text-sm text-green-dark">Fresh picks</strong><small className="mt-0.5 block text-[11px] text-muted">for every kitchen</small></span>
          </div>
          <div className="absolute -bottom-6 right-2 rotate-[-7deg] rounded-2xl bg-orange px-5 py-4 text-center font-display text-base leading-tight text-cream shadow-xl shadow-orange/20 md:-right-5">Good food<br /><strong className="text-xl">starts here.</strong></div>
        </div>
      </div>
    </section>
  )
}