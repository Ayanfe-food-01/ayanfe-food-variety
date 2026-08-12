import { PhoneIcon, TruckIcon } from '../../assets/icons'

export function PromoBanner() {
  return (
    <div className="home-promo">
      <div className="container flex items-center justify-between gap-4">
        <span className="flex items-center gap-2">
          <TruckIcon size={17} />
          Fresh essentials, ready for your kitchen
        </span>
        <a className="hidden items-center gap-2 sm:flex" href="tel:08125595879">
          <PhoneIcon size={15} />
          Need help? Call us
        </a>
      </div>
    </div>
  )
}