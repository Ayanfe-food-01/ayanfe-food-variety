import { WhatsAppIcon } from '../../assets/icons'
import { useStoreSettings } from '../../hooks/useStoreSettings'
import { whatsAppChatUrl } from '../../utils/whatsApp'

// Floating WhatsApp chat launcher shown on the storefront. Fixed at the
// bottom-right while scrolling; hidden while any higher overlay (menu, cart
// drawer, modals) is open. Uses the business WhatsApp number from store
// settings and is not rendered when that number is not configured.
export function WhatsAppFloatButton() {
  const { settings } = useStoreSettings()
  const whatsappNumber = settings?.whatsappNumber?.trim()
  if (!whatsappNumber) return null

  return (
    <a
      className="whatsapp-float-button"
      href={whatsAppChatUrl(whatsappNumber)}
      target="_blank"
      rel="noreferrer"
      aria-label="Chat with us on WhatsApp"
    >
      <WhatsAppIcon size={26} />
    </a>
  )
}