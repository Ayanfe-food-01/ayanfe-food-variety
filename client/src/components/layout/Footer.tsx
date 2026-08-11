import { MailIcon, PhoneIcon } from '../../assets/icons'

export function Footer() {
  return (
    <footer className="bg-green-dark py-14 text-cream">
      <div className="container grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.5fr_0.7fr_0.7fr_1fr]">
        <div>
          <a className="inline-flex items-center gap-3" href="#home">
            <span className="grid size-10 place-items-center rounded-full bg-orange font-display text-lg font-bold text-cream">A</span>
            <span className="text-[13px] tracking-[0.01em]">
              Ayanfe <strong className="block text-sm font-bold">Food Variety</strong>
            </span>
          </a>
          <p className="mt-5 max-w-[270px] text-sm leading-6 text-cream/60">
            Quality foodstuff and everyday essentials, carefully sourced and brought
            closer to your kitchen.
          </p>
        </div>
        <div>
          <h3 className="mb-4 text-xs font-bold uppercase tracking-[0.16em] text-sage">Explore</h3>
          <a className="mb-3 block text-sm text-cream/65 transition-colors hover:text-cream" href="#home">Home</a>
          <a className="mb-3 block text-sm text-cream/65 transition-colors hover:text-cream" href="#products">Shop</a>
          <a className="mb-3 block text-sm text-cream/65 transition-colors hover:text-cream" href="#why-us">About us</a>
          <a className="mb-3 block text-sm text-cream/65 transition-colors hover:text-cream" href="#contact">Contact</a>
        </div>
        <div>
          <h3 className="mb-4 text-xs font-bold uppercase tracking-[0.16em] text-sage">Categories</h3>
          <a className="mb-3 block text-sm text-cream/65 transition-colors hover:text-cream" href="#categories">Rice</a>
          <a className="mb-3 block text-sm text-cream/65 transition-colors hover:text-cream" href="#categories">Beans</a>
          <a className="mb-3 block text-sm text-cream/65 transition-colors hover:text-cream" href="#categories">Oil</a>
          <a className="mb-3 block text-sm text-cream/65 transition-colors hover:text-cream" href="#categories">Yam &amp; Spices</a>
        </div>
        <div>
          <h3 className="mb-4 text-xs font-bold uppercase tracking-[0.16em] text-sage">Get in touch</h3>
          <a className="mb-3 inline-flex items-center gap-2 text-sm text-cream/65 transition-colors hover:text-cream" href="tel:08125595879">
            <span className="text-sage"><PhoneIcon size={16} /></span> 08125595879
          </a>
          <a className="mb-3 inline-flex items-center gap-2 text-sm text-cream/65 transition-colors hover:text-cream" href="mailto:Ayanfefoodvariety@gmail.com">
            <span className="text-sage"><MailIcon size={16} /></span> Ayanfefoodvariety@gmail.com
          </a>
          <a className="mt-2 block font-bold text-orange transition-colors hover:text-cream" href="https://wa.me/2348125595879" target="_blank" rel="noreferrer">
            Chat on WhatsApp
          </a>
        </div>
      </div>
      <div className="container mt-12 flex flex-wrap justify-between gap-3 border-t border-cream/15 pt-6 text-xs text-cream/45">
        <span>© 2026 Ayanfe Food Variety Limited</span>
        <span>Good food starts here.</span>
      </div>
    </footer>
  )
}