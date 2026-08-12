import { PhoneIcon } from '../../assets/icons'
import { useStoreSettings } from '../../hooks/useStoreSettings'

export function PromoBanner() {
  const { settings } = useStoreSettings()
  const phone = settings?.callToOrderPhone

  return (
    <div className="home-promo">
      <div className="container flex items-center justify-center">
        <a className="flex items-center gap-2" href={phone ? `tel:${phone}` : undefined} aria-label={phone ? `Call to order at ${phone}` : 'Call to order'}>
          <PhoneIcon size={16} />
          <span>CALL TO ORDER{phone ? `: ${phone}` : ''}</span>
        </a>
      </div>
    </div>
  )
}