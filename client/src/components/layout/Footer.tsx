import { MailIcon, PhoneIcon } from '../../assets/icons'
import { useStoreSettings } from '../../hooks/useStoreSettings'

export function Footer() {
  const { settings } = useStoreSettings()
  const phone = settings?.businessPhone
  const email = settings?.businessEmail
  const whatsapp = settings?.whatsappNumber
  const whatsappHref = whatsapp ? `https://wa.me/${whatsapp.replace(/\D/g, '').replace(/^0/, '234')}` : undefined

  return (
    <footer className="bg-green-dark py-14 text-cream">
      <div className="container grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.5fr_0.7fr_0.7fr_1fr]">
        <div>
          <a className="inline-flex items-center" href="#home" aria-label="Ayanfe Food Variety home">
            <img className="h-28 w-28 rounded-2xl bg-white object-contain p-1" src="/branding/ayanfe-food-variety-logo.png" alt="Ayanfe Food Variety logo" />
          </a>
          <p className="mt-5 max-w-[270px] text-sm leading-6 text-cream/60">
             {settings?.description || 'Quality foodstuff and everyday essentials, carefully sourced and brought closer to your kitchen.'}
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
          {phone && <a className="mb-3 flex w-fit items-center gap-2 text-sm text-cream/65 transition-colors hover:text-cream" href={`tel:${phone}`}>
            <span className="text-sage"><PhoneIcon size={16} /></span> {phone}
          </a>}
          {email && <a className="mb-3 flex w-fit items-center gap-2 text-sm text-cream/65 transition-colors hover:text-cream" href={`mailto:${email}`}>
            <span className="text-sage"><MailIcon size={16} /></span> {email}
          </a>}
          {whatsappHref && <a className="mt-2 block font-bold text-orange transition-colors hover:text-cream" href={whatsappHref} target="_blank" rel="noreferrer">
            Chat on WhatsApp
          </a>}
        </div>
      </div>
      <div className="container mt-12 flex flex-wrap justify-between gap-3 border-t border-cream/15 pt-6 text-xs text-cream/45">
        <span>© {new Date().getFullYear()}</span>
        <span>Good food starts here.</span>
      </div>
    </footer>
  )
}