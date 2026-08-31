import { MailIcon, PhoneIcon } from '../../assets/icons'
import { useStoreSettings } from '../../hooks/useStoreSettings'
import { Link } from 'react-router-dom'
import { DEFAULT_LOGO_PATH } from '../../seo/config'

export function Footer() {
  const { settings } = useStoreSettings()
  const phone = settings?.businessPhone
  const email = settings?.businessEmail
  const whatsapp = settings?.whatsappNumber
  const logoUrl = settings?.logoUrl || DEFAULT_LOGO_PATH
  const whatsappHref = whatsapp ? `https://wa.me/${whatsapp.replace(/\D/g, '').replace(/^0/, '234')}` : undefined

  return (
    <footer className="bg-green-dark py-14 text-cream">
      <div className="container grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.5fr_0.7fr_0.7fr_1fr]">
        <div>
           <Link className="inline-flex items-center" to="/" aria-label="Ayanfe Food Variety home">
             <img className="h-28 w-28 rounded-2xl bg-white object-contain p-1" src={logoUrl} alt="Ayanfe Food Variety logo" />
           </Link>
          <p className="mt-5 max-w-[270px] text-sm leading-6 text-cream/60">
             {settings?.description || 'Quality foodstuff and everyday essentials, carefully sourced and brought closer to your kitchen.'}
          </p>
        </div>
        <div>
          <h3 className="mb-4 text-xs font-bold uppercase tracking-[0.16em] text-sage">Explore</h3>
          <Link className="mb-3 block text-sm text-cream/65 transition-colors hover:text-cream" to="/">Home</Link>
          <Link className="mb-3 block text-sm text-cream/65 transition-colors hover:text-cream" to="/shop">Shop</Link>
          <Link className="mb-3 block text-sm text-cream/65 transition-colors hover:text-cream" to="/about">About us</Link>
          <Link className="mb-3 block text-sm text-cream/65 transition-colors hover:text-cream" to="/contact">Contact</Link>
          <Link className="mb-3 block text-sm text-cream/65 transition-colors hover:text-cream" to="/help">Help</Link>
          <Link className="mb-3 block text-sm text-cream/65 transition-colors hover:text-cream" to="/return-refund-policy">Return &amp; Refund Policy</Link>
          <Link className="mb-3 block text-sm text-cream/65 transition-colors hover:text-cream" to="/privacy-policy">Privacy Policy</Link>
          <Link className="mb-3 block text-sm text-cream/65 transition-colors hover:text-cream" to="/track-order">Track order</Link>
        </div>
        <div>
          <h3 className="mb-4 text-xs font-bold uppercase tracking-[0.16em] text-sage">Categories</h3>
          <Link className="mb-3 block text-sm text-cream/65 transition-colors hover:text-cream" to="/shop?category=rice">Rice</Link>
          <Link className="mb-3 block text-sm text-cream/65 transition-colors hover:text-cream" to="/shop?category=beans">Beans</Link>
          <Link className="mb-3 block text-sm text-cream/65 transition-colors hover:text-cream" to="/shop?category=cooking-oils">Cooking oils</Link>
          <Link className="mb-3 block text-sm text-cream/65 transition-colors hover:text-cream" to="/shop?category=flours">Flours</Link>
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